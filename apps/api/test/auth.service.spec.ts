import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../src/auth/auth.service';
import { MailService } from '../src/auth/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

const baseUser = { id: 'user-1', email: 'client@example.com', passwordHash: '', displayName: 'Client', locale: 'fr', countryCode: 'FR', role: 'CUSTOMER', status: 'PENDING', emailVerifiedAt: null, createdAt: new Date(), updatedAt: new Date() } as const;

function service(overrides: { findUser?: unknown } = {}) {
  const prisma = {
    user: { findUnique: vi.fn().mockResolvedValue(overrides.findUser ?? null), create: vi.fn().mockImplementation(({ data }) => ({ ...baseUser, ...data })) },
    verificationToken: { create: vi.fn() }, refreshToken: { create: vi.fn() },
  };
  const jwt = { signAsync: vi.fn().mockResolvedValue('access-token') };
  const config = { getOrThrow: vi.fn((key: string) => key === 'TOKEN_PEPPER' ? 'p'.repeat(32) : 'j'.repeat(32)), get: vi.fn((key: string, fallback: unknown) => key === 'NODE_ENV' ? 'test' : fallback) };
  return { auth: new AuthService(prisma as unknown as PrismaService, jwt as unknown as JwtService, config as unknown as ConfigService, { assertAvailable: vi.fn(), send: vi.fn().mockResolvedValue(undefined) } as unknown as MailService), prisma };
}

describe('AuthService', () => {
  it('normalizes email and hashes the password during registration', async () => {
    const { auth, prisma } = service();
    const result = await auth.register({ email: ' Client@Example.COM ', password: 'a-strong-password', displayName: ' Client ', locale: 'fr', countryCode: 'FR' });
    const data = prisma.user.create.mock.calls[0][0].data;
    expect(data.email).toBe('client@example.com');
    expect(data.displayName).toBe('Client');
    expect(data.passwordHash).not.toContain('a-strong-password');
    expect(await compare('a-strong-password', data.passwordHash)).toBe(true);
    expect(result.verificationToken).toHaveLength(43);
  }, 60_000); // Real bcrypt cost 12 hashing + verification can exceed 5s on development machines.
  it('does not reveal whether an unknown password is close to valid', async () => {
    const { auth } = service({ findUser: null });
    await expect(auth.login({ email: 'nobody@example.com', password: 'incorrect' })).rejects.toMatchObject({ message: 'INVALID_CREDENTIALS' });
  });
});


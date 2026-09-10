import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto, ResetPasswordDto } from './dto';
@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly config: ConfigService) {}
  private normalize(email: string) { return email.trim().toLowerCase(); }
  private digest(token: string) { return createHash('sha256').update(`${token}:${this.config.getOrThrow('TOKEN_PEPPER')}`).digest('hex'); }
  private opaqueToken() { return randomBytes(32).toString('base64url'); }
  async register(dto: RegisterDto) {
    const email = this.normalize(dto.email);
    if (await this.prisma.user.findUnique({ where: { email }, select: { id: true } })) throw new BadRequestException('ACCOUNT_ALREADY_EXISTS');
    const user = await this.prisma.user.create({ data: { email, passwordHash: await hash(dto.password, 12), displayName: dto.displayName.trim(), locale: dto.locale, countryCode: dto.countryCode } });
    const verificationToken = this.opaqueToken();
    await this.prisma.verificationToken.create({ data: { userId: user.id, tokenHash: this.digest(verificationToken), expiresAt: new Date(Date.now() + 86_400_000) } });
    return { user: this.publicUser(user), verificationToken: this.config.get('NODE_ENV') === 'production' ? undefined : verificationToken };
  }
  async verifyEmail(token: string) {
    const record = await this.prisma.verificationToken.findUnique({ where: { tokenHash: this.digest(token) } });
    if (!record || record.usedAt || record.expiresAt <= new Date()) throw new BadRequestException('INVALID_OR_EXPIRED_TOKEN');
    await this.prisma.$transaction([this.prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }), this.prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date(), status: 'ACTIVE' } })]);
    return { verified: true };
  }
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: this.normalize(dto.email) } });
    if (!user || !(await compare(dto.password, user.passwordHash))) throw new UnauthorizedException('INVALID_CREDENTIALS');
    if (user.status !== 'ACTIVE') throw new UnauthorizedException(user.status === 'PENDING' ? 'EMAIL_NOT_VERIFIED' : 'ACCOUNT_SUSPENDED');
    return this.issueSession(user);
  }
  async refresh(rawToken: string) {
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash: this.digest(rawToken) }, include: { user: true } });
    if (!record || record.revokedAt || record.expiresAt <= new Date() || record.user.status !== 'ACTIVE') throw new UnauthorizedException('INVALID_SESSION');
    await this.prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
    return this.issueSession(record.user);
  }
  async logout(rawToken?: string) {
    if (rawToken) await this.prisma.refreshToken.updateMany({ where: { tokenHash: this.digest(rawToken), revokedAt: null }, data: { revokedAt: new Date() } });
    return { loggedOut: true };
  }
  async logoutAll(userId: string) {
    await this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    return { loggedOut: true };
  }
  async profile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('ACCOUNT_NOT_FOUND');
    return this.publicUser(user);
  }
  async forgotPassword(emailInput: string) {
    const user = await this.prisma.user.findUnique({ where: { email: this.normalize(emailInput) } });
    if (!user) return { accepted: true };
    const token = this.opaqueToken();
    await this.prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: this.digest(token), expiresAt: new Date(Date.now() + 3_600_000) } });
    return { accepted: true, resetToken: this.config.get('NODE_ENV') === 'production' ? undefined : token };
  }
  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash: this.digest(dto.token) } });
    if (!record || record.usedAt || record.expiresAt <= new Date()) throw new BadRequestException('INVALID_OR_EXPIRED_TOKEN');
    await this.prisma.$transaction([this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await hash(dto.password, 12) } }), this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }), this.prisma.refreshToken.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } })]);
    return { reset: true };
  }
  private async issueSession(user: { id: string; email: string; displayName: string; locale: string; countryCode: string | null; role: string }) {
    const refreshToken = this.opaqueToken(); const refreshTtl = this.config.get<number>('REFRESH_TOKEN_TTL_SECONDS', 2_592_000);
    await this.prisma.refreshToken.create({ data: { userId: user.id, tokenHash: this.digest(refreshToken), expiresAt: new Date(Date.now() + refreshTtl * 1000) } });
    const expiresIn = this.config.get<number>('ACCESS_TOKEN_TTL_SECONDS', 900);
    return { accessToken: await this.jwt.signAsync({ sub: user.id, role: user.role }, { expiresIn }), refreshToken, user: this.publicUser(user), expiresIn };
  }
  private publicUser(user: { id: string; email: string; displayName: string; locale: string; countryCode: string | null; role: string }) { return { id: user.id, email: user.email, displayName: user.displayName, locale: user.locale, countryCode: user.countryCode, role: user.role }; }
}

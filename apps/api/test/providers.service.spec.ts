import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ProvidersService } from '../src/providers/providers.service';

describe('ProvidersService template validation', () => {
  const prisma = { streamProvider: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() } };
  const service = new ProvidersService(prisma as never);

  it('requires a movie id variable', () => {
    expect(() => service.create({ name: 'Movie', slug: 'movie', category: 'vod', movieTemplate: 'https://example.com/movie' }))
      .toThrow(BadRequestException);
  });

  it('requires all series variables', () => {
    expect(() => service.create({ name: 'Series', slug: 'series', category: 'vod', tvTemplate: 'https://example.com/{id}/{s}' }))
      .toThrow(BadRequestException);
  });

  it('requires a live URL for live providers', () => {
    expect(() => service.create({ name: 'Live', slug: 'live', category: 'live' }))
      .toThrow(BadRequestException);
  });
});

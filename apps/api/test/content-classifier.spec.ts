import { describe, expect, it } from 'vitest';
import { classifyM3u, providerGenres } from '../src/imports/content-classifier';

describe('content classifier', () => {
  it('uses explicit provider metadata before filename heuristics', () => {
    expect(classifyM3u({ explicitType: 'series', name: 'News', url: 'https://cdn.test/live/file.ts' }).kind).toBe('SERIES');
  });

  it('recognizes movies, series and documentary metadata', () => {
    expect(classifyM3u({ group: 'VOD Movies', url: 'https://cdn.test/movie/12.mp4' }).kind).toBe('MOVIE');
    expect(classifyM3u({ group: 'TV Shows', name: 'Demo S02E04' }).kind).toBe('SERIES');
    expect(providerGenres('Documentaires Nature')).toContain('DOCUMENTARY');
  });

  it('keeps an uncertainty signal when an M3U item has no useful metadata', () => {
    const result = classifyM3u({ name: 'Unknown', url: 'https://cdn.test/123' });
    expect(result.kind).toBe('LIVE');
    expect(result.confidence).toBeLessThan(0.5);
    expect(result.reasons).toContain('fallback:live');
  });
});

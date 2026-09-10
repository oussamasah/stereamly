import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { MediaTitleDto } from '../src/media/media.dto';

const movie = { slug: 'film-demo', type: 'MOVIE', names: { fr: 'Film', en: 'Movie', ar: 'فيلم' }, countryCodes: ['FR'], genreIds: [], images: [], externalIds: [], playbackVariants: [], durationSec: 5400, seasons: [] };

describe('MediaTitleDto', () => {
  it('accepts a localized movie with a duration', async () => {
    expect(await validate(plainToInstance(MediaTitleDto, movie))).toHaveLength(0);
  });
  it('validates nested playback variants', async () => {
    const value = plainToInstance(MediaTitleDto, { ...movie, playbackVariants: [{ label: 'HD', protocol: 'HLS', reference: '', regionCodes: ['fr'] }] });
    const errors = await validate(value);
    expect(errors.some(error => error.property === 'playbackVariants')).toBe(true);
  });
});

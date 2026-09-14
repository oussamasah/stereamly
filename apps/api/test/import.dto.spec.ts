import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { StartImportDto } from '../src/imports/import.dto';

describe('StartImportDto', () => {
  it('accepts a combined live, movie and series synchronization', async () => {
    const dto = plainToInstance(StartImportDto, { scope: ['LIVE', 'MOVIE', 'SERIES'] });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects empty, duplicate and unsupported scopes', async () => {
    await expect(validate(plainToInstance(StartImportDto, { scope: [] }))).resolves.not.toHaveLength(0);
    await expect(validate(plainToInstance(StartImportDto, { scope: ['LIVE', 'LIVE'] }))).resolves.not.toHaveLength(0);
    await expect(validate(plainToInstance(StartImportDto, { scope: ['EPG'] }))).resolves.not.toHaveLength(0);
  });
});

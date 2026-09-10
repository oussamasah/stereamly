import { describe, expect, it } from 'vitest';
import { validateEnv } from '../src/config/env';
const valid = { DATABASE_URL: 'postgresql://test', REDIS_URL: 'redis://test', JWT_SECRET: 'j'.repeat(32), TOKEN_PEPPER: 'p'.repeat(32), WEB_ORIGIN: 'http://localhost:3000' };
describe('validateEnv', () => {
  it('applies safe defaults', () => expect(validateEnv(valid).ACCESS_TOKEN_TTL_SECONDS).toBe(900));
  it('rejects weak secrets', () => expect(() => validateEnv({ ...valid, JWT_SECRET: 'weak' })).toThrow());
  it('rejects missing database config', () => expect(() => validateEnv({ ...valid, DATABASE_URL: '' })).toThrow());
});


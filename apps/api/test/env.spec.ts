import { describe, expect, it } from 'vitest';
import { validateEnv } from '../src/config/env';
const valid = { DATABASE_URL: 'postgresql://test', REDIS_URL: 'redis://test', JWT_SECRET: 'j'.repeat(32), TOKEN_PEPPER: 'p'.repeat(32), WEB_ORIGIN: 'http://localhost:3000' };
describe('validateEnv', () => {
  it('applies safe defaults', () => expect(validateEnv(valid).ACCESS_TOKEN_TTL_SECONDS).toBe(900));
  it('rejects weak secrets', () => expect(() => validateEnv({ ...valid, JWT_SECRET: 'weak' })).toThrow());
  it('rejects missing database config', () => expect(() => validateEnv({ ...valid, DATABASE_URL: '' })).toThrow());
});


describe('production configuration', () => {
  const production = { ...valid, NODE_ENV: 'production', WEB_ORIGIN: 'https://watch.example.net', SOURCE_ENCRYPTION_KEY: 's'.repeat(32), SMTP_HOST: 'smtp.example.net', SMTP_USER: 'sender', SMTP_PASSWORD: 'smtp-secret', EMAIL_FROM: 'Streamly <mail@example.net>' };
  it('rejects plaintext production origins', () => expect(() => validateEnv({ ...production, WEB_ORIGIN: 'http://watch.example.net' })).toThrow());
  it('requires separate vault and token secrets', () => expect(() => validateEnv({ ...production, SOURCE_ENCRYPTION_KEY: production.TOKEN_PEPPER })).toThrow());
  it('rejects invalid port and lifetime values', () => {
    expect(() => validateEnv({ ...valid, API_PORT: 'not-a-port' })).toThrow();
    expect(() => validateEnv({ ...valid, ACCESS_TOKEN_TTL_SECONDS: -1 })).toThrow();
  });
  it('requires production email delivery', () => expect(() => validateEnv({ ...production, SMTP_HOST: '' })).toThrow());
  it('accepts a configured HTTPS deployment', () => expect(validateEnv(production).NODE_ENV).toBe('production'));
});

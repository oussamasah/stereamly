export type AppEnv = {
  NODE_ENV: 'development' | 'test' | 'production'; API_PORT: number; WEB_ORIGIN: string;
  DATABASE_URL: string; REDIS_URL: string; JWT_SECRET: string; TOKEN_PEPPER: string;
  ACCESS_TOKEN_TTL_SECONDS: number; REFRESH_TOKEN_TTL_SECONDS: number;
  SOURCE_ENCRYPTION_KEY: string; TRUST_PROXY_HOPS: number;
  IMPORT_EXECUTION_MODE: 'all' | 'enqueue' | 'worker';
  SMTP_HOST: string; SMTP_PORT: number; SMTP_USER: string; SMTP_PASSWORD: string; EMAIL_FROM: string;
};
function integer(raw: Record<string, unknown>, key: string, fallback: number, min: number, max: number) {
  const value = Number(raw[key] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`Invalid ${key}`);
  return value;
}
export function validateEnv(raw: Record<string, unknown>): AppEnv {
  const required = ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'TOKEN_PEPPER', 'WEB_ORIGIN'] as const;
  for (const key of required) if (typeof raw[key] !== 'string' || !raw[key]) throw new Error(`Missing environment variable: ${key}`);
  const nodeEnv = String(raw.NODE_ENV ?? 'development');
  if (!['development', 'test', 'production'].includes(nodeEnv)) throw new Error('Invalid NODE_ENV');
  const production = nodeEnv === 'production';
  const sourceKey = String(raw.SOURCE_ENCRYPTION_KEY ?? (production ? '' : raw.TOKEN_PEPPER));
  const secrets = [String(raw.JWT_SECRET), String(raw.TOKEN_PEPPER), sourceKey];
  if (secrets.some(value => value.length < 32)) throw new Error('JWT_SECRET, TOKEN_PEPPER and SOURCE_ENCRYPTION_KEY must contain at least 32 characters');
  if (production && (new Set(secrets).size !== 3 || secrets.some(value => /dev.only|change.me|example|test.secret|replace|placeholder/i.test(value)))) {
    throw new Error('Production requires three independent non-example secrets');
  }
  const origin = new URL(String(raw.WEB_ORIGIN));
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') throw new Error('WEB_ORIGIN must be an HTTP(S) origin without a path');
  if (production && (origin.protocol !== 'https:' || origin.hostname === 'localhost')) throw new Error('Production WEB_ORIGIN must use public HTTPS');
  if (!['postgres:', 'postgresql:'].includes(new URL(String(raw.DATABASE_URL)).protocol)) throw new Error('Invalid DATABASE_URL');
  if (!['redis:', 'rediss:'].includes(new URL(String(raw.REDIS_URL)).protocol)) throw new Error('Invalid REDIS_URL');
  const mail = { SMTP_HOST: String(raw.SMTP_HOST ?? ''), SMTP_USER: String(raw.SMTP_USER ?? ''), SMTP_PASSWORD: String(raw.SMTP_PASSWORD ?? ''), EMAIL_FROM: String(raw.EMAIL_FROM ?? '') };
  if (production && Object.values(mail).some(value => !value)) throw new Error('Production requires SMTP_HOST, SMTP_USER, SMTP_PASSWORD and EMAIL_FROM');
  if (/\r|\n/.test(mail.EMAIL_FROM)) throw new Error('Invalid EMAIL_FROM');
  const importMode = String(raw.IMPORT_EXECUTION_MODE ?? 'all');
  if (!['all', 'enqueue', 'worker'].includes(importMode)) throw new Error('Invalid IMPORT_EXECUTION_MODE');
  return {
    ...mail, SMTP_PORT: integer(raw, 'SMTP_PORT', 587, 1, 65535),
    NODE_ENV: nodeEnv as AppEnv['NODE_ENV'],
    API_PORT: integer(raw, 'API_PORT', 4000, 1, 65535), WEB_ORIGIN: origin.origin,
    DATABASE_URL: String(raw.DATABASE_URL), REDIS_URL: String(raw.REDIS_URL), JWT_SECRET: secrets[0], TOKEN_PEPPER: secrets[1], SOURCE_ENCRYPTION_KEY: sourceKey,
    IMPORT_EXECUTION_MODE: importMode as AppEnv['IMPORT_EXECUTION_MODE'],
    TRUST_PROXY_HOPS: integer(raw, 'TRUST_PROXY_HOPS', 0, 0, 3),
    ACCESS_TOKEN_TTL_SECONDS: integer(raw, 'ACCESS_TOKEN_TTL_SECONDS', 900, 60, 3600),
    REFRESH_TOKEN_TTL_SECONDS: integer(raw, 'REFRESH_TOKEN_TTL_SECONDS', 2592000, 3600, 2592000),
  };
}

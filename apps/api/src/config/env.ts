export type AppEnv = {
  NODE_ENV: 'development' | 'test' | 'production'; API_PORT: number; WEB_ORIGIN: string;
  DATABASE_URL: string; REDIS_URL: string; JWT_SECRET: string; TOKEN_PEPPER: string;
  ACCESS_TOKEN_TTL_SECONDS: number; REFRESH_TOKEN_TTL_SECONDS: number;
  SOURCE_ENCRYPTION_KEY: string;
  IMPORT_EXECUTION_MODE: 'all' | 'enqueue' | 'worker';
};
export function validateEnv(raw: Record<string, unknown>): AppEnv {
  const required = ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'TOKEN_PEPPER', 'WEB_ORIGIN'] as const;
  for (const key of required) if (typeof raw[key] !== 'string' || !raw[key]) throw new Error(`Missing environment variable: ${key}`);
  const nodeEnv = String(raw.NODE_ENV ?? 'development');
  if (!['development', 'test', 'production'].includes(nodeEnv)) throw new Error('Invalid NODE_ENV');
  if (String(raw.JWT_SECRET).length < 32 || String(raw.TOKEN_PEPPER).length < 32) throw new Error('JWT_SECRET and TOKEN_PEPPER must contain at least 32 characters');
  const sourceKey = String(raw.SOURCE_ENCRYPTION_KEY ?? raw.TOKEN_PEPPER);
  if (sourceKey.length < 32) throw new Error('SOURCE_ENCRYPTION_KEY must contain at least 32 characters');
  const importMode=String(raw.IMPORT_EXECUTION_MODE??'all');if(!['all','enqueue','worker'].includes(importMode))throw new Error('Invalid IMPORT_EXECUTION_MODE');
  return { NODE_ENV: nodeEnv as AppEnv['NODE_ENV'], API_PORT: Number(raw.API_PORT ?? 4000), WEB_ORIGIN: String(raw.WEB_ORIGIN), DATABASE_URL: String(raw.DATABASE_URL), REDIS_URL: String(raw.REDIS_URL), JWT_SECRET: String(raw.JWT_SECRET), TOKEN_PEPPER: String(raw.TOKEN_PEPPER), SOURCE_ENCRYPTION_KEY: sourceKey,IMPORT_EXECUTION_MODE:importMode as AppEnv['IMPORT_EXECUTION_MODE'], ACCESS_TOKEN_TTL_SECONDS: Number(raw.ACCESS_TOKEN_TTL_SECONDS ?? 900), REFRESH_TOKEN_TTL_SECONDS: Number(raw.REFRESH_TOKEN_TTL_SECONDS ?? 2_592_000) };
}

import type { NextConfig } from 'next';
import { resolve } from 'node:path';


const config: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: resolve(process.cwd(), '../..'),
  poweredByHeader: false,
  env: { NEXT_PUBLIC_TMDB_API_KEY: process.env.NEXT_PUBLIC_TMDB_API_KEY ?? '', NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1' },
};
export default config;

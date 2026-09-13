/* eslint-disable @typescript-eslint/no-require-imports -- This is the CommonJS Next.js launcher. */
const { existsSync } = require('node:fs');
const { dirname, resolve } = require('node:path');
const { loadEnvFile } = require('node:process');

process.env.NODE_ENV = process.argv[2] === 'dev' ? 'development' : 'production';
const rootEnv = resolve(__dirname, '../../..', '.env');
if (existsSync(rootEnv)) loadEnvFile(rootEnv);

// Set the compiler environment consistently in Windows, macOS and Linux shells.
if (process.platform === 'win32' || process.env.NEXT_FORCE_WASM === '1') {
  process.env.NEXT_TEST_WASM = '1';
  process.env.NEXT_TEST_WASM_DIR = dirname(require.resolve('@next/swc-wasm-nodejs/package.json'));
}
require(resolve(dirname(require.resolve('next/package.json')), 'dist/bin/next'));

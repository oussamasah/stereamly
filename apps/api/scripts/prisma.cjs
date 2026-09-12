const { loadEnvFile } = require('node:process');
const { dirname, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

// npm runs workspace scripts from apps/api; the shared .env lives at the root.
try {
  loadEnvFile(resolve(__dirname, '../../../.env'));
} catch (error) {
  // Deployments may provide their environment without a local .env file.
  if (error.code !== 'ENOENT') throw error;
}

const prismaPackagePath = require.resolve('prisma/package.json');
const prismaCli = resolve(dirname(prismaPackagePath), require(prismaPackagePath).bin.prisma);
const result = spawnSync(process.execPath, [prismaCli, ...process.argv.slice(2)], {
  cwd: resolve(__dirname, '..'),
  env: process.env,
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);

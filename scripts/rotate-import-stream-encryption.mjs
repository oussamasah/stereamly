import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

const parseEnv = (path) => Object.fromEntries(readFileSync(path, 'utf8').split(/\r?\n/).map((line) => /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim())).filter(Boolean).map((match) => [match[1], match[2].replace(/^['"]|['"]$/g, '')]));
const currentEnv = parseEnv(new URL('../.env', import.meta.url));
const legacyPath = process.argv[2];
if (!legacyPath) throw new Error('Usage: node scripts/rotate-import-stream-encryption.mjs <legacy-env-path>');
const legacyEnv = parseEnv(legacyPath);
process.env.DATABASE_URL ||= currentEnv.DATABASE_URL;

const key = (secret) => createHash('sha256').update(secret).digest();
const currentKey = key(currentEnv.SOURCE_ENCRYPTION_KEY);
const legacyKey = key(legacyEnv.SOURCE_ENCRYPTION_KEY);
const decrypt = (row, encryptionKey) => {
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey, Buffer.from(row.streamIv, 'base64'));
  decipher.setAuthTag(Buffer.from(row.streamAuthTag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(row.streamCiphertext, 'base64')), decipher.final()]).toString('utf8'));
};
const encrypt = (value) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', currentKey, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return { streamCiphertext: ciphertext.toString('base64'), streamIv: iv.toString('base64'), streamAuthTag: cipher.getAuthTag().toString('base64') };
};
const prisma = new PrismaClient();

try {
  const models = [
    ['catalog', prisma.sourceCatalogItem],
    ['staged', prisma.importStagedItem],
  ];
  const where = { streamCiphertext: { not: null }, streamIv: { not: null }, streamAuthTag: { not: null } };
  const select = { id: true, streamCiphertext: true, streamIv: true, streamAuthTag: true };
  let alreadyCurrent = 0, legacyReadable = 0, unreadable = 0;
  for (const [, model] of models) {
    let cursor;
    do {
      const rows = await model.findMany({ where, select, orderBy: { id: 'asc' }, take: 500, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
      for (const row of rows) {
        try { decrypt(row, currentKey); alreadyCurrent++; continue; } catch { /* Try the legacy key. */ }
        try { decrypt(row, legacyKey); legacyReadable++; } catch { unreadable++; }
      }
      cursor = rows.at(-1)?.id;
      if (rows.length < 500) break;
    } while (cursor);
  }
  if (unreadable) throw new Error(`${unreadable} encrypted stream reference(s) cannot be decrypted with either key; no data was changed.`);
  const migrated = { catalog: 0, staged: 0 };
  for (const [kind, model] of models) {
    let cursor;
    do {
      const rows = await model.findMany({ where, select, orderBy: { id: 'asc' }, take: 250, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
      const updates = [];
      for (const row of rows) {
        try { decrypt(row, currentKey); } catch { updates.push(model.update({ where: { id: row.id }, data: encrypt(decrypt(row, legacyKey)) })); }
      }
      if (updates.length) await prisma.$transaction(updates);
      migrated[kind] += updates.length;
      cursor = rows.at(-1)?.id;
      if (rows.length < 250) break;
    } while (cursor);
  }
  console.log(JSON.stringify({ migratedCatalogItems: migrated.catalog, migratedStagedItems: migrated.staged, alreadyCurrent, legacyReadable }));
} finally {
  await prisma.$disconnect();
}

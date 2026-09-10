import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PortalClient } from '../src/sources/portal-client';
import { SourceVaultService } from '../src/sources/source-vault.service';
import { UrlPolicyService } from '../src/sources/url-policy.service';

const prisma = new PrismaClient();
const sourceName = process.argv[2] ?? 'test portal';
const timed = async <T>(label: string, task: () => Promise<T>) => {
  const started = Date.now();
  try {
    const value = await task();
    console.log(JSON.stringify({ step: label, ok: true, durationMs: Date.now() - started, count: Array.isArray(value) ? value.length : undefined }));
    return value;
  } catch (error) {
    console.log(JSON.stringify({ step: label, ok: false, durationMs: Date.now() - started, error: error instanceof Error ? error.message : 'UNKNOWN' }));
    throw error;
  }
};

async function main() {
 try {
  const source = await prisma.sourceAccount.findFirst({ where: { name: sourceName, type: 'PORTAL_MAC' }, include: { secret: true } });
  if (!source?.secret) throw new Error('PORTAL_SOURCE_NOT_FOUND');
  const vault = new SourceVaultService(new ConfigService(process.env));
  const client = new PortalClient(new UrlPolicyService());
  const secret = vault.decrypt(source.secret);
  const session = await timed('connect', () => client.connect(source, secret));
  const genres = await timed('genres', () => (client as any).categories(session, source, secret, 'itv')) as Map<string, string>;
  const firstGenre = [...genres.keys()].find(Boolean) ?? '*';
  for (const [label, extra] of [
    ['ordered-genre-page-1', { genre: firstGenre, p: '1', fav: '0', sortby: 'number' }],
    ['ordered-genre-page-0', { genre: firstGenre, p: '0', fav: '0', sortby: 'number' }],
    ['ordered-all-genre', { genre: '*', p: '1', fav: '0', sortby: 'number' }],
    ['ordered-all-category', { category: '*', p: '1', fav: '0', sortby: 'number' }],
  ] as const) {
    try {
      const value = await timed(label, () => (client as any).call(session.endpoint, source, secret, 'itv', 'get_ordered_list', extra, session.headers));
      console.log(JSON.stringify({ step: `${label}-shape`, keys: Object.keys(value), rows: Array.isArray(value.data) ? value.data.length : Array.isArray(value) ? value.length : 0, total: value.total_items ?? null, perPage: value.max_page_items ?? null }));
    } catch { /* Continue probing the remaining compatible forms. */ }
  }
  await timed('channels-with-fallback', () => (client as any).liveChannels(session, source, secret));
 } finally {
   await prisma.$disconnect();
 }
}

void main().catch(error => { console.error(error instanceof Error ? error.message : 'UNKNOWN'); process.exitCode = 1; });

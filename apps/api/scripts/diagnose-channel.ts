import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { PortalClient } from '../src/sources/portal-client';
import { SourceVaultService } from '../src/sources/source-vault.service';
import { UrlPolicyService } from '../src/sources/url-policy.service';

const prisma = new PrismaClient();
const name = process.argv.slice(2).join(' ') || 'IT - SKY DAZN BAR HD';

async function probe(label: string, url: string, headers: Record<string, string>) {
  const started = Date.now();
  const parsed = new URL(url);
  console.log(JSON.stringify({ label: `${label}-target`, protocol: parsed.protocol, host: parsed.hostname, port: parsed.port || (parsed.protocol === 'https:' ? '443' : '80'), path: parsed.pathname }));
  try {
    const response = await fetch(url, { headers, redirect: 'manual', signal: AbortSignal.timeout(15_000) });
    const reader = response.body?.getReader();
    const chunk = reader ? await reader.read() : undefined;
    await reader?.cancel();
    console.log(JSON.stringify({ label, status: response.status, durationMs: Date.now() - started, contentType: response.headers.get('content-type'), locationHost: response.headers.get('location') ? new URL(response.headers.get('location')!, url).hostname : null, firstBytes: chunk?.value?.length ?? 0 }));
  } catch (error) {
    const cause = error instanceof Error ? error.cause as { code?: string; message?: string } | undefined : undefined;
    console.log(JSON.stringify({ label, durationMs: Date.now() - started, error: error instanceof Error ? `${error.name}:${error.message}` : 'UNKNOWN', causeCode: cause?.code ?? null, causeMessage: cause?.message ?? null }));
  }
}

async function probeNative(label: string, url: string, headers: Record<string, string>) {
  const started = Date.now();
  const parsed = new URL(url);
  await new Promise<void>(resolve => {
    const request = (parsed.protocol === 'https:' ? httpsRequest : httpRequest)(parsed, { headers }, response => {
      response.once('data', chunk => { console.log(JSON.stringify({ label, status: response.statusCode, durationMs: Date.now() - started, firstBytes: chunk.length })); request.destroy(); resolve(); });
      response.once('end', () => { console.log(JSON.stringify({ label, status: response.statusCode, durationMs: Date.now() - started, firstBytes: 0 })); resolve(); });
    });
    request.setTimeout(15_000, () => request.destroy(new Error('TIMEOUT')));
    request.once('error', error => { console.log(JSON.stringify({ label, durationMs: Date.now() - started, error: error.message, code: (error as NodeJS.ErrnoException).code ?? null })); resolve(); });
    request.end();
  });
}

async function main() {
  try {
    const item = await prisma.sourceCatalogItem.findFirst({ where: { displayName: name }, include: { source: { include: { secret: true } } } });
    if (!item?.source.secret || !item.streamCiphertext || !item.streamIv || !item.streamAuthTag) throw new Error('CHANNEL_NOT_FOUND');
    const vault = new SourceVaultService(new ConfigService(process.env));
    console.log(JSON.stringify({ label: 'source-config', source: item.source.name, configuredUserAgent: item.source.userAgent || null }));
    const credentials = vault.decrypt(item.source.secret);
    const reference = vault.decrypt({ ciphertext: item.streamCiphertext, iv: item.streamIv, authTag: item.streamAuthTag, keyVersion: 1 }).apiToken;
    if (!reference) throw new Error('STREAM_REFERENCE_MISSING');
    const resolved = await new PortalClient(new UrlPolicyService()).resolve(item.source, credentials, reference);
    const ua = item.source.userAgent ?? 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 4 rev: 2721 Safari/533.3';
    await probe('gateway-current', resolved, { 'user-agent': ua });
    await probeNative('native-http-current', resolved, { 'user-agent': ua });
    await probe('portal-headers', resolved, { 'user-agent': ua, 'x-user-agent': 'Model: MAG250; Link: WiFi', referer: `${new URL(item.source.baseUrl).origin}/c/`, cookie: `mac=${encodeURIComponent(credentials.macAddress ?? '')}; stb_lang=fr; timezone=Europe%2FParis` });
    if (reference.startsWith('portal:')) {
      const client = new PortalClient(new UrlPolicyService());
      const session = await client.connect(item.source, credentials);
      const command = Buffer.from(reference.split(':').slice(2).join(':'), 'base64url').toString('utf8');
      try {
        const linked = await (client as any).call(session.endpoint, item.source, credentials, 'itv', 'create_link', { cmd: command, series: '0', forced_storage: 'undefined', disable_ad: '0', download: '0' }, session.headers);
        const fresh = String(linked.cmd ?? linked.url ?? '').trim().replace(/^(?:ffmpeg|ffrt2|ffrt3|ffrt|auto)\s+/i, '');
        if (fresh.startsWith('http')) await probe('forced-create-link', fresh, { 'user-agent': ua, 'x-user-agent': 'Model: MAG250; Link: WiFi', referer: `${new URL(item.source.baseUrl).origin}/c/`, cookie: `mac=${encodeURIComponent(credentials.macAddress ?? '')}; stb_lang=fr; timezone=Europe%2FParis` });
        else console.log(JSON.stringify({ label: 'forced-create-link', error: 'NO_PLAYABLE_URL' }));
      } catch (error) { console.log(JSON.stringify({ label: 'forced-create-link', error: error instanceof Error ? error.message : 'UNKNOWN' })); }
    }
  } finally { await prisma.$disconnect(); }
}

void main().catch(error => { console.error(error instanceof Error ? error.message : 'UNKNOWN'); process.exitCode = 1; });

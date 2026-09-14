import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/)) {
  const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim());
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
}

const prisma = new PrismaClient();
const base = `http://127.0.0.1:${process.env.API_PORT || 4000}/api/v1`;
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const sign = (user) => {
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({ sub: user.id, version: user.authVersion, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 600 });
  const signature = createHmac('sha256', process.env.JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
};

try {
  const admin = await prisma.user.findFirst({ where: { status: 'ACTIVE', role: { in: ['SUPER_ADMIN', 'TECHNICAL_ADMIN'] } }, select: { id: true, authVersion: true } });
  if (!admin) throw new Error('No active technical administrator found');
  const token = sign(admin);
  const candidates = await prisma.sourceCatalogItem.findMany({
    where: { kind: 'LIVE', active: true, channelId: { not: null }, streamCiphertext: { not: null }, source: { enabled: true, status: 'READY', archivedAt: null } },
    select: { id: true, displayName: true, channelId: true, channel: { select: { status: true, webAvailable: true } }, source: { select: { type: true, name: true } } },
    orderBy: { lastSeenAt: 'desc' },
  });
  const selected = [...new Map(candidates.map((item) => [item.source.type, item])).values()];
  console.log(`Testing ${selected.length} live source type(s).`);
  for (const item of selected) {
    const preview = await fetch(`${base}/admin/playback/source-items/${item.id}/preview`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000) });
    const body = await preview.json().catch(() => ({}));
    if (!preview.ok) {
      console.log(JSON.stringify({ sourceType: item.source.type, source: item.source.name, channel: item.displayName, previewStatus: preview.status, error: body.message || 'UNKNOWN' }));
      continue;
    }
    const gateway = await fetch(new URL(body.manifestUrl, base).toString(), { signal: AbortSignal.timeout(20_000) });
    const reader = gateway.body?.getReader();
    const first = reader ? await reader.read() : { value: undefined };
    await reader?.cancel();
    console.log(JSON.stringify({ sourceType: item.source.type, source: item.source.name, channel: item.displayName, previewStatus: preview.status, streamType: body.streamType, gatewayStatus: gateway.status, contentType: gateway.headers.get('content-type'), firstBytes: first.value?.byteLength || 0 }));
  }
  const publicItems = [...new Map(candidates.filter((item) => item.channel?.status === 'PUBLISHED' && item.channel.webAvailable).map((item) => [item.source.type, item])).values()];
  for (const item of publicItems) {
    const session = await fetch(`${base}/playback/sessions`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ targetType: 'CHANNEL', targetId: item.channelId, deviceId: 'playback-audit' }) });
    const body = await session.json().catch(() => ({}));
    if (!session.ok) {
      console.log(JSON.stringify({ publicSourceType: item.source.type, channel: item.displayName, sessionStatus: session.status, error: body.message || 'UNKNOWN' }));
      continue;
    }
    const gateway = await fetch(new URL(body.manifestUrl, base).toString(), { signal: AbortSignal.timeout(20_000) });
    const reader = gateway.body?.getReader();
    const first = reader ? await reader.read() : { value: undefined };
    await reader?.cancel();
    await fetch(`${base}/playback/sessions/${body.sessionId}/end`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: '{}' });
    console.log(JSON.stringify({ publicSourceType: item.source.type, channel: item.displayName, sessionStatus: session.status, streamType: body.streamType, gatewayStatus: gateway.status, contentType: gateway.headers.get('content-type'), firstBytes: first.value?.byteLength || 0 }));
  }
} finally {
  await prisma.$disconnect();
}

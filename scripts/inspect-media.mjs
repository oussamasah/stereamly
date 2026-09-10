import { chromium } from 'playwright';

const targetUrl = process.argv[2];
const allowedDomains = new Set(
  (process.env.MEDIA_INSPECT_ALLOWED_DOMAINS ?? 'localhost,127.0.0.1')
    .split(',').map(value => value.trim().toLowerCase()).filter(Boolean),
);

if (!targetUrl) {
  console.error('Usage: npm run inspect:media -- <url>');
  process.exit(2);
}

let parsedTarget;
try { parsedTarget = new URL(targetUrl); } catch { console.error('[ERREUR] URL invalide.'); process.exit(2); }
if (!['http:', 'https:'].includes(parsedTarget.protocol) || !allowedDomains.has(parsedTarget.hostname.toLowerCase())) {
  console.error(`[ERREUR] Le domaine ${parsedTarget.hostname} n’est pas autorisé. Configurez MEDIA_INSPECT_ALLOWED_DOMAINS.`);
  process.exit(2);
}

const report = { targetUrl, timestamp: new Date().toISOString(), playlists: { master: [], video: [], audio: [] }, subtitles: [], networkLogs: [] };
const seen = new Set();
const mediaPattern = /(?:\.m3u8?|\.mpd)(?:$|[?#])|\/hls\/|\/stream\//i;
const subtitlePattern = /\.(?:vtt|srt|ass|ssa)(?:$|[?#])/i;
const safeHeaders = headers => ({ referer: headers.referer ?? null, origin: headers.origin ?? null, 'user-agent': headers['user-agent'] ?? null });
function classify(url, body = '') {
  if (/EXT-X-MEDIA:.*TYPE=AUDIO/i.test(body) || /audio(?:[_-]|\/)/i.test(url)) return 'audio';
  if (/EXT-X-STREAM-INF/i.test(body) || /master|index\.m3u8/i.test(url) || /\.mpd(?:$|[?#])/i.test(url)) return 'master';
  return 'video';
}
function addPlaylist(kind, entry) {
  const key = `${kind}:${entry.url}`; if (seen.has(key)) return;
  seen.add(key); report.playlists[kind].push(entry);
}
function addSubtitle(value) {
  if (!value.url || report.subtitles.some(item => item.url === value.url)) return;
  report.subtitles.push(value);
}

let browser;
const deadline = AbortSignal.timeout(30_000);
try {
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  const context = await browser.newContext({
    userAgent: process.env.MEDIA_INSPECT_USER_AGENT ?? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    locale: 'fr-FR', viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: { accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'accept-language': 'fr-FR,fr;q=0.9,en;q=0.7' },
  });
  const page = await context.newPage();
  page.on('request', request => {
    const url = request.url(), headers = request.headers();
    if (mediaPattern.test(url)) addPlaylist(classify(url), { url, method: request.method(), headers: safeHeaders(headers) });
    if (subtitlePattern.test(url)) addSubtitle({ language: '', label: '', url });
  });
  page.on('response', async response => {
    const url = response.url(); if (!mediaPattern.test(url) && !subtitlePattern.test(url)) return;
    if (response.status() >= 400) report.networkLogs.push({ url, status: response.status(), statusText: response.statusText() });
    if (/\.m3u8?(?:$|[?#])/i.test(url) && response.ok()) {
      try { const body = (await response.text()).slice(0, 256_000); addPlaylist(classify(url, body), { url, method: response.request().method(), headers: safeHeaders(response.request().headers()) }); } catch { /* Streaming bodies may already be consumed by the player. */ }
    }
  });
  page.on('requestfailed', request => report.networkLogs.push({ url: request.url(), status: 0, statusText: request.failure()?.errorText ?? 'REQUEST_FAILED' }));
  const abort = new Promise((_, reject) => deadline.addEventListener('abort', () => reject(new Error('Inspection limitée à 30 secondes')), { once: true }));
  await Promise.race([page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 }), abort]);
  for (const selector of ['button[aria-label*="play" i]', '[class*="play" i]', 'video']) {
    try { await page.locator(selector).first().click({ timeout: 1_000, force: true }); break; } catch { /* Optional player overlay. */ }
  }
  await Promise.race([page.waitForTimeout(5_000), abort]);
  for (const frame of page.frames()) {
    try {
      const tracks = await frame.locator('track').evaluateAll(nodes => nodes.map(node => ({ language: node.srclang || '', label: node.label || '', url: node.src || node.getAttribute('src') || '' })));
      tracks.forEach(addSubtitle);
    } catch { /* Cross-origin or detached frame. */ }
  }
} catch (error) {
  report.networkLogs.push({ url: targetUrl, status: 0, statusText: error instanceof Error ? error.message : 'INSPECTION_FAILED' });
} finally {
  await browser?.close().catch(() => undefined);
}

console.log(JSON.stringify(report, null, 2));

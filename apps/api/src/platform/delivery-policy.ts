import { BadRequestException } from '@nestjs/common';
// No network requests: qualification never downloads a media resource on the server.
export function publicUrl(raw: string): URL {
    let url: URL;
    try {
        url = new URL(raw);
    }
    catch {
        throw new BadRequestException('INVALID_PUBLIC_URL');
    }
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password || url.port ||
        host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal') ||
        !host.includes('.') || /^[\d.]+$/.test(host) || host.includes(':')) {
        throw new BadRequestException('PUBLIC_HTTPS_HOST_REQUIRED');
    }
    if (url.search || url.hash || /\/(?:live|movie|series)\/[^/]+\/[^/]+\/[^/]+/i.test(url.pathname)) {
        throw new BadRequestException('CREDENTIAL_OR_QUERY_URL_NOT_SUPPORTED');
    }
    return url;
}
export function deliveryUrl(kind: string, raw: string): string {
    const url = publicUrl(raw);
    if (kind === 'HLS' && !url.pathname.toLowerCase().endsWith('.m3u8'))
        throw new BadRequestException('HLS_URL_REQUIRED');
    if (kind === 'YOUTUBE' && !(url.hostname === 'www.youtube-nocookie.com' && /^\/embed\/[\w-]{11}$/.test(url.pathname))) {
        throw new BadRequestException('YOUTUBE_EMBED_REQUIRED');
    }
    if (kind === 'VIMEO' && !(url.hostname === 'player.vimeo.com' && /^\/video\/\d+$/.test(url.pathname))) {
        throw new BadRequestException('VIMEO_EMBED_REQUIRED');
    }
    if (!['HLS', 'YOUTUBE', 'VIMEO'].includes(kind))
        throw new BadRequestException('PROVIDER_NOT_SUPPORTED');
    return url.toString();
}
export function eventWindow(start: string, end: string) {
    if (new Date(end) <= new Date(start))
        throw new BadRequestException('EVENT_END_MUST_FOLLOW_START');
}

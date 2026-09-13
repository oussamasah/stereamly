'use client';
import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Locale } from '../../i18n';
import { available, Binding, decodeIptvUrl, tmdb, Title, useNow, usePlatform, useResource } from './data';
import { labels } from './labels';
import { saveTitle, useLibrary } from './library';

type StreamProvider = {
    id: string;
    name: string;
    slug: string;
    category: string;
    movieTemplate?: string | null;
    tvTemplate?: string | null;
    streamUrl?: string | null;
    rank: number;
     sandboxed?: boolean;
};

export function Player({ locale, target }: { locale: Locale; target: string }) {
    const t = labels[locale];
    const now = useNow();
    const platform = usePlatform();
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    const parts = target.split(':');
    const metadata = useResource<Title>(parts[0] === 'tmdb' ? tmdb(`${parts[1]}/${parts[2]}`, locale) : null);
    const providers = useResource<StreamProvider[]>(parts[0] === 'tmdb' ? `${api}/providers?category=vod` : null);
    const [country, setCountry] = useState('ALL');
    const [selected, setSelected] = useState('');
    const [attempt, setAttempt] = useState(0);
    const direct = publicDirectBindings(target);
    const providerBindings = providerTemplateBindings(target, providers.data);
    const bindings = [...available(platform.data, target, country, now), ...providerBindings, ...direct];
    const binding = bindings.find(source => source.id === selected) || bindings[0];
    const event = platform.data?.events.find(item => target === `event:${item.id}`);
    const channel = platform.data?.channels.find(item => target === `channel:${item.id}`);
    const name = event?.title || channel?.names[locale] || metadata.data?.title || metadata.data?.name || t.play;
    const countries = [...new Set(platform.data?.bindings.filter(source => source.target === target).flatMap(source => source.countries))]
        .filter(item => item !== 'ALL')
        .sort();
    const inWindow = !event || (event.status === 'LIVE' && Date.parse(event.startsAt) <= now && Date.parse(event.endsAt) > now);
    const needsPlatform = !['tmdb', 'iptv'].includes(parts[0]);

    useEffect(() => {
        try {
            const preferred = window.localStorage.getItem(preferenceKey(target));
            if (preferred) setSelected(preferred);
        } catch { /* Source selection still works when storage is blocked. */ }
    }, [target]);

    const choose = (value: string) => {
        setSelected(value);
        try {
            window.localStorage.setItem(preferenceKey(target), value);
        } catch { /* Ignore private browsing/storage failures. */ }
    };

    return <section className="view-shell">
        <h1>{name}</h1>
        {event && <p>{event.competition} · {event.status} · {new Date(event.startsAt).toLocaleString(locale)}</p>}
        <div className="view-actions">
            {countries.length > 0 && <label>{t.region}<select value={country} onChange={event => setCountry(event.target.value)}><option value="ALL">{t.world}</option>{countries.map(item => <option key={item}>{item}</option>)}</select></label>}
            {bindings.length > 1 && <label>{t.source}<select value={binding?.id || ''} onChange={event => choose(event.target.value)}>{bindings.map(source => <option key={source.id} value={source.id}>{source.label}</option>)}</select></label>}
        </div>
        {needsPlatform && platform.error ? <div role="alert"><p>{t.error}</p><button onClick={platform.retry}>{t.retry}</button></div> :
            needsPlatform && !platform.data && direct.length === 0 ? <p role="status">{t.loading}</p> :
                binding && inWindow ? <Playback key={`${binding.id}-${attempt}`} retry={() => setAttempt(value => value + 1)} binding={binding} target={target} name={name} locale={locale} /> :
                    <p className="view-empty">{t.unavailable}</p>}
    </section>;
}

function preferenceKey(target: string) {
    const [source, type] = target.split(':');
    return `streamly:preferred-source:${source}:${type || 'direct'}`;
}

function publicDirectBindings(target: string): Binding[] {
    const [type, id] = target.split(':');
    if (type !== 'iptv') return [];
    const url = decodeIptvUrl(id);
    if (!url) return [];
    return [{
        id: 'iptv-org-direct',
        target,
        label: 'IPTV-org HLS',
        kind: 'HLS',
        url,
        countries: ['ALL'],
        expiresAt: '2999-12-31T23:59:59.000Z',
    }];
}

function providerTemplateBindings(target: string, providers: StreamProvider[] | undefined): Binding[] {
    const [source, type, id, , season, , episode] = target.split(':');
    if (source !== 'tmdb' || !['movie', 'tv'].includes(type) || !providers) return [];
    return providers.flatMap(provider => {
        const template = type === 'movie' ? provider.movieTemplate : provider.tvTemplate;
        const url = resolveTemplate(template || provider.streamUrl, id, season || '1', episode || '1');
        if (!url) return [];
       return [{
  id: `provider-${provider.slug}`,
  target,
  label: provider.name,
  kind: /\.m3u8($|[?#])/i.test(url) ? 'HLS' as const : 'EMBED' as const,
  url,
  countries: ['ALL'],
  expiresAt: '2999-12-31T23:59:59.000Z',
  sandboxed: provider.sandboxed !== false,
}];
    });
}

function resolveTemplate(template: string | null | undefined, id: string, season: string, episode: string) {
    if (!template) return null;
    const url = template.replaceAll('{id}', encodeURIComponent(id)).replaceAll('{s}', encodeURIComponent(season)).replaceAll('{e}', encodeURIComponent(episode));
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : null;
    } catch {
        return null;
    }
}

function Playback({ binding, target, name, locale, retry }: {
    retry: () => void;
    binding: Binding;
    target: string;
    name: string;
    locale: Locale;
}) {
    const video = useRef<HTMLVideoElement>(null);
    const currentName = useRef(name);
    const [failed, setFailed] = useState(false);
    const library = useLibrary();
    const resume = useRef(library.find(item => item.target === target)?.position || 0);

    useEffect(() => { currentName.current = name; }, [name]);
    useEffect(() => { setFailed(false); }, [binding.id, binding.url]);

    useEffect(() => {
        if (binding.kind !== 'HLS' || !video.current) return;
        const element = video.current;
        let hls: Hls | undefined;
        if (element.canPlayType('application/vnd.apple.mpegurl')) element.src = binding.url;
        else if (Hls.isSupported()) {
            hls = new Hls();
            hls.loadSource(binding.url);
            hls.attachMedia(element);
            hls.on(Hls.Events.ERROR, (_, data) => { if (data.fatal) setFailed(true); });
        } else queueMicrotask(() => setFailed(true));
        const metadata = () => {
            if (Number.isFinite(element.duration) && resume.current < element.duration) element.currentTime = resume.current;
        };
        element.addEventListener('loadedmetadata', metadata);
        let last = 0;
        const progress = () => {
            if (Date.now() - last < 10000 || !Number.isFinite(element.duration)) return;
            last = Date.now();
            try {
                saveTitle({ target, name: currentName.current, position: element.currentTime });
            } catch { /* Playback remains available when browser storage is blocked. */ }
        };
        element.addEventListener('timeupdate', progress);
        return () => {
            element.removeEventListener('loadedmetadata', metadata);
            element.removeEventListener('timeupdate', progress);
            hls?.destroy();
            element.removeAttribute('src');
            element.load();
        };
    }, [binding.kind, binding.url, target]);

   return <>
        <div className="view-player">
          {binding.kind === 'HLS' ? (
  <video
    ref={video}
    controls
    playsInline
    preload="metadata"
    onError={() => setFailed(true)}
  />
) : (
<iframe
  src={binding.url}
  title={name}
  className="w-full h-full border-0"
  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
  allowFullScreen
  referrerPolicy="no-referrer"
  sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
/>
)}
        </div>
        {failed && <div role="alert"><p>{labels[locale].failed}</p><button onClick={retry}>{labels[locale].retry}</button></div>}
        <p>{binding.label}</p>
    </>;
}

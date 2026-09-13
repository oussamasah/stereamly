'use client';
import { useCallback, useEffect, useState } from 'react';
export type Binding = {
  id: string;
  target: string;
  label: string;
  kind: 'HLS' | 'EMBED';
  url: string;
  countries: string[];
  expiresAt: string;

  sandboxed?: boolean;
};
export type SportEvent = {
    id: string;
    title: string;
    sport: string;
    competition: string;
    startsAt: string;
    endsAt: string;
    status: string;
};
export type Channel = {
    id: string;
    slug: string;
    names: Record<string, string>;
    logoUrl?: string | null;
    languageCode: string;
    countryCode: string;
};
export type Snapshot = {
    version: number;
    validUntil: string;
    channels: Channel[];
    events: SportEvent[];
    bindings: Binding[];
    collections: {
        id: string;
        names: Record<string, string>;
        targets: string[];
    }[];
};
export type Title = {
    id: number;
    title?: string;
    name?: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    release_date?: string;
    first_air_date?: string;
    vote_average: number;
    media_type?: string;
    number_of_seasons?: number;
    seasons?: {
        season_number: number;
        name: string;
        episode_count: number;
    }[];
};
export type IptvChannel = {
    id?: string;
    name?: string;
    logo?: string;
    url?: string;
    languages?: string[];
    countries?: string[];
    categories?: string[];
};
const cache = new Map<string, { until: number; value: unknown }>();

async function json<T>(url: string, signal: AbortSignal): Promise<T> {
    const hit = cache.get(url);
    if (hit && hit.until > Date.now()) return hit.value as T;
    const request = new AbortController();
    const abort = () => request.abort();
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) request.abort();
    const timeout = setTimeout(abort, 12_000);
    try {
        const response = await fetch(url, { signal: request.signal });
        if (!response.ok) throw new Error(`REQUEST_${response.status}`);
        const value = await response.json() as T;
        if (cache.size >= 100) cache.delete(cache.keys().next().value!);
        cache.set(url, { value, until: Date.now() + 30_000 });
        return value;
    } finally {
        clearTimeout(timeout);
        signal.removeEventListener('abort', abort);
    }
}

export function useResource<T>(url: string | null, refresh = 0) {
    const [attempt, setAttempt] = useState(0);
    const [state, setState] = useState<{ url: string | null; data?: T; error?: string }>({ url: null });
    const retry = useCallback(() => { setState({ url }); setAttempt(value => value + 1); }, [url]);
    useEffect(() => {
        if (!url) return;
        const controller = new AbortController();
        const run = () => {
            void json<T>(url, controller.signal).then(data => {
                if (!controller.signal.aborted) setState({ url, data });
            }).catch(error => {
                if (!controller.signal.aborted) setState({ url, error: String(error) });
            });
        };
        run();
        const timer = refresh ? setInterval(run, refresh) : undefined;
        return () => { controller.abort(); clearInterval(timer); };
    }, [url, refresh, attempt]);
    return { ...(state.url === url ? state : { url }), retry };
}

export function usePlatform() {
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    return useResource<Snapshot>(`${api}/platform/snapshot`, 30_000);
}

export function tmdb(path: string, locale: string, query = '') {
    const key = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    if (!key) return null;
    const url = new URL(`https://api.themoviedb.org/3/${path}`);
    url.searchParams.set('api_key', key);
    url.searchParams.set('language', locale);
    url.searchParams.set('include_adult', 'false');
    if (query) url.searchParams.set('query', query);
    return url.toString();
}

export const IPTV_CATEGORIES = ['sports', 'news', 'movies'] as const;

export function iptvCategory(category: typeof IPTV_CATEGORIES[number]) {
    return `https://iptv-org.github.io/iptv/categories/${category}.json`;
}

export function encodeIptvUrl(url: string) {
    if (typeof window === 'undefined') return '';
    return window.btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeIptvUrl(value: string) {
    if (typeof window === 'undefined') return null;
    try {
        const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
        return window.atob(padded);
    } catch {
        return null;
    }
}

export function watchPath(locale: string, target: string) {
    const parts = target.split(':');
    if (parts[0] !== 'tmdb') return `/${locale}/watch/${parts[0]}/${parts[1]}`;
    const episode = parts.length > 3 ? `?season=${parts[4]}&episode=${parts[6]}` : '';
    return `/${locale}/watch/${parts[1]}/${parts[2]}${episode}`;
}

export function available(snapshot: Snapshot | undefined, target: string, country = 'ALL', now = Date.now()) {
    if (!snapshot || Date.parse(snapshot.validUntil) <= now) return [];
    return snapshot.bindings.filter(binding => binding.target === target &&
        Date.parse(binding.expiresAt) > now &&
        (binding.countries.includes('ALL') || binding.countries.includes(country)));
}

export function useNow() {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1_000);
        return () => clearInterval(timer);
    }, []);
    return now;
}

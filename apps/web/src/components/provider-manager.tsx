'use client';

import Hls from 'hls.js';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { adminFetch } from '../lib/admin-api';

type Provider = {
  id: string;
  name: string;
  slug: string;
  category: 'vod' | 'live' | 'sports';
  movieTemplate?: string | null;
  tvTemplate?: string | null;
  streamUrl?: string | null;
  isActive: boolean;
  rank: number;
};

type PlayerKind = 'IFRAME' | 'HLS';
type CreatorCategory = 'vod' | 'live';

const presets = [
  { label: '+ VidSrc', name: 'Server 1 (VidSrc)', slug: 'vidsrc', player: 'IFRAME' as PlayerKind, category: 'vod' as const, rank: 1, movieTemplate: 'https://vidsrc.me/embed/movie/{id}', tvTemplate: 'https://vidsrc.me/embed/tv/{id}/{s}/{e}', streamUrl: '' },
  { label: '+ VidLink', name: 'Server 2 (VidLink)', slug: 'vidlink', player: 'IFRAME' as PlayerKind, category: 'vod' as const, rank: 2, movieTemplate: 'https://vidlink.pro/movie/{id}', tvTemplate: 'https://vidlink.pro/tv/{id}/{s}/{e}', streamUrl: '' },
  { label: '+ 2Embed', name: 'Server 3 (2Embed)', slug: 'twoembed', player: 'IFRAME' as PlayerKind, category: 'vod' as const, rank: 3, movieTemplate: 'https://www.2embed.cc/embed/{id}', tvTemplate: 'https://www.2embed.cc/embedtv/{id}&s={s}&e={e}', streamUrl: '' },
  { label: '+ Custom HLS', name: 'Custom HLS Source', slug: 'custom-hls', player: 'HLS' as PlayerKind, category: 'live' as const, rank: 10, movieTemplate: '', tvTemplate: '', streamUrl: 'https://example.com/live.m3u8' },
];

const initial = {
  name: '',
  slug: '',
  category: 'vod' as CreatorCategory,
  player: 'IFRAME' as PlayerKind,
  urlTemplate: '',
  movieTemplate: '',
  tvTemplate: '',
  streamUrl: '',
  published: true,
  rank: 0,
};

function errorMessage(value: unknown) {
  const message = Array.isArray(value) ? value.join(', ') : String(value ?? 'Erreur inconnue');
  if (message.includes('AUTHENTICATION_REQUIRED') || message.includes('INVALID_ACCESS_TOKEN')) return 'Session expiree. Reconnectez-vous avec un compte administrateur.';
  if (message.includes('INSUFFICIENT_PERMISSION')) return 'Votre compte ne possede pas les droits requis.';
  if (message.includes('Unique constraint')) return 'Ce slug existe deja.';
  return message;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

function providerTemplate(provider: Provider | typeof initial) {
  return provider.movieTemplate || provider.tvTemplate || provider.streamUrl || '';
}

function resolveTemplate(template: string, testId: string) {
  return template.replaceAll('{id}', encodeURIComponent(testId || '550')).replaceAll('{s}', '1').replaceAll('{e}', '1');
}

export function ProviderManager() {
  const [items, setItems] = useState<Provider[]>([]);
  const [form, setForm] = useState(initial);
  const [editingId, setEditingId] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [testId, setTestId] = useState('550');
  const [preview, setPreview] = useState<{ url: string; player: PlayerKind; label: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await adminFetch('/admin/providers');
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setMessage(errorMessage(body.message));
        setItems([]);
        return;
      }
      setItems(await response.json());
    } catch {
      setMessage('API indisponible. Verifiez que le serveur est demarre.');
      setItems([]);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const nextRank = useMemo(() => Math.max(0, ...items.map(item => item.rank)) + 1, [items]);

  function patch(next: Partial<typeof initial>) {
    setForm(old => {
      const category = next.category ?? old.category;
      const urlTemplate = next.urlTemplate ?? old.urlTemplate;
      return {
        ...old,
        ...next,
        category,
        urlTemplate,
        movieTemplate: category === 'vod' && 'urlTemplate' in next ? urlTemplate : next.movieTemplate ?? old.movieTemplate,
        tvTemplate: category === 'vod' && 'urlTemplate' in next ? old.tvTemplate || urlTemplate : next.tvTemplate ?? old.tvTemplate,
        streamUrl: category === 'live' && 'urlTemplate' in next ? urlTemplate : next.streamUrl ?? old.streamUrl,
      };
    });
  }

  function selectCategory(category: CreatorCategory) {
    patch({ category, player: category === 'live' ? 'HLS' : 'IFRAME', urlTemplate: category === 'live' ? form.streamUrl : form.movieTemplate || form.tvTemplate });
  }

  function applyPreset(preset: typeof presets[number]) {
    setForm({ name: preset.name, slug: preset.slug, category: preset.category, player: preset.player, urlTemplate: preset.movieTemplate || preset.streamUrl, movieTemplate: preset.movieTemplate, tvTemplate: preset.tvTemplate, streamUrl: preset.streamUrl, published: true, rank: preset.rank });
    setMessage(`${preset.label.slice(2)} ready to save.`);
  }

  function edit(item: Provider) {
    const category: CreatorCategory = item.category === 'vod' ? 'vod' : 'live';
    const template = providerTemplate(item);
    setEditingId(item.id);
    setForm({ name: item.name, slug: item.slug, category, player: /\.m3u8($|[?#])/i.test(template) ? 'HLS' : 'IFRAME', urlTemplate: template, movieTemplate: item.movieTemplate ?? '', tvTemplate: item.tvTemplate ?? '', streamUrl: item.streamUrl ?? '', published: item.isActive, rank: item.rank });
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    setEditingId('');
    setForm({ ...initial, rank: nextRank });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy('save');
    setMessage('');
    const body = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      category: form.category === 'vod' ? 'vod' : 'live',
      movieTemplate: form.category === 'vod' ? form.movieTemplate || form.urlTemplate || undefined : undefined,
      tvTemplate: form.category === 'vod' ? form.tvTemplate || undefined : undefined,
      streamUrl: form.category === 'live' ? form.streamUrl || form.urlTemplate || undefined : undefined,
      isActive: form.published,
      rank: Number(form.rank) || nextRank,
    };
    try {
      const response = await adminFetch(editingId ? `/admin/providers/${editingId}` : '/admin/providers', { method: editingId ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({}));
      setMessage(response.ok ? (editingId ? 'Source updated.' : 'Source saved.') : errorMessage(result.message));
      if (response.ok) {
        setEditingId('');
        setForm({ ...initial, rank: nextRank + 1 });
        await load();
      }
    } catch {
      setMessage('Enregistrement impossible. Verifiez la connexion a l API.');
    } finally {
      setBusy('');
    }
  }

  async function toggle(item: Provider) {
    setBusy(item.id);
    const { id: _id, ...body } = item;
    try {
      const response = await adminFetch(`/admin/providers/${item.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, isActive: !item.isActive }) });
      const result = await response.json().catch(() => ({}));
      setMessage(response.ok ? `${item.name} ${item.isActive ? 'disabled' : 'enabled'}.` : errorMessage(result.message));
      await load();
    } catch {
      setMessage('Mise a jour impossible.');
    } finally {
      setBusy('');
    }
  }

  async function remove(item: Provider) {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    setBusy(item.id);
    try {
      const response = await adminFetch(`/admin/providers/${item.id}`, { method: 'DELETE' });
      const result = await response.json().catch(() => ({}));
      setMessage(response.ok ? 'Source deleted.' : errorMessage(result.message));
      if (response.ok) await load();
    } catch {
      setMessage('Suppression impossible.');
    } finally {
      setBusy('');
    }
  }

  function startPreview(template = form.urlTemplate || providerTemplate(form), player = form.player, label = form.name || 'Stream test') {
    try {
      const parsed = new URL(resolveTemplate(template, testId));
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('INVALID_URL');
      setPreview({ url: parsed.toString(), player, label });
    } catch {
      setMessage('Ajoutez une URL valide avant de tester.');
    }
  }

  return <div className="provider-admin-grid">
    <section className="card provider-creator">
      <div className="section-copy"><h2>{editingId ? 'Edit Source' : 'Quick Source Creator'}</h2><p className="muted">Pick a preset, adjust the label, save.</p></div>
      <div className="source-mode" role="group" aria-label="Source category"><button type="button" className={form.category === 'vod' ? 'active' : ''} onClick={() => selectCategory('vod')}>VOD (Movies & Series)</button><button type="button" className={form.category === 'live' ? 'active' : ''} onClick={() => selectCategory('live')}>Live TV / Sports</button></div>
      <div className="source-actions">{presets.map(preset => <button type="button" className="button secondary" key={preset.label} onClick={() => applyPreset(preset)}>{preset.label}</button>)}</div>
      <form onSubmit={submit}>
        <label>Source Label<input required minLength={2} value={form.name} placeholder="Server 1" onChange={event => patch({ name: event.target.value, slug: form.slug || slugify(event.target.value) })} /></label>
        <label>URL Template<input required inputMode="url" value={form.urlTemplate} placeholder={form.category === 'vod' ? 'https://example.com/movie/{id}' : 'https://example.com/live.m3u8'} onChange={event => patch({ urlTemplate: event.target.value })} /></label>
        <div className="helper-tags"><span>{'{id}'}</span><span>{'{s}'}</span><span>{'{e}'}</span></div>
        <label className="checkbox"><input type="checkbox" checked={form.published} onChange={event => patch({ published: event.target.checked })} />Published</label>
        <details><summary>Advanced & Compliance Meta</summary><div className="form-grid"><label>Slug<input required pattern="[a-z0-9-]+" value={form.slug} onChange={event => patch({ slug: event.target.value })} /></label><label>Rank<input type="number" min={0} max={10000} value={form.rank || nextRank} onChange={event => patch({ rank: Number(event.target.value) })} /></label><label>Player Type<select value={form.player} onChange={event => patch({ player: event.target.value as PlayerKind })}><option>IFRAME</option><option>HLS</option></select></label><label>API Category<select value={form.category} onChange={event => patch({ category: event.target.value as CreatorCategory })}><option value="vod">VOD</option><option value="live">Live</option></select></label><label className="wide">Movie Template<input inputMode="url" value={form.movieTemplate} onChange={event => patch({ movieTemplate: event.target.value })} /></label><label className="wide">TV Template<input inputMode="url" value={form.tvTemplate} onChange={event => patch({ tvTemplate: event.target.value })} /></label><label className="wide">Direct HLS URL<input inputMode="url" value={form.streamUrl} onChange={event => patch({ streamUrl: event.target.value })} /></label><label className="wide">Permission evidence URL<input inputMode="url" placeholder="Optional compliance reference" /></label><label>Review expires<input type="datetime-local" /></label><label>Region limits<input placeholder="ALL, US, FR" /></label></div></details>
        <div className="source-actions"><button className="button" disabled={!!busy}>{busy === 'save' ? 'Saving...' : 'Save source'}</button><button type="button" className="button secondary" disabled={!form.urlTemplate} onClick={() => startPreview()}>Test Stream</button>{editingId && <button type="button" className="button secondary" disabled={!!busy} onClick={reset}>Cancel</button>}</div>
        <p className={message.toLowerCase().includes('impossible') || message.toLowerCase().includes('requis') || message.toLowerCase().includes('valide') ? 'error' : ''} aria-live="polite">{message}</p>
      </form>
    </section>
    <section className="provider-bench">
      <div className="card"><div className="decoder-toolbar"><h2>Active Sources</h2><button type="button" className="button secondary" onClick={() => void load()}>Refresh</button></div><div className="provider-table"><table><thead><tr><th>Name</th><th>Category</th><th>Rank</th><th>Active</th><th>Actions</th></tr></thead><tbody>{items.length === 0 ? <tr><td colSpan={5}>No sources saved.</td></tr> : items.map(item => <tr key={item.id}><td>{item.name}</td><td>{item.category.toUpperCase()}</td><td>{item.rank}</td><td><label className="switch"><input type="checkbox" checked={item.isActive} disabled={busy === item.id} onChange={() => void toggle(item)} /><span>{item.isActive ? 'On' : 'Off'}</span></label></td><td><div className="source-actions"><button type="button" className="button secondary" disabled={!!busy} onClick={() => edit(item)}>Edit</button><button type="button" className="button danger" disabled={!!busy} onClick={() => remove(item)}>Delete</button></div></td></tr>)}</tbody></table></div></div>
      <div className="card"><div className="decoder-toolbar"><h2>Test Bench</h2><label>Test TMDB ID<input value={testId} onChange={event => setTestId(event.target.value)} /></label></div><div className="source-actions"><button type="button" className="button" disabled={!form.urlTemplate} onClick={() => startPreview()}>Test Form URL</button>{items.slice(0, 4).map(item => { const template = providerTemplate(item); return <button type="button" className="button secondary" key={item.id} onClick={() => startPreview(template, /\.m3u8($|[?#])/i.test(template) ? 'HLS' : 'IFRAME', item.name)}>{item.name}</button>; })}</div><div className="view-player provider-preview">{preview ? preview.player === 'HLS' ? <HlsPreview src={preview.url} /> : <iframe src={preview.url} title={preview.label} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen referrerPolicy="origin" sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-modals allow-storage-access-by-user-activation" /> : <p className="muted">Choose a source and test it here.</p>}</div></div>
    </section>
  </div>;
}

function HlsPreview({ src }: { src: string }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    let hls: Hls | undefined;
    if (element.canPlayType('application/vnd.apple.mpegurl')) element.src = src;
    else if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(element);
    }
    return () => {
      hls?.destroy();
      element.removeAttribute('src');
      element.load();
    };
  }, [src]);
  return <video ref={video} controls playsInline preload="metadata" />;
}

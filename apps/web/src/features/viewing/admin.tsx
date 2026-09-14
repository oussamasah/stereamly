'use client';
import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { Locale } from '../../i18n';
import { useAuth } from '../../components/auth-provider';
import { adminFetch } from '../../lib/admin-api';
import { Binding, SportEvent, useNow } from './data';
type AdminBinding = Binding & {
    enabled: boolean;
    evidenceUrl: string;
};
type Overview = {
    bindings: AdminBinding[];
    events: (SportEvent & {
        published: boolean;
    })[];
    collections: {
        id: string;
        names: Record<string, string>;
        targets: string[];
        position: number;
        published: boolean;
    }[];
    channels: number;
    sources: {
        status: string;
        _count: {
            _all: number;
        };
    }[];
    audits: {
        id: string;
        action: string;
        entityId: string;
        createdAt: string;
    }[];
};
const blankBinding = { target: '', label: '', kind: 'HLS', url: '', countries: 'ALL', evidenceUrl: '', expiresAt: '', enabled: false, rightsConfirmed: false, browserConfirmed: false };
const blankEvent = { title: '', sport: '', competition: '', startsAt: '', endsAt: '', status: 'SCHEDULED', published: false };
const blankCollection = { en: '', fr: '', ar: '', targets: '', position: 0, published: false };
export function PlatformAdmin({ locale }: {
    locale: Locale;
}) {
    const now = useNow();
    const { user } = useAuth();
    const canManageSources = user?.role === 'SUPER_ADMIN' || user?.role === 'TECHNICAL_ADMIN';
    const [data, setData] = useState<Overview>();
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const [binding, setBinding] = useState(blankBinding);
    const [bindingId, setBindingId] = useState('');
    const [event, setEvent] = useState(blankEvent);
    const [eventId, setEventId] = useState('');
    const [collection, setCollection] = useState(blankCollection);
    const [collectionId, setCollectionId] = useState('');
    const [channelSearch, setChannelSearch] = useState('');
    const [channels, setChannels] = useState<{
        id: string;
        names: Record<string, string>;
    }[]>([]);
    async function refresh() { const r = await adminFetch('/admin/platform'); if (!r.ok)
        throw new Error('Unable to load administration'); setData(await r.json()); }
    useEffect(() => { void Promise.resolve().then(refresh).catch(e => setMessage(String(e))); }, []);
    async function mutation(path: string, value: unknown, method = 'POST') { setBusy(true); setMessage(''); try {
        const r = await adminFetch(`/admin/platform/${path}`, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(value) });
        if (!r.ok) {
            const body = await r.json();
            throw new Error(Array.isArray(body.message) ? body.message.join(', ') : body.message || 'Save failed');
        }
        await refresh();
        setMessage('Saved successfully. Public changes appear within one minute.');
        return true;
    }
    catch (e) {
        setMessage(e instanceof Error ? e.message : 'Save failed');
        return false;
    }
    finally {
        setBusy(false);
    } }
    async function submitBinding(e: FormEvent) { e.preventDefault(); if (await mutation(`bindings${bindingId ? `/${bindingId}` : ''}`, { ...binding, countries: binding.countries.split(',').map(c => c.trim().toUpperCase()), expiresAt: new Date(binding.expiresAt).toISOString() }, bindingId ? 'PATCH' : 'POST')) {
        setBinding(blankBinding);
        setBindingId('');
    } }
    async function submitEvent(e: FormEvent) { e.preventDefault(); if (await mutation(`events${eventId ? `/${eventId}` : ''}`, { ...event, startsAt: new Date(event.startsAt).toISOString(), endsAt: new Date(event.endsAt).toISOString() }, eventId ? 'PATCH' : 'POST')) {
        setEvent(blankEvent);
        setEventId('');
    } }
    const datetime = (value: string) => { const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
    return <div className="view-shell"><span className="view-eyebrow">STREAMLY / ADMINISTRATION</span><h1>Platform control</h1><p>Publish free viewing sources, manage sports schedules and curate discovery. Existing source credentials remain in the source vault.</p><div className="view-actions">{canManageSources && <><Link className="button secondary" href={`/${locale}/admin/sources`}>Source vault</Link><Link className="button secondary" href={`/${locale}/admin/imports`}>Live imports</Link></>}{user?.role === 'SUPER_ADMIN' && <Link href={`/${locale}/admin/users`}>User access</Link>}<Link href={`/${locale}`}>View platform ↗</Link></div>{message && <p className="platform-status" role="status">{message}</p>}{!data ? <p>Loading administration…</p> : <><div className="view-grid view-grid-wide">{[[data.bindings.filter(b => b.enabled && Date.parse(b.expiresAt) > now).length, 'Active sources'], [data.events.filter(e => e.published).length, 'Published events'], [data.channels, 'Imported channels'], [data.sources.reduce((s, x) => s + x._count._all, 0), 'Source accounts']].map(([count, label]) => <div className="view-tile" key={label}><strong>{count}</strong>{label}</div>)}</div>
 <div className="platform-admin-grid"><section><h2>{bindingId ? 'Edit' : 'Add'} viewing source</h2><p>Use a public HTTPS HLS playlist or an official YouTube/Vimeo embed. Query tokens, account URLs and private hostnames are rejected. Confirm browser playback before publishing.</p><form className="view-search" onSubmit={async (e) => { e.preventDefault(); try {
            const r = await adminFetch(`/admin/platform/channels?search=${encodeURIComponent(channelSearch)}`);
            if (!r.ok)
                throw new Error('Channel search failed');
            setChannels(await r.json());
        }
        catch (e) {
            setMessage(String(e));
        } }}><input placeholder="Find an imported channel" aria-label="Find an imported channel" value={channelSearch} onChange={e => setChannelSearch(e.target.value)}/><button>Find</button></form>{channels.length > 0 && <label>Choose channel<select onChange={e => setBinding({ ...binding, target: `channel:${e.target.value}` })} defaultValue=""><option value="" disabled>Select a channel</option>{channels.map(c => <option key={c.id} value={c.id}>{c.names[locale] || c.names.en || c.id}</option>)}</select></label>}<form className="platform-form" onSubmit={submitBinding}><label>Target reference<input required value={binding.target} placeholder="Movie, series, channel or event reference" onChange={e => setBinding({ ...binding, target: e.target.value })}/></label><small>Choose the exact catalogue reference, then copy event references from the schedule below.</small><label>Source label<input required minLength={2} maxLength={100} value={binding.label} onChange={e => setBinding({ ...binding, label: e.target.value })}/></label><label>Player<select value={binding.kind} onChange={e => setBinding({ ...binding, kind: e.target.value })}>{['HLS', 'YOUTUBE', 'VIMEO'].map(k => <option key={k}>{k}</option>)}</select></label><label>Playback URL<input type="url" required value={binding.url} onChange={e => setBinding({ ...binding, url: e.target.value })}/></label><label>Regions (ALL or country codes separated by commas)<input required value={binding.countries} onChange={e => setBinding({ ...binding, countries: e.target.value })}/></label><label>Permission / public distribution evidence URL<input type="url" required value={binding.evidenceUrl} onChange={e => setBinding({ ...binding, evidenceUrl: e.target.value })}/></label><label>Review expires (your local time)<input type="datetime-local" required value={binding.expiresAt} onChange={e => setBinding({ ...binding, expiresAt: e.target.value })}/></label>{(['rightsConfirmed', 'browserConfirmed', 'enabled'] as const).map(key => <label key={key}><input type="checkbox" checked={binding[key]} onChange={e => setBinding({ ...binding, [key]: e.target.checked })}/>{{ rightsConfirmed: 'I verified free distribution permission for these regions', browserConfirmed: 'I verified playback in a browser', enabled: 'Publish this source' }[key]}</label>)}<button className="button" disabled={busy}>Save source</button>{bindingId && <button type="button" onClick={() => { setBinding(blankBinding); setBindingId(''); }}>Cancel edit</button>}</form></section>
 <section><h2>{eventId ? 'Edit' : 'Add'} sports event</h2><p>Schedule times are entered in your timezone and stored in UTC. Set LIVE only after confirming the broadcast.</p><form className="platform-form" onSubmit={submitEvent}>{(['title', 'sport', 'competition'] as const).map(key => <label key={key}>{key}<input required minLength={2} value={event[key]} onChange={e => setEvent({ ...event, [key]: e.target.value })}/></label>)}{(['startsAt', 'endsAt'] as const).map(key => <label key={key}>{key}<input type="datetime-local" required value={event[key]} onChange={e => setEvent({ ...event, [key]: e.target.value })}/></label>)}<label>Status<select value={event.status} onChange={e => setEvent({ ...event, status: e.target.value })}>{['SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED', 'CANCELLED'].map(s => <option key={s}>{s}</option>)}</select></label><label><input type="checkbox" checked={event.published} onChange={e => setEvent({ ...event, published: e.target.checked })}/>Publish schedule</label><button className="button" disabled={busy}>Save event</button>{eventId && <button type="button" onClick={() => { setEvent(blankEvent); setEventId(''); }}>Cancel edit</button>}</form>
 <h2>{collectionId ? 'Edit' : 'Add'} featured collection</h2><form className="platform-form" onSubmit={async (e) => { e.preventDefault(); if (await mutation(`collections${collectionId ? `/${collectionId}` : ''}`, { names: { en: collection.en, fr: collection.fr, ar: collection.ar }, targets: collection.targets.split('\n').map(s => s.trim()).filter(Boolean), position: collection.position, published: collection.published }, collectionId ? 'PATCH' : 'POST')) {
            setCollection(blankCollection);
            setCollectionId('');
        } }}>{(['en', 'fr', 'ar'] as const).map(l => <label key={l}>Name ({l})<input required maxLength={120} value={collection[l]} onChange={e => setCollection({ ...collection, [l]: e.target.value })}/></label>)}<label>Target references (one per line, maximum 40)<textarea required value={collection.targets} onChange={e => setCollection({ ...collection, targets: e.target.value })}/></label><label>Position<input type="number" min={0} max={1000} value={collection.position} onChange={e => setCollection({ ...collection, position: Number(e.target.value) })}/></label><label><input type="checkbox" checked={collection.published} onChange={e => setCollection({ ...collection, published: e.target.checked })}/>Publish collection</label><button className="button" disabled={busy}>Save collection</button>{collectionId && <button type="button" onClick={() => { setCollection(blankCollection); setCollectionId(''); }}>Cancel edit</button>}</form></section></div>
 <section className="platform-table"><h2>Viewing sources</h2><table><thead><tr><th>Source</th><th>Target</th><th>Status</th><th>Actions</th></tr></thead><tbody>{data.bindings.map(b => <tr key={b.id}><td>{b.label}</td><td><code>{b.target}</code></td><td>{Date.parse(b.expiresAt) < now ? 'Expired' : b.enabled ? 'Published' : 'Draft'}</td><td><button disabled={busy} onClick={() => { setBindingId(b.id); setBinding({ target: b.target, label: b.label, kind: b.kind, url: b.url, evidenceUrl: b.evidenceUrl, enabled: b.enabled, countries: b.countries.join(','), expiresAt: datetime(b.expiresAt), rightsConfirmed: false, browserConfirmed: false }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button> <button disabled={busy} onClick={() => void mutation(`bindings/${b.id}/enabled`, { enabled: !b.enabled }, 'PATCH')}>{b.enabled ? 'Disable' : 'Enable'}</button></td></tr>)}</tbody></table></section>
 <section className="platform-table"><h2>Sports schedule</h2><table><thead><tr><th>Event</th><th>Reference</th><th>Status</th><th>Actions</th></tr></thead><tbody>{data.events.map(e => <tr key={e.id}><td>{e.title}<br />{new Date(e.startsAt).toLocaleString(locale)}</td><td><code>event:{e.id}</code></td><td>{e.status} · {e.published ? 'Published' : 'Draft'}</td><td><button onClick={() => { setEventId(e.id); setEvent({ title: e.title, sport: e.sport, competition: e.competition, status: e.status, published: e.published, startsAt: datetime(e.startsAt), endsAt: datetime(e.endsAt) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button> <button onClick={() => setBinding({ ...blankBinding, target: `event:${e.id}` })}>Add source</button></td></tr>)}</tbody></table></section><section><h2>Collections</h2>{data.collections.map(c => <p key={c.id}>{c.names[locale]} · {c.published ? 'Published' : 'Draft'} <button onClick={() => { setCollectionId(c.id); setCollection({ en: c.names.en, fr: c.names.fr, ar: c.names.ar, targets: c.targets.join('\n'), position: c.position, published: c.published }); }}>Edit</button></p>)}</section><section><h2>Recent activity</h2>{data.audits.map(a => <p key={a.id}><time>{new Date(a.createdAt).toLocaleString(locale)}</time> · {a.action} · <code>{a.entityId}</code></p>)}</section></>}</div>;
}

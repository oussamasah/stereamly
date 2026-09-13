'use client';
import { useEffect, useState } from 'react';
import { adminFetch } from '../../lib/admin-api';
type Job = {
    id: string;
    status: string;
    progress: number;
    scope: string[];
    source: {
        name: string;
    };
    totalItems: number;
    errorCode?: string;
    stagedItems?: {
        id: string;
        displayName: string;
        kind: string;
        changeType: string;
        selected: boolean;
    }[];
};
type Source = {
    id: string;
    name: string;
    status: string;
    enabled: boolean;
};
export function LiveImports() {
    const [sources, setSources] = useState<Source[]>([]);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [source, setSource] = useState('');
    const [selected, setSelected] = useState<Job>();
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    async function refresh() { const responses = await Promise.all([adminFetch('/admin/sources'), adminFetch('/admin/imports')]); if (responses.some(r => !r.ok))
        throw new Error('Could not load live imports'); const [a, b] = await Promise.all(responses.map(r => r.json())); setSources(a); setJobs(b); }
    useEffect(() => { void Promise.resolve().then(refresh).catch(e => setMessage(String(e))); const timer = setInterval(() => void refresh().catch(e => setMessage(String(e))), 5000); return () => clearInterval(timer); }, []);
    async function action(path: string, body?: unknown) { setBusy(true); try {
        const r = await adminFetch(`/admin/imports/${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
        if (!r.ok) {
            const e = await r.json();
            throw new Error(e.message || 'Import action failed');
        }
        await refresh();
        setMessage('Saved. Applied channels remain drafts until you approve a public viewing source.');
        setSelected(undefined);
    }
    catch (e) {
        setMessage(String(e));
    }
    finally {
        setBusy(false);
    } }
    return <section className="view-shell"><h1>Live channel imports</h1><p>M3U, Portal and Xtream adapters import channel metadata into drafts. Existing movie and series imports are retained as archives. Publish browser-compatible sources from Platform control.</p><div className="view-actions"><select aria-label="Source" value={source} onChange={e => setSource(e.target.value)}><option value="">Choose a ready source</option>{sources.filter(s => s.enabled && s.status === 'READY').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select><button disabled={!source || busy} onClick={() => void action(`source/${source}`, { scope: ['LIVE'] })}>Import live channels</button></div>{message && <p role="status">{message}</p>}<div className="platform-table"><table><thead><tr><th>Source</th><th>Status</th><th>Items</th><th>Actions</th></tr></thead><tbody>{jobs.map(j => <tr key={j.id}><td>{j.source.name}</td><td>{j.status} · {j.progress}% {j.scope.some(s => s !== 'LIVE') && ' · Legacy archive'}<br />{j.errorCode}</td><td>{j.totalItems}</td><td>{j.scope.length === 1 && j.scope[0] === 'LIVE' && j.status === 'PREVIEW' && <button disabled={busy} onClick={async () => { try {
        const r = await adminFetch(`/admin/imports/${j.id}`);
        if (!r.ok)
            throw new Error('Preview failed');
        setSelected(await r.json());
    }
    catch (e) {
        setMessage(String(e));
    } }}>Review</button>}{['QUEUED', 'CONNECTING', 'DOWNLOADING', 'PARSING', 'STAGING', 'APPLYING'].includes(j.status) && <button disabled={busy} onClick={() => void action(`${j.id}/cancel`)}>Cancel</button>}</td></tr>)}</tbody></table></div>{selected && <section><h2>Review imported channels</h2><p>{selected.stagedItems?.filter(i => i.selected && i.kind === 'LIVE').length} selected. Conflicts and exclusions are not applied.</p><div className="view-actions"><button disabled={busy} onClick={async () => { await action(`${selected.id}/selection`, { selectedIds: selected.stagedItems?.filter(i => i.selected && i.kind === 'LIVE').map(i => i.id) }); }}>Save selection</button><button disabled={busy} onClick={async () => { setBusy(true); try {
        const r = await adminFetch(`/admin/imports/${selected.id}/selection`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ selectedIds: selected.stagedItems?.filter(i => i.selected && i.kind === 'LIVE').map(i => i.id) }) });
        if (!r.ok)
            throw new Error('Save selection failed');
        await action(`${selected.id}/apply`);
    }
    catch (e) {
        setMessage(String(e));
        setBusy(false);
    } }}>Apply selected channels</button></div><div style={{ maxHeight: 500, overflow: 'auto' }}>{selected.stagedItems?.filter(i => i.kind === 'LIVE').map(i => <label style={{ display: 'block', padding: 8 }} key={i.id}><input type="checkbox" disabled={['CONFLICT', 'EXCLUDED'].includes(i.changeType)} checked={i.selected} onChange={e => setSelected({ ...selected, stagedItems: selected.stagedItems?.map(item => item.id === i.id ? { ...item, selected: e.target.checked } : item) })}/> {i.displayName} · {i.changeType}</label>)}</div></section>}</section>;
}

'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../lib/admin-api';
import { AdminAction } from './admin-action';

type SourceType = 'M3U' | 'XTREAM' | 'PORTAL_MAC' | 'DIRECT';
type Source = { id: string; name: string; type: SourceType; status: string; baseUrl: string; allowedHosts: string[]; enabled: boolean; userAgent?: string; epgUrl?: string; regionCode?: string; priority: number; refreshIntervalMin: number; maxConcurrentStreams?: number; syncLive: boolean; syncMovies: boolean; syncSeries: boolean; syncEpg: boolean; preferHls: boolean; lastLatencyMs?: number; lastErrorCode?: string; secretFlags: Record<string, boolean> };
const initial = { name: '', type: 'M3U' as SourceType, baseUrl: '', allowedHosts: '', username: '', password: '', macAddress: '', serialNumber: '', deviceId: '', deviceId2: '', signature: '', userAgent: '', epgUrl: '', regionCode: '', priority: 100, refreshIntervalMin: 360, maxConcurrentStreams: '', syncLive: true, syncMovies: true, syncSeries: true, syncEpg: false, preferHls: true };

function errorMessage(value: unknown) {
  const message = Array.isArray(value) ? value.join(', ') : String(value ?? 'Erreur inconnue');
  if (message.includes('AUTHENTICATION_REQUIRED') || message.includes('INVALID_ACCESS_TOKEN')) return 'Session expirée. Reconnectez-vous avec un compte administrateur.';
  if (message.includes('INSUFFICIENT_PERMISSION')) return 'Votre compte ne possède pas le rôle TECHNICAL_ADMIN ou SUPER_ADMIN requis.';
  if (message.includes('M3U_FILE_EXTENSION_REQUIRED')) return 'Choisissez un fichier avec l’extension .m3u ou .m3u8.';
  if (message.includes('M3U_HEADER_MISSING')) return 'Fichier invalide : la première ligne doit contenir #EXTM3U.';
  if (message.includes('M3U_NO_ENTRIES')) return 'Le fichier ne contient aucune entrée #EXTINF.';
  if (message.includes('M3U_STREAM_URL_INVALID')) return 'Le fichier contient une adresse de flux invalide ou non HTTP(S).';
  if (message.includes('M3U_TOO_MANY_STREAM_HOSTS')) return 'La playlist utilise plus de 2 000 domaines de diffusion et dépasse la limite de sécurité.';
  if (message.includes('PORTAL_NOT_FOUND')) return 'Aucune API Portal compatible n’a été trouvée à cette adresse. Vérifiez le domaine et le chemin fourni par votre opérateur.';
  if (message.includes('PORTAL_FORMAT_UNSUPPORTED') || message.includes('PORTAL_RESPONSE_INVALID')) return 'Le serveur existe, mais son format Portal n’est pas compatible avec MAG/Stalker/Ministra.';
  if (message.includes('PORTAL_AUTH_FAILED') || message.includes('PORTAL_HANDSHAKE_REJECTED')) return 'Le portail répond, mais refuse cette adresse MAC ou cette identité d’appareil.';
  if (message.includes('PORTAL_UNREACHABLE')) return 'Le portail ne répond pas actuellement. Vérifiez le domaine, le port et la disponibilité réseau.';
  return message;
}

export function SourceManager() {
  const [form, setForm] = useState(initial);
  const [items, setItems] = useState<Source[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  const [m3uMode, setM3uMode] = useState<'url' | 'file'>('url');
  const [m3uFile, setM3uFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await adminFetch('/admin/sources');
      if (!response.ok) { const body = await response.json(); setMessage(errorMessage(body.message)); setItems([]); return; }
      setItems(await response.json());
    } catch { setMessage('API indisponible. Vérifiez que le serveur est démarré.'); setItems([]); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  function field(name: keyof typeof initial, value: string | boolean | number) { setForm(old => ({ ...old, [name]: value })); }

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy('create'); setMessage('');
    try {
      if (form.type === 'M3U' && m3uMode === 'file') {
        if (!m3uFile) { setMessage('Sélectionnez un fichier .m3u ou .m3u8.'); return; }
        const data = new FormData(); data.set('file', m3uFile); data.set('name', form.name);
        data.set('syncLive', String(form.syncLive)); data.set('syncMovies', String(form.syncMovies)); data.set('syncSeries', String(form.syncSeries));
        const response = await adminFetch('/admin/sources/upload-m3u', { method: 'POST', body: data });
        const result = await response.json();
        setMessage(response.ok ? 'Fichier M3U validé et enregistré. Vous pouvez maintenant activer la source.' : errorMessage(result.message));
        if (response.ok) { setForm(initial); setM3uFile(null); await load(); }
        return;
      }
      const host = (() => { try { return new URL(form.baseUrl).hostname; } catch { return ''; } })();
      const body = { ...form, allowedHosts: form.allowedHosts.split(',').map(value => value.trim()).filter(Boolean).concat(form.allowedHosts.trim() ? [] : host ? [host] : []), maxConcurrentStreams: form.maxConcurrentStreams ? Number(form.maxConcurrentStreams) : undefined, epgUrl: form.epgUrl || undefined, regionCode: form.regionCode || undefined, userAgent: form.userAgent || undefined, username: form.username || undefined, password: form.password || undefined, macAddress: form.macAddress || undefined, serialNumber: form.serialNumber || undefined, deviceId: form.deviceId || undefined, deviceId2: form.deviceId2 || undefined, signature: form.signature || undefined };
      const response = await adminFetch(editingId ? `/admin/sources/${editingId}` : '/admin/sources', { method: editingId ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      setMessage(response.ok ? (editingId ? 'Source modifiée. Testez-la puis réactivez-la.' : 'Source enregistrée en brouillon.') : errorMessage(result.message));
      if (response.ok) { setForm(initial); setEditingId(''); await load(); }
    } catch { setMessage('API indisponible. Vérifiez que le serveur est démarré.'); }
    finally { setBusy(''); }
  }

  async function action(id: string, name: 'test' | 'enable' | 'disable') {
    setBusy(id + name); setMessage('');
    try {
      const response = await adminFetch(`/admin/sources/${id}/${name}`, { method: 'POST' });
      const body = await response.json();
      setMessage(response.ok ? (name === 'test' ? `Test : ${body.outcome}` : `Source ${name === 'enable' ? 'activée' : 'désactivée'}.`) : errorMessage(body.message));
      await load();
    } catch { setMessage('API indisponible. Vérifiez que le serveur est démarré.'); }
    finally { setBusy(''); }
  }

  async function remove(item: Source) {
    const confirmed = window.confirm(`Supprimer définitivement « ${item.name} » ?\n\nLe fichier M3U, les imports, les chaînes, les médias, l’EPG et toutes les données exclusivement liées à cette source seront supprimés. Cette action est irréversible.`);
    if (!confirmed) return;
    setBusy(item.id + 'delete'); setMessage('Suppression de la source…');
    try {
      const response = await adminFetch(`/admin/sources/${item.id}`, { method: 'DELETE' });
      const body = await response.json();
      setMessage(response.ok ? `Source et données supprimées : ${body.channelsDeleted} chaîne(s), ${body.mediaDeleted} média(s).` : errorMessage(body.message));
      if (response.ok) await load();
    } catch { setMessage('Suppression impossible. Vérifiez la connexion à l’API.'); }
    finally { setBusy(''); }
  }

  function edit(item: Source) {
    setEditingId(item.id); setM3uMode('url'); setM3uFile(null); setMessage('Les secrets laissés vides seront conservés.');
    setForm({ ...initial, name:item.name, type:item.type, baseUrl:item.baseUrl, allowedHosts:item.allowedHosts.join(', '), userAgent:item.userAgent??'', epgUrl:item.epgUrl??'', regionCode:item.regionCode??'', priority:item.priority, refreshIntervalMin:item.refreshIntervalMin, maxConcurrentStreams:item.maxConcurrentStreams?String(item.maxConcurrentStreams):'', syncLive:item.syncLive, syncMovies:item.syncMovies, syncSeries:item.syncSeries, syncEpg:item.syncEpg, preferHls:item.preferHls });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() { setEditingId(''); setForm(initial); setM3uFile(null); setMessage('Modification annulée.'); }

  const isFileUpload = form.type === 'M3U' && m3uMode === 'file';
  return <div className="source-layout">
    <section><h2>Sources enregistrées</h2><div className="source-list">{items.length === 0 ? <p className="muted">Aucune source disponible.</p> : items.map(item => <article className="card source-card" key={item.id}><div><span className={`status status-${item.status.toLowerCase()}`}>{item.status}</span><h3>{item.name}</h3><p className="muted">{item.type} · {item.baseUrl.includes('uploaded-m3u.invalid') ? 'Fichier téléversé' : new URL(item.baseUrl).host}{item.lastLatencyMs !== null && item.lastLatencyMs !== undefined ? ` · ${item.lastLatencyMs} ms` : ''}</p>{item.lastErrorCode && <p className="error">{item.lastErrorCode}</p>}</div><div className="source-actions"><AdminAction help="Préremplit le formulaire. Les identifiants secrets restent protégés."><button type="button" className="button secondary" disabled={!!busy || item.baseUrl.includes('uploaded-m3u.invalid')} onClick={() => edit(item)}>Modifier</button></AdminAction><AdminAction help="Vérifie la connexion ou le fichier sans importer."><button type="button" className="button secondary" disabled={!!busy} onClick={() => action(item.id, 'test')}>Tester</button></AdminAction><AdminAction help="Autorise les prochains imports."><button type="button" className="button" disabled={!!busy || item.status !== 'READY'} onClick={() => action(item.id, 'enable')}>Activer</button></AdminAction><AdminAction help="Suspend les imports, sans supprimer."><button type="button" className="button secondary" disabled={!!busy || !item.enabled} onClick={() => action(item.id, 'disable')}>Désactiver</button></AdminAction><AdminAction help="Supprime définitivement le fichier, les imports et tous les contenus exclusivement liés."><button type="button" className="button danger" disabled={!!busy} onClick={() => remove(item)}>Supprimer</button></AdminAction></div></article>)}</div></section>
    <section className="card"><div className="section-copy"><h2>{editingId ? 'Modifier la source' : 'Ajouter une source'}</h2><Link href="./help#sources">Besoin d’aide ? Lire le guide</Link></div><form onSubmit={submit}>
      <div className="form-grid"><label>Nom<input required minLength={2} value={form.name} onChange={event => field('name', event.target.value)}/></label><label>Type<select value={form.type} onChange={event => field('type', event.target.value as SourceType)}><option>M3U</option><option>XTREAM</option><option value="PORTAL_MAC">Portal + MAC</option><option>DIRECT</option></select></label></div>
      {form.type === 'M3U' && <div className="source-mode" role="group" aria-label="Méthode d’ajout M3U"><button type="button" className={m3uMode === 'url' ? 'active' : ''} onClick={() => setM3uMode('url')}>Depuis une URL</button><button type="button" className={m3uMode === 'file' ? 'active' : ''} onClick={() => setM3uMode('file')}>Téléverser un fichier</button></div>}
      {isFileUpload ? <label className="file-drop">Fichier M3U ou M3U8<input type="file" accept=".m3u,.m3u8,application/vnd.apple.mpegurl,audio/x-mpegurl" required onChange={event => setM3uFile(event.target.files?.[0] ?? null)}/><span>{m3uFile ? `${m3uFile.name} · ${(m3uFile.size / 1024).toFixed(1)} Ko` : 'Taille maximale : 10 Mo'}</span></label> : <div className="form-grid"><label className="wide">URL de base<input required type="url" placeholder="https://provider.example/playlist.m3u" value={form.baseUrl} onChange={event => field('baseUrl', event.target.value)}/></label><label className="wide">Hôtes autorisés, séparés par virgule<input placeholder="provider.example, cdn.example" value={form.allowedHosts} onChange={event => field('allowedHosts', event.target.value)}/></label>{form.type === 'XTREAM' && <><label>Utilisateur<input required={!editingId || !items.find(item => item.id === editingId)?.secretFlags.username} autoComplete="off" placeholder={editingId ? 'Laisser vide pour conserver' : ''} value={form.username} onChange={event => field('username', event.target.value)}/></label><label>Mot de passe<input required={!editingId || !items.find(item => item.id === editingId)?.secretFlags.password} type="password" autoComplete="new-password" placeholder={editingId ? 'Laisser vide pour conserver' : ''} value={form.password} onChange={event => field('password', event.target.value)}/></label></>}{form.type === 'PORTAL_MAC' && <><label>Adresse MAC<input required={!editingId || !items.find(item => item.id === editingId)?.secretFlags.macAddress} placeholder={editingId ? 'Laisser vide pour conserver' : '00:1A:79:00:00:00'} value={form.macAddress} onChange={event => field('macAddress', event.target.value)}/></label><label>Série optionnelle<input placeholder={editingId ? 'Laisser vide pour conserver' : ''} value={form.serialNumber} onChange={event => field('serialNumber', event.target.value)}/></label><details className="wide"><summary>Identité avancée fournie par l’opérateur</summary><label>Device ID<input placeholder={editingId ? 'Laisser vide pour conserver' : ''} value={form.deviceId} onChange={event => field('deviceId', event.target.value)}/></label><label>Device ID 2<input placeholder={editingId ? 'Laisser vide pour conserver' : ''} value={form.deviceId2} onChange={event => field('deviceId2', event.target.value)}/></label><label>Signature<input type="password" placeholder={editingId ? 'Laisser vide pour conserver' : ''} value={form.signature} onChange={event => field('signature', event.target.value)}/></label></details></>}<label>URL EPG optionnelle<input type="url" value={form.epgUrl} onChange={event => field('epgUrl', event.target.value)}/></label><label>User-Agent optionnel<input value={form.userAgent} onChange={event => field('userAgent', event.target.value)}/></label></div>}
      <fieldset><legend>Contenus à importer</legend>{(['syncLive', 'syncMovies', 'syncSeries', 'syncEpg'] as const).map(key => <label className="checkbox" key={key}><input type="checkbox" checked={form[key]} disabled={isFileUpload && key === 'syncEpg'} onChange={event => field(key, event.target.checked)}/>{key.replace('sync', '')}</label>)}</fieldset>
      <div className="source-actions"><button className="button" disabled={!!busy}>{busy === 'create' ? 'Enregistrement…' : editingId ? 'Enregistrer les modifications' : isFileUpload ? 'Téléverser et valider' : 'Enregistrer puis tester'}</button>{editingId && <button type="button" className="button secondary" disabled={!!busy} onClick={cancelEdit}>Annuler</button>}</div>
      <p className={message.toLowerCase().includes('expirée') || message.toLowerCase().includes('requis') || message.toLowerCase().includes('invalide') ? 'error' : ''} aria-live="polite">{message}</p>
    </form></section>
  </div>;
}

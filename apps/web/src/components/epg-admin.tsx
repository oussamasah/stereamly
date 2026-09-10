'use client';

import { useState } from 'react';
import { AdminAction } from './admin-action';

const api = process.env.NEXT_PUBLIC_API_URL;
type Mapping = { externalChannelId: string; externalName?: string; channelId?: string };

export function EpgAdmin() {
  const [sourceId, setSourceId] = useState('');
  const [url, setUrl] = useState('');
  const [items, setItems] = useState<Mapping[]>([]);
  const [message, setMessage] = useState('');
  const headers = () => ({ authorization: `Bearer ${sessionStorage.getItem('accessToken') ?? ''}`, 'content-type': 'application/json' });

  async function load() {
    const response = await fetch(`${api}/admin/epg/sources/${sourceId}/mappings`, { headers: headers() });
    setItems(response.ok ? await response.json() : []);
  }

  async function run() {
    const response = await fetch(`${api}/admin/epg/sources/${sourceId}/import`, { method: 'POST', headers: headers(), body: JSON.stringify({ url }) });
    setMessage(response.ok ? 'Import XMLTV terminé' : (await response.json()).message);
    await load();
  }

  async function map(externalId: string, channelId: string) {
    const response = await fetch(`${api}/admin/epg/sources/${sourceId}/mappings/${encodeURIComponent(externalId)}`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ channelId }) });
    setMessage(response.ok ? 'Mapping corrigé sans réimport' : (await response.json()).message);
    await load();
  }

  return <section className="card commerce">
    <h2>Import et mappings EPG</h2>
    <input placeholder="ID source" value={sourceId} onChange={event => setSourceId(event.target.value)}/>
    <input placeholder="URL XMLTV autorisée" value={url} onChange={event => setUrl(event.target.value)}/>
    <div className="actions">
      <AdminAction help="Télécharge la grille XMLTV et met à jour les programmes."><button className="button" onClick={run}>Importer</button></AdminAction>
      <AdminAction help="Affiche les chaînes à associer ou à corriger."><button className="button secondary" onClick={load}>Charger les mappings</button></AdminAction>
    </div>
    {items.map(item => <div className="mapping-row" key={item.externalChannelId}><span>{item.externalName ?? item.externalChannelId} · {item.channelId ?? 'Non associé'}</span><input aria-label="ID chaîne cible" defaultValue={item.channelId ?? ''} onBlur={event => event.target.value && void map(item.externalChannelId, event.target.value)}/></div>)}
    <p aria-live="polite">{message}</p>
  </section>;
}

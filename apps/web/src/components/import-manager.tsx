'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { adminFetch } from '../lib/admin-api';

type Source = { id: string; name: string; type: string; enabled: boolean; status: string; syncLive?: boolean; syncMovies?: boolean; syncSeries?: boolean; syncEpg?: boolean };
type Category = { id: string; slug: string; names: Record<string, string> };
type ContentKind='LIVE'|'MOVIE'|'SERIES'|'DOCUMENTARY';
type ChannelItem = { id: string; kind?: string; displayName: string; groupName?: string; imageUrl?:string|null; status?:string; published?:boolean; normalized?: { logoUrl?: string; classificationConfidence?:number; classificationReason?:string[]; genres?:string[] }; availability?: {status:string;latencyMs?:number|null;circuitOpenUntil?:string|null}; channel: { id: string; status: string; webAvailable: boolean; logoUrl?: string; category: Category };mediaTitle?:{id:string;slug:string;type:string;status:string} };
type ChannelGroup = { name: string; value: string; count: number };
type ChannelPage = { items: ChannelItem[]; total: number; page: number; pageSize: number; pages: number; groups: ChannelGroup[] };
type ImportJob = { id: string; status: string; progress: number; totalItems?: number; addedItems?: number; updatedItems?: number; removedItems?: number; errorCode?: string | null; errorDetail?: string | null; stagedItems?: { id: string; kind: string; selected: boolean; changeType: string }[] };

function importFailureMessage(job: ImportJob) {
  const code = job.errorCode ?? job.errorDetail ?? '';
  if (code.includes('PORTAL_REQUEST_TIMEOUT')) return 'Le portail répond, mais son catalogue met trop de temps à être téléchargé. Réessayez dans quelques instants.';
  if (code.includes('PORTAL_AUTH_FAILED')) return 'Le portail refuse cette adresse MAC ou cette identité d’appareil.';
  if (code.includes('PORTAL_UNREACHABLE')) return 'Le portail est actuellement inaccessible depuis le serveur.';
  if (code.includes('PORTAL_RESPONSE_INVALID')) return 'Le portail répond dans un format invalide ou incompatible.';
  return code ? `La synchronisation a échoué (${code}).` : 'La synchronisation a échoué. Vérifiez la source.';
}

export function ImportManager() {
  const [sources, setSources] = useState<Source[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sourceId, setSourceId] = useState('');
  const [contentKind,setContentKind]=useState<ContentKind>('LIVE');
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [channelGroups, setChannelGroups] = useState<ChannelGroup[]>([]);
  const [channelGroup, setChannelGroup] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [focused, setFocused] = useState<ChannelItem | null>(null);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [countryCode, setCountryCode] = useState('ALL');
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const monitorToken = useRef(0);
  const failedPreviews = useRef(new Set<string>());
  const automaticPreviewAttempts = useRef(0);
  const automaticPreviewEnabled = useRef(false);

  const loadChannels = useCallback(async (id: string, requestedPage = 1, requestedSearch = '', requestedGroup = '') => {
    if (!id) return;
    const params = new URLSearchParams({ page: String(requestedPage), pageSize: '80' });
    if(contentKind!=='DOCUMENTARY')params.set('kind',contentKind);
    if(contentKind==='DOCUMENTARY')params.set('documentary','true');
    if (requestedSearch.trim()) params.set('search', requestedSearch.trim());
    if (requestedGroup) params.set('group', requestedGroup);
    const response = await adminFetch(`/admin/sources/${id}/library?${params}`);
    if (!response.ok) { setMessage((await response.json()).message ?? 'Impossible de charger les chaînes.'); return; }
    const result = await response.json() as ChannelPage;
    setChannels(result.items); setChannelGroups(result.groups); setPage(result.page); setPages(result.pages); setTotal(result.total);
    setFocused(current => result.items.find(item => item.id === current?.id) ?? result.items[0] ?? null);
  }, [contentKind]);

  const monitorImport = useCallback(async (initial: ImportJob, id: string) => {
    const token = ++monitorToken.current;
    setBusy('sync');
    try {
      let job = initial;
      const readJob = async () => {
        try {
          const response = await adminFetch(`/admin/imports/${job.id}?items=false`);
          return response.ok ? await response.json() as ImportJob : null;
        } catch { return null; }
      };
      job = await readJob() ?? job;
      for (let attempt = 0; attempt < 300 && !['PREVIEW', 'FAILED', 'CANCELLED', 'COMPLETED', 'PARTIAL'].includes(job.status); attempt++) {
        await new Promise(resolve => window.setTimeout(resolve, 2000));
        if (token !== monitorToken.current) return;
        const update = await readJob();
        if (!update) { setMessage('Connexion momentanément interrompue. Reprise du suivi…'); await new Promise(resolve => window.setTimeout(resolve, 3000)); continue; }
        job = update;
        const progress = Math.max(0, Math.min(100, Number(job.progress) || 0));
        setMessage(job.status === 'DOWNLOADING' && job.totalItems ? `Téléchargement ${progress}% · ${job.totalItems.toLocaleString('fr-FR')} chaînes reçues…` : `Synchronisation ${progress}%…`);
      }
      if (token !== monitorToken.current) return;
      if (job.status === 'COMPLETED') { await loadChannels(id); setMessage('Synchronisation terminée. Les chaînes sont disponibles.'); return; }
      if (job.status !== 'PREVIEW') { setMessage(job.status === 'FAILED' || job.status === 'PARTIAL' ? importFailureMessage(job) : 'La synchronisation a été annulée.'); return; }
      const changes = (job.addedItems ?? 0) + (job.updatedItems ?? 0) + (job.removedItems ?? 0);
      setMessage(changes ? `Application de ${changes.toLocaleString('fr-FR')} changement(s) en arrière-plan…` : 'Catalogue déjà à jour. Finalisation…');
      const apply = await adminFetch(`/admin/imports/${job.id}/apply`, { method: 'POST' });
      if (!apply.ok) throw new Error('IMPORT_APPLY_FAILED');
      job = await apply.json() as ImportJob;
      for (let attempt = 0; attempt < 900 && !['COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED'].includes(job.status); attempt++) {
        await new Promise(resolve => window.setTimeout(resolve, 2000));
        if (token !== monitorToken.current) return;
        const update = await readJob();
        if (!update) { setMessage('Connexion momentanément interrompue. Reprise du suivi…'); continue; }
        job = update; setMessage(`Création des brouillons ${Math.max(0, Math.min(100, Number(job.progress) || 0))}%…`);
      }
      if (job.status === 'COMPLETED') { await loadChannels(id); setMessage('Synchronisation terminée. Les chaînes sont disponibles.'); }
      else setMessage(job.status === 'PARTIAL' || job.status === 'FAILED' ? importFailureMessage(job) : 'La création des brouillons continue côté serveur.');
    } catch { if (token === monitorToken.current) setMessage('Suivi de la synchronisation interrompu. Le traitement continue côté serveur.'); }
    finally { if (token === monitorToken.current) setBusy(''); }
  }, [loadChannels]);

  const resumeImport = useCallback(async (id: string) => {
    const response = await adminFetch(`/admin/imports?sourceId=${encodeURIComponent(id)}`);
    if (!response.ok) return;
    const jobs = await response.json() as ImportJob[];
    const resumable = jobs.find(job => ['QUEUED', 'CONNECTING', 'DOWNLOADING', 'PARSING', 'STAGING', 'PREVIEW', 'APPLYING'].includes(job.status));
    if (resumable) await monitorImport(resumable, id);
  }, [monitorImport]);

  useEffect(() => { void (async () => {
    try {
      const [sourceResponse, categoryResponse] = await Promise.all([adminFetch('/admin/sources'), fetch(`${process.env.NEXT_PUBLIC_API_URL}/catalog/categories`)]);
      const sourceValues = sourceResponse.ok ? await sourceResponse.json() as Source[] : [];
      setSources(sourceValues); setCategories(categoryResponse.ok ? await categoryResponse.json() : []);
      const first = sourceValues[0]?.id ?? '';if(first){automaticPreviewEnabled.current=true;failedPreviews.current.clear();automaticPreviewAttempts.current=0;} setSourceId(first); if (first) { await loadChannels(first); await resumeImport(first); }
    } catch { setMessage('API indisponible.'); }
  })(); const tokenRef = monitorToken; return () => { tokenRef.current++; }; }, [loadChannels, resumeImport]);

  useEffect(() => {
    if (!sourceId) return;
    const timer = window.setTimeout(() => { void loadChannels(sourceId, 1, search, channelGroup); }, 300);
    return () => window.clearTimeout(timer);
  }, [sourceId, search, channelGroup, loadChannels]);
  const visible = useMemo(() => channels, [channels]);
  const activeSource = sources.find(source => source.id === sourceId);

  const previewUnavailable = useCallback(async (itemId: string, retryable: boolean) => {
    if (!automaticPreviewEnabled.current) return;
    if (!retryable) { automaticPreviewEnabled.current=false;setMessage('Le portail refuse la session entière. Recherche automatique suspendue pour éviter de multiplier les connexions.'); return; }
    failedPreviews.current.add(itemId); automaticPreviewAttempts.current++;
    if (automaticPreviewAttempts.current >= 12) { automaticPreviewEnabled.current=false;setMessage('Aucun aperçu fonctionnel trouvé après 12 essais. Vous pouvez choisir une autre chaîne manuellement.'); return; }
    const currentIndex = channels.findIndex(item => item.id === itemId);
    const next = channels.slice(Math.max(0, currentIndex + 1)).find(item => !failedPreviews.current.has(item.id)&&item.availability?.status!=='UNHEALTHY');
    if (next) { setMessage(`Flux indisponible. Essai automatique ${automaticPreviewAttempts.current + 1}/12 : ${next.displayName}…`); setFocused(next); return; }
    if (page < pages && sourceId) { setMessage(`Aucun flux valide sur cette page. Vérification de la page ${page + 1}…`); await loadChannels(sourceId, page + 1, search, channelGroup); return; }
    automaticPreviewEnabled.current=false;setMessage('Aucune chaîne fonctionnelle trouvée dans les chaînes vérifiées.');
  }, [channelGroup, channels, loadChannels, page, pages, search, sourceId]);

  const previewPlayable = useCallback((itemId: string) => {
    if(!automaticPreviewEnabled.current)return;
    automaticPreviewEnabled.current=false;
    const item = channels.find(channel => channel.id === itemId);
    setMessage(item ? `Premier aperçu disponible trouvé : ${item.displayName}. Le zapping automatique est arrêté.` : 'Aperçu disponible. Le zapping automatique est arrêté.');
  }, [channels]);

  useEffect(() => { failedPreviews.current.clear(); automaticPreviewAttempts.current = 0;automaticPreviewEnabled.current=Boolean(sourceId); }, [sourceId]);
  useEffect(()=>{setSelected([]);setFocused(null);setChannelGroup('');setPage(1);automaticPreviewEnabled.current=contentKind==='LIVE'&&Boolean(sourceId);},[contentKind,sourceId]);

  async function chooseSource(id: string) { monitorToken.current++; failedPreviews.current.clear(); automaticPreviewAttempts.current=0;automaticPreviewEnabled.current=true; setBusy(''); setSourceId(id); setSearch(''); setChannelGroup(''); setSelected([]); setMessage('Recherche du premier aperçu disponible…'); await loadChannels(id); await resumeImport(id); }
  async function changePage(next: number) { if (!sourceId || next < 1 || next > pages) return; await loadChannels(sourceId, next, search, channelGroup); }
  function focusManually(item:ChannelItem){automaticPreviewEnabled.current=false;failedPreviews.current.clear();automaticPreviewAttempts.current=0;setMessage('Chaîne sélectionnée manuellement.');setFocused(item);}
  function zap(direction: -1 | 1) { if (!channels.length) return; const index = Math.max(0, channels.findIndex(item => item.id === focused?.id)); focusManually(channels[(index + direction + channels.length) % channels.length]); }
  function toggle(id: string) { setSelected(old => old.includes(id) ? old.filter(value => value !== id) : [...old, id]); }
  function toggleAll() { const ids = visible.map(item => item.id); setSelected(old => ids.every(id => old.includes(id)) ? old.filter(id => !ids.includes(id)) : [...new Set([...old, ...ids])]); }

  async function synchronize() {
    if (!sourceId) return; setBusy('sync'); setMessage('Connexion à la source…');
    try {
      const scope = [activeSource?.syncLive !== false && 'LIVE', activeSource?.syncMovies && 'MOVIE', activeSource?.syncSeries && 'SERIES', activeSource?.syncEpg && 'EPG'].filter(Boolean);
      const start = await adminFetch(`/admin/imports/source/${sourceId}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ scope }) });
      const started = await start.json(); if (!start.ok) { setMessage(started.message ?? 'Synchronisation refusée.'); return; }
      await monitorImport(started as ImportJob, sourceId);
    } catch { setMessage('Synchronisation interrompue. Vérifiez la source et réessayez.'); }
    finally { if (!busy) setBusy(''); }
  }

  async function publish() {
    if (!selected.length || !rightsConfirmed) return;
    setBusy('publish'); setMessage('Publication en cours…');
    try {
      const response = await adminFetch(`/admin/sources/${sourceId}/library/publish`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ itemIds: selected, categoryId: contentKind==='LIVE'&&categoryId ? categoryId : undefined, countryCode: countryCode.toUpperCase(), rightsConfirmed }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.message ?? 'Publication refusée.'); return; }
      await loadChannels(sourceId, page, search, channelGroup); setRightsConfirmed(false);setSelected([]); setMessage(`${result.published} contenu(s) publié(s) pour ${countryCode.toUpperCase()}.`);
    } catch { setMessage('Publication impossible.'); }
    finally { setBusy(''); }
  }

  return <><nav className="toolbar source-content-tabs" aria-label="Types de contenus">{([['LIVE','Chaînes'],['MOVIE','Films'],['SERIES','Séries'],['DOCUMENTARY','Documentaires']] as [ContentKind,string][]).map(([value,label])=><button key={value} className={`button ${contentKind===value?'':'secondary'}`} onClick={()=>setContentKind(value)}>{label}</button>)}</nav><div className="decoder-shell">
    <aside className="decoder-sources"><div className="decoder-title"><p className="eyebrow">SOURCES</p><h2>Vos décodeurs</h2></div>{sources.map(source => <button className={`decoder-source ${source.id === sourceId ? 'active' : ''}`} key={source.id} onClick={() => chooseSource(source.id)}><span className={`source-dot ${source.enabled ? 'online' : ''}`}/><span><strong>{source.name}</strong><small>{source.type} · {source.status}</small></span><b>›</b></button>)}{!sources.length && <p className="muted">Ajoutez d’abord une source IPTV.</p>}<div className="decoder-groups"><p className="eyebrow">CATÉGORIES</p><button className={!channelGroup ? 'active' : ''} onClick={() => setChannelGroup('')}><span>Toutes les chaînes</span><b>{channelGroups.reduce((sum, group) => sum + group.count, 0).toLocaleString('fr-FR')}</b></button>{channelGroups.map(group => <button className={channelGroup === group.value ? 'active' : ''} key={`${group.value}-${group.name}`} onClick={() => setChannelGroup(group.value)}><span>{group.name}</span><b>{group.count.toLocaleString('fr-FR')}</b></button>)}</div></aside>
    <section className="decoder-list"><div className="decoder-toolbar"><div><p className="eyebrow">CHAÎNES</p><h2>{activeSource?.name ?? 'Sélectionnez une source'}</h2><small>{total.toLocaleString('fr-FR')} chaîne{total > 1 ? 's' : ''}</small></div><button className="button compact" disabled={!activeSource?.enabled || activeSource.status !== 'READY' || !!busy} onClick={synchronize}>{busy === 'sync' ? 'Synchronisation…' : 'Synchroniser'}</button></div><input className="decoder-search" type="search" placeholder="Rechercher une chaîne" value={search} onChange={event => setSearch(event.target.value)}/><label className="decoder-select-all"><input type="checkbox" checked={visible.length > 0 && visible.every(item => selected.includes(item.id))} onChange={toggleAll}/>Sélectionner cette page ({visible.length})</label><div className="decoder-channels">{visible.map(item => <article className={`decoder-channel ${focused?.id === item.id ? 'focused' : ''}`} key={item.id} tabIndex={0} onKeyDown={event => { if (event.key === 'Enter') focusManually(item); }} onClick={() => focusManually(item)}><input aria-label={`Sélectionner ${item.displayName}`} type="checkbox" checked={selected.includes(item.id)} onClick={event => event.stopPropagation()} onChange={() => toggle(item.id)}/><ChannelLogo item={item}/><span><strong>{item.displayName}</strong><small>{item.groupName ?? item.channel.category.names.fr ?? item.channel.category.slug}</small></span><span className={`status status-${item.channel.status.toLowerCase()}`}>{item.channel.status}</span></article>)}{activeSource && !visible.length && <div className="decoder-empty"><span>▦</span><h3>Aucune chaîne trouvée</h3><p>Changez la catégorie ou effacez la recherche.</p></div>}</div><nav className="decoder-pagination" aria-label="Pages des chaînes"><button disabled={page <= 1} onClick={() => changePage(page - 1)}>← Précédent</button><span>Page {page} / {pages}</span><button disabled={page >= pages} onClick={() => changePage(page + 1)}>Suivant →</button></nav></section>
    <aside className="decoder-preview"><ChannelPreview item={focused} onUnavailable={previewUnavailable} onPlayable={previewPlayable}/><div className="decoder-zap"><button disabled={!focused} onClick={() => zap(-1)}>← Chaîne précédente</button><button disabled={!focused} onClick={() => zap(1)}>Chaîne suivante →</button></div><div className="publish-panel"><p className="eyebrow">PUBLICATION</p><h3>{selected.length} sélectionnée{selected.length > 1 ? 's' : ''}</h3><label>Catégorie<select value={categoryId} onChange={event => setCategoryId(event.target.value)}><option value="">Conserver les catégories importées</option>{categories.map(category => <option key={category.id} value={category.id}>{category.names.fr ?? category.slug}</option>)}</select></label><label>Territoire<input value={countryCode} maxLength={3} onChange={event => setCountryCode(event.target.value.toUpperCase())}/><small className="field-hint">ALL ou code pays, par exemple FR.</small></label><label className="rights-check"><input type="checkbox" checked={rightsConfirmed} onChange={event => setRightsConfirmed(event.target.checked)}/><span>Je confirme détenir les droits de diffusion pour ce territoire.</span></label><button className="button" disabled={!selected.length || !rightsConfirmed || !!busy} onClick={publish}>{busy === 'publish' ? 'Publication…' : `Publier ${selected.length || ''} chaîne${selected.length > 1 ? 's' : ''}`}</button><p className="form-status" aria-live="polite">{message}</p></div></aside>
  </div></>;
}

function ChannelLogo({ item }: { item: ChannelItem }) {
  const [failed, setFailed] = useState(false);
  const logo = item.imageUrl ?? item.normalized?.logoUrl ?? item.channel.logoUrl;
  return <div className="channel-logo">{logo && !failed
    // External IPTV logos are intentionally loaded as-is; the fallback avoids broken image chrome.
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={logo} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)}/>
    : item.displayName.slice(0, 2).toUpperCase()}</div>;
}

function ChannelPreview({ item,onUnavailable,onPlayable }: { item: ChannelItem | null;onUnavailable:(itemId:string,retryable:boolean)=>void;onPlayable:(itemId:string)=>void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState('Sélectionnez une chaîne pour la prévisualiser.');
  useEffect(() => {
    let cleanup: (() => void | Promise<void>) | undefined;
    let cancelled = false,settled=false,timeout:number|undefined,media:HTMLVideoElement|null=null;
    if (!item || (item.kind&&item.kind !== 'LIVE')) return;
    const playable=()=>{if(cancelled||settled)return;settled=true;if(timeout)window.clearTimeout(timeout);setStatus('');onPlayable(item.id);};
    const unavailable=(text:string,retryable=true)=>{if(cancelled||settled)return;settled=true;if(timeout)window.clearTimeout(timeout);setStatus(text);onUnavailable(item.id,retryable);};
    void (async () => {
      try {
        if (!cancelled) setStatus('Préparation de l’aperçu…');
        const response = await adminFetch(`/admin/playback/source-items/${item.id}/preview`, { method: 'POST' });
        if (!response.ok) {
          unavailable('Aperçu indisponible pour cette chaîne.');
          return;
        }
        const session = await response.json() as { manifestUrl: string; streamType: 'mpegts' | 'hls' | 'dash' | 'file' | 'manifest' };
        if (cancelled || !video.current) return;media=video.current;
        const url = new URL(session.manifestUrl, new URL(process.env.NEXT_PUBLIC_API_URL!).origin).toString();
        if (session.streamType === 'mpegts') {
          const mpegts = await import('mpegts.js');
          if (cancelled) return;
          if (!mpegts.default.isSupported()) { unavailable('Ce navigateur ne prend pas en charge MPEG-TS.',false); return; }
          const created = mpegts.default.createPlayer({ type: 'mpegts', isLive: true, url }, { enableWorker: true, enableStashBuffer: false, liveBufferLatencyChasing: true });
          const onPlaybackError = (errorType?: unknown, errorDetail?: unknown, errorInfo?: unknown) => {
            if (cancelled) return;
            const detail = typeof errorDetail === 'string' ? errorDetail : '';
            const upstreamStatus = errorInfo && typeof errorInfo === 'object' && 'code' in errorInfo ? Number((errorInfo as { code?: unknown }).code) : undefined;
            const message = upstreamStatus === 458
              ? 'Le fournisseur refuse la session de lecture (HTTP 458). Vérifiez la limite de connexions, fermez les autres lecteurs puis réessayez.'
              : errorType === mpegts.default.ErrorTypes.MEDIA_ERROR
              ? 'Le format audio ou vidéo de cette chaîne n’est pas compatible avec le navigateur.'
              : 'Le fournisseur a interrompu le flux ou ne répond pas.';
            unavailable(detail ? `${message} (${detail})` : message,upstreamStatus!==458);
            if (upstreamStatus === 458) { created.pause(); created.unload(); }
          };
          created.on(mpegts.default.Events.ERROR, onPlaybackError);
          cleanup = () => {
            created.off(mpegts.default.Events.ERROR, onPlaybackError);
            created.pause();
            created.unload();
            created.detachMediaElement();
            created.destroy();
          };
          created.attachMediaElement(media);
          media.addEventListener('playing',playable,{once:true});
          timeout=window.setTimeout(()=>unavailable('Le flux ne démarre pas. Passage à la chaîne suivante…'),12_000);
          created.load();
          await created.play();
        } else if(session.streamType==='hls'){
          media.addEventListener('playing',playable,{once:true});timeout=window.setTimeout(()=>unavailable('Le flux HLS ne démarre pas. Passage à la chaîne suivante…'),8_000);
          if(media.canPlayType('application/vnd.apple.mpegurl')){const onError=()=>unavailable('Le flux HLS natif est indisponible.');media.addEventListener('error',onError,{once:true});media.src=url;cleanup=()=>{media?.removeEventListener('error',onError);if(media){media.pause();media.removeAttribute('src');media.load();}};await media.play();}
          else{const Hls=(await import('hls.js')).default;if(!Hls.isSupported()){unavailable('HLS non compatible avec ce navigateur.',false);return;}let recoveries=0;const created=new Hls({lowLatencyMode:true,maxBufferLength:8,maxMaxBufferLength:15,backBufferLength:4,manifestLoadingTimeOut:6_000,fragLoadingTimeOut:8_000,manifestLoadingMaxRetry:1,fragLoadingMaxRetry:1,startFragPrefetch:true}),onError=(_event:string,data:{fatal:boolean;type:string})=>{if(!data.fatal)return;if(recoveries++<1&&data.type===Hls.ErrorTypes.NETWORK_ERROR){created.startLoad();return;}if(recoveries<2&&data.type===Hls.ErrorTypes.MEDIA_ERROR){created.recoverMediaError();return;}unavailable('Le flux HLS est incompatible ou indisponible.');};created.on(Hls.Events.ERROR,onError);cleanup=()=>{created.off(Hls.Events.ERROR,onError);created.destroy();};created.loadSource(url);created.attachMedia(media);await media.play().catch(()=>undefined);}
        } else if(session.streamType==='file'){
          const onError=()=>unavailable('Le fichier vidéo ne peut pas être lu.');media.addEventListener('playing',playable,{once:true});media.addEventListener('error',onError,{once:true});timeout=window.setTimeout(()=>unavailable('Le fichier vidéo ne démarre pas.'),8_000);media.src=url;cleanup=()=>{media?.removeEventListener('error',onError);if(media){media.pause();media.removeAttribute('src');media.load();}};await media.play();
        } else {
          const shaka = await import('shaka-player'); const created = new shaka.default.Player();cleanup=()=>created.destroy();created.configure({manifest:{retryParameters:{maxAttempts:2,baseDelay:500,backoffFactor:2,fuzzFactor:.25,timeout:10_000,stallTimeout:5_000,connectionTimeout:5_000}},streaming:{retryParameters:{maxAttempts:2,baseDelay:500,backoffFactor:2,fuzzFactor:.25,timeout:10_000,stallTimeout:5_000,connectionTimeout:5_000}}}); await created.attach(media);media.addEventListener('playing',playable,{once:true});timeout=window.setTimeout(()=>unavailable('Le flux ne démarre pas. Passage à la chaîne suivante…'),12_000); await created.load(url); await media.play();
        }
      } catch {
        unavailable('Le fournisseur a refusé le flux ou le flux est hors ligne.');
      }
    })();
    return () => { cancelled = true;if(timeout)window.clearTimeout(timeout);media?.removeEventListener('playing',playable); void cleanup?.(); };
  }, [item,onPlayable,onUnavailable]);
  if(item?.kind&&item.kind!=='LIVE')return <div className="decoder-screen"><div className="screen-frame media-poster">{item.imageUrl?<img src={item.imageUrl} alt=""/>:<span>STREAMLY</span>}</div><h3>{item.displayName}</h3><p>{item.groupName??'Sans catégorie'}</p><small>{item.published?'Déjà publié':'Prêt à publier'}</small></div>;
  return <div className="decoder-screen"><div className="screen-frame"><video ref={video} controls muted playsInline/>{!item && <span>STREAMLY</span>}</div><h3>{item?.displayName ?? 'Aucune chaîne sélectionnée'}</h3><p>{item?.groupName ?? status}</p>{item && status && <small>{status}</small>}</div>;
}

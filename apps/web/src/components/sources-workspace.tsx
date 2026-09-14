"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { adminFetch } from "../lib/admin-api";
import { ProviderManager } from "./provider-manager";
import { SourceManager } from "./source-manager";

type Tab = "overview" | "movies" | "series" | "live";
type Provider = { movieTemplate?: string | null; tvTemplate?: string | null; streamUrl?: string | null; isActive: boolean };
type IptvSource = { enabled: boolean; status: string; syncLive: boolean };

const tabs: { id: Tab; label: string; hint: string }[] = [
  { id: "overview", label: "Vue d’ensemble", hint: "Santé et actions prioritaires" },
  { id: "movies", label: "Films", hint: "Templates avec {id}" },
  { id: "series", label: "Séries", hint: "Templates avec saison et épisode" },
  { id: "live", label: "TV & Live", hint: "IPTV, templates et publication" },
];

export function SourcesWorkspace({ locale }: { locale: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [sources, setSources] = useState<IptvSource[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [providerResponse, sourceResponse] = await Promise.all([adminFetch("/admin/providers"), adminFetch("/admin/sources")]);
      if (providerResponse.ok) setProviders(await providerResponse.json());
      if (sourceResponse.ok) setSources(await sourceResponse.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const metrics = useMemo(() => ({
    movies: providers.filter((item) => item.movieTemplate && item.isActive).length,
    series: providers.filter((item) => item.tvTemplate && item.isActive).length,
    liveTemplates: providers.filter((item) => item.streamUrl && item.isActive).length,
    iptv: sources.filter((item) => item.syncLive && item.enabled).length,
    issues: sources.filter((item) => ["DEGRADED", "AUTH_FAILED", "EXPIRED", "OFFLINE"].includes(item.status)).length,
  }), [providers, sources]);

  return <div className="sources-workspace">
    <nav className="sources-tabs" aria-label="Types de sources">
      {tabs.map((item) => <button key={item.id} type="button" className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}><strong>{item.label}</strong><small>{item.hint}</small></button>)}
    </nav>
    {tab === "overview" && <section className="sources-overview" aria-busy={loading}>
      <div className="source-metrics">
        <button type="button" onClick={() => setTab("movies")}><strong>{metrics.movies}</strong><span>templates Films actifs</span></button>
        <button type="button" onClick={() => setTab("series")}><strong>{metrics.series}</strong><span>templates Séries actifs</span></button>
        <button type="button" onClick={() => setTab("live")}><strong>{metrics.iptv}</strong><span>fournisseurs IPTV actifs</span></button>
        <button type="button" onClick={() => setTab("live")}><strong>{metrics.liveTemplates}</strong><span>templates Live actifs</span></button>
      </div>
      <div className="source-dashboard-grid">
        <article className="card source-next-step"><p className="eyebrow">PARCOURS RECOMMANDÉ</p><h2>Publier des chaînes sans perdre le contrôle</h2>
          <ol className="workflow-steps">
            <li><span>1</span><div><strong>Ajouter une entrée Live</strong><small>M3U, Xtream, Portal, template ou URL directe.</small></div></li>
            <li><span>2</span><div><strong>Tester puis synchroniser</strong><small>Les nouvelles chaînes restent en brouillon.</small></div></li>
            <li><span>3</span><div><strong>Contrôler la bibliothèque</strong><small>Filtrer, prévisualiser et sélectionner les chaînes valides.</small></div></li>
            <li><span>4</span><div><strong>Publier la sélection</strong><small>Confirmer catégorie, territoire et droits.</small></div></li>
          </ol>
          <div className="source-actions"><button className="button" type="button" onClick={() => setTab("live")}>Configurer TV & Live</button><Link className="button secondary" href={`/${locale}/admin/imports`}>Ouvrir la bibliothèque</Link></div>
        </article>
        <article className="card source-health-card"><p className="eyebrow">SANTÉ</p><h2>{metrics.issues ? `${metrics.issues} source${metrics.issues > 1 ? "s" : ""} à vérifier` : "Aucune alerte critique"}</h2><p className="muted">La connexion technique et la publication sont séparées : une synchronisation ne rend jamais automatiquement une chaîne visible.</p><button className="button secondary" type="button" onClick={() => setTab("live")}>Voir les entrées Live</button></article>
      </div>
    </section>}
    {tab === "movies" && <ProviderManager key="movie" mode="movie" onChanged={load} />}
    {tab === "series" && <ProviderManager key="series" mode="series" onChanged={load} />}
    {tab === "live" && <div className="live-source-stack">
      <section className="source-context-heading"><div><p className="eyebrow">CONNEXIONS IPTV</p><h2>Fournisseurs et playlists</h2><p className="muted">Importez les chaînes depuis M3U, Xtream ou Portal. Une URL directe crée une seule chaîne.</p></div><Link className="button secondary" href={`/${locale}/admin/imports`}>Gérer et publier les chaînes</Link></section>
      <SourceManager liveOnly onChanged={load} />
      <section className="source-context-heading source-context-divider"><div><p className="eyebrow">LECTURE LIVE</p><h2>Templates et flux de secours</h2><p className="muted">Ajoutez les modèles d’URL Live, classez-les et testez-les avant activation.</p></div></section>
      <ProviderManager key="live" mode="live" onChanged={load} />
    </div>}
  </div>;
}

'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Locale } from '../i18n';
import { adminFetch } from '../lib/admin-api';
import { useAuth } from './auth-provider';
type Overview = { events: Array<{ published: boolean }>; channels: number; sources: Array<{ status: string; _count: { _all: number } }> };
const cards = [
  { path: 'sources', label: 'Sources de lecture', detail: 'Configurer les modèles Films, Séries, TV et les comptes M3U, Xtream ou Portal.', roles: ['TECHNICAL_ADMIN', 'SUPER_ADMIN'] },
  { path: 'imports', label: 'Bibliothèque TV & Live', detail: 'Synchroniser les chaînes, contrôler les nouveautés et publier les sélections.', roles: ['TECHNICAL_ADMIN', 'SUPER_ADMIN'] },
  { path: 'live', label: 'Événements Live', detail: 'Planifier un événement, choisir sa diffusion, la tester et la publier.', roles: ['CONTENT_MANAGER', 'TECHNICAL_ADMIN', 'SUPER_ADMIN'] },
  { path: 'catalog', label: 'Catalogue & accueil', detail: 'Gérer les fiches Films/Séries, les collections et la mise en avant éditoriale.', roles: ['CONTENT_MANAGER', 'SUPER_ADMIN'] },
  { path: 'epg', label: 'Guide & EPG', detail: 'Importer le guide XMLTV et corriger les correspondances avec les chaînes.', roles: ['CONTENT_MANAGER', 'TECHNICAL_ADMIN', 'SUPER_ADMIN'] },
  { path: 'users', label: 'Utilisateurs', detail: 'Gérer les rôles, les statuts et les accès au back-office.', roles: ['SUPER_ADMIN'] },
  { path: 'help', label: 'Guide administrateur', detail: 'Retrouver le parcours recommandé et la signification des statuts.', roles: [] },
] as const;
export function AdminDashboard({ locale }: { locale: Locale }) {
  const { user } = useAuth(); const [data, setData] = useState<Overview>(); const [error, setError] = useState('');
  useEffect(() => { void adminFetch('/admin/platform').then(async (response) => { if (!response.ok) throw new Error('Impossible de charger les indicateurs.'); setData(await response.json()); }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Chargement impossible.')); }, []);
  const metrics = useMemo(() => { const accounts = data?.sources.reduce((total, group) => total + group._count._all, 0) ?? 0; const ready = data?.sources.find((group) => group.status === 'READY')?._count._all ?? 0; return [['Comptes source', accounts], ['Sources prêtes', ready], ['Chaînes importées', data?.channels ?? 0], ['Événements publiés', data?.events.filter((event) => event.published).length ?? 0]] as const; }, [data]);
  return <><section className="admin-metrics" aria-label="État de la plateforme">{metrics.map(([label, value]) => <div className="admin-metric" key={label}><strong>{data ? value : '—'}</strong><span>{label}</span></div>)}</section>{error && <p className="platform-status" role="alert">{error}</p>}<section className="admin-grid" aria-label="Modules du back-office">{cards.filter((card) => !card.roles.length || (user && (card.roles as readonly string[]).includes(user.role))).map((card, index) => <Link className="admin-module" href={`/${locale}/admin/${card.path}`} key={card.path}><span>{String(index + 1).padStart(2, '0')}</span><div><h2>{card.label}</h2><p>{card.detail}</p></div><b aria-hidden="true">→</b></Link>)}</section></>;
}

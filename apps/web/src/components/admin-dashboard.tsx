'use client';
import Link from 'next/link';
import { Locale } from '../i18n';
import { useAuth } from './auth-provider';
const modules = [
  { path: 'catalog', label: 'Catalogue & accueil', detail: 'Gérer les films, séries, collections et la programmation éditoriale.', icon: '01', technical: false },
  { path: 'sources', label: 'Sources IPTV', detail: 'Configurer, tester et surveiller les sources de diffusion.', icon: '02', technical: true },
  { path: 'imports', label: 'Chaînes des sources', detail: 'Synchroniser, prévisualiser, classer et publier les chaînes comme sur un décodeur.', icon: '03', technical: true },
  { path: 'epg', label: 'Guide EPG', detail: 'Importer les grilles XMLTV et corriger les correspondances de chaînes.', icon: '04', technical: false },
  { path: 'help', label: 'Guide administrateur', detail: 'Comprendre les écrans, les statuts, les termes techniques et les procédures recommandées.', icon: '05', technical: false },
] as const;
export function AdminDashboard({ locale }: { locale: Locale }) {
  const { user } = useAuth();
  const technical = user?.role === 'TECHNICAL_ADMIN' || user?.role === 'SUPER_ADMIN';
  return <section className="admin-grid" aria-label="Modules du back-office">{modules.filter(module => technical || !module.technical).map(module => <Link className="admin-module" href={`/${locale}/admin/${module.path}`} key={module.path}><span>{module.icon}</span><div><h2>{module.label}</h2><p>{module.detail}</p></div><b aria-hidden="true">→</b></Link>)}</section>;
}

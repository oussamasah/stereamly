import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '../../../components/header';
import { isLocale } from '../../../i18n';

const modules = [
  { path: 'catalog', label: 'Catalogue & accueil', detail: 'Gérer les films, séries, collections et la programmation éditoriale.', icon: '01' },
  { path: 'sources', label: 'Sources IPTV', detail: 'Configurer, tester et surveiller les sources de diffusion.', icon: '02' },
  { path: 'imports', label: 'Chaînes des sources', detail: 'Synchroniser, prévisualiser, classer et publier les chaînes comme sur un décodeur.', icon: '03' },
  { path: 'epg', label: 'Guide EPG', detail: 'Importer les grilles XMLTV et corriger les correspondances de chaînes.', icon: '04' },
  { path: 'help', label: 'Guide administrateur', detail: 'Comprendre les écrans, les statuts, les termes techniques et les procédures recommandées.', icon: '05' },
] as const;

export default async function AdminHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <main className="shell"><Header locale={locale}/>
    <section className="admin-heading"><p className="eyebrow">STREAMLY CONTROL</p><h1>Back-office</h1><p className="lead">Pilotez le catalogue, les sources et la diffusion depuis un espace central.</p></section>
    <section className="admin-grid" aria-label="Modules du back-office">
      {modules.map(module => <Link className="admin-module" href={`/${locale}/admin/${module.path}`} key={module.path}><span>{module.icon}</span><div><h2>{module.label}</h2><p>{module.detail}</p></div><b aria-hidden="true">→</b></Link>)}
    </section>
  </main>;
}

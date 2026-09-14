import { notFound } from 'next/navigation';
import { AdminDashboard } from '../../../components/admin-dashboard';
import { AdminNav } from '../../../components/admin-nav';
import { Header } from '../../../components/header';
import { isLocale } from '../../../i18n';
export default async function Page({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; if (!isLocale(locale)) notFound(); return <main className="shell"><Header locale={locale}/><AdminNav locale={locale} current="dashboard"/><div className="admin-heading"><p className="eyebrow">ADMINISTRATION</p><h1>Pilotez Streamly</h1><p className="lead">Chaque tâche a son espace : configurez les sources, contrôlez les imports, puis publiez le catalogue sans mélanger les responsabilités.</p></div><AdminDashboard locale={locale}/></main>; }

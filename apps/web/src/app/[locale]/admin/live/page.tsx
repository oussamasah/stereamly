import { notFound } from 'next/navigation';
import { AdminNav } from '../../../../components/admin-nav';
import { Header } from '../../../../components/header';
import { LiveEventAdmin } from '../../../../components/live-event-admin';
import { isLocale } from '../../../../i18n';
export default async function Page({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; if (!isLocale(locale)) notFound(); return <main className="shell"><Header locale={locale}/><AdminNav locale={locale} current="live"/><div className="admin-heading"><p className="eyebrow">DIRECT</p><h1>Événements Live</h1><p className="lead">Planifiez l’événement, sélectionnez-le, affectez sa diffusion puis publiez-la après le test de lecture.</p></div><LiveEventAdmin/></main>; }

import { notFound } from 'next/navigation';
import { AdminNav } from '../../../../components/admin-nav';
import { EpgAdmin } from '../../../../components/epg-admin';
import { Header } from '../../../../components/header';
import { isLocale } from '../../../../i18n';
export default async function Page({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; if (!isLocale(locale)) notFound(); return <main className="shell"><Header locale={locale}/><AdminNav locale={locale} current="epg"/><div className="admin-heading"><p className="eyebrow">PROGRAMMATION</p><h1>Guide TV & EPG</h1><p className="lead">Reliez chaque guide XMLTV à sa source TV et corrigez uniquement les chaînes non reconnues.</p></div><EpgAdmin/></main>; }

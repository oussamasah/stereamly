import { notFound } from 'next/navigation';
import { AdminNav } from '../../../../components/admin-nav';
import { Header } from '../../../../components/header';
import { ProviderManager } from '../../../../components/provider-manager';
import { isLocale } from '../../../../i18n';

export default async function AdminProviders({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <main className="shell"><Header locale={locale} /><AdminNav locale={locale} current="providers" /><div className="admin-heading"><p className="eyebrow">LECTURE</p><h1>Serveurs de streaming</h1><p className="lead">Gerez les templates de lecture utilises par les pages films et series TMDB.</p></div><ProviderManager /></main>;
}

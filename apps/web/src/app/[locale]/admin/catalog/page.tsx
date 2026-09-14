import { notFound } from 'next/navigation';
import { AdminNav } from '../../../../components/admin-nav';
import { EditorialStudio } from '../../../../components/editorial-studio';
import { Header } from '../../../../components/header';
import { isLocale } from '../../../../i18n';
export default async function Page({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; if (!isLocale(locale)) notFound(); return <main className="shell"><Header locale={locale}/><AdminNav locale={locale} current="catalog"/><div className="admin-heading"><p className="eyebrow">FILMS & SÉRIES</p><h1>Catalogue éditorial</h1><p className="lead">Gérez uniquement les fiches Films et Séries, leurs collections et leur mise en avant. Les chaînes restent dans la Bibliothèque TV.</p></div><EditorialStudio/></main>; }

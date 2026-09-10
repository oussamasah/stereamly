import { MediaCatalogue } from '../../../components/media-catalogue';
import { Header } from '../../../components/header';
import { isLocale } from '../../../i18n';
import { notFound } from 'next/navigation';
export default async function SeriesPage({params}:{params:Promise<{locale:string}>}){const {locale}=await params;if(!isLocale(locale))notFound();return <main className="shell"><Header locale={locale}/><MediaCatalogue locale={locale} type="SERIES"/></main>;}

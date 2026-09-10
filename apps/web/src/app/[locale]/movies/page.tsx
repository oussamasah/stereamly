import { MediaCatalogue } from '../../../components/media-catalogue';
import { Header } from '../../../components/header';
import { isLocale } from '../../../i18n';
import { notFound } from 'next/navigation';
export default async function MoviesPage({params}:{params:Promise<{locale:string}>}){const {locale}=await params;if(!isLocale(locale))notFound();return <main className="shell"><Header locale={locale}/><MediaCatalogue locale={locale} type="MOVIE"/></main>;}

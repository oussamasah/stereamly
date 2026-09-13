import {notFound} from 'next/navigation';
import {Header} from '../../../../components/header';
import {TitleDetail} from '../../../../features/viewing/browse';
import {isLocale} from '../../../../i18n';
export default async function Page({params}:{params:Promise<{locale:string;slug:string}>}){const{locale,slug}=await params;if(!isLocale(locale)||!/^\d+$/.test(slug))notFound();return <main><div className="shell"><Header locale={locale}/></div><TitleDetail locale={locale} kind="movie" id={slug}/></main>;}

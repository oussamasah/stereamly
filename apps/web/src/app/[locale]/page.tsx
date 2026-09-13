import {notFound} from 'next/navigation';
import {Header} from '../../components/header';
import {Browse} from '../../features/viewing/browse';
import {isLocale} from '../../i18n';
export default async function Page({params}:{params:Promise<{locale:string}>}){const{locale}=await params;if(!isLocale(locale))notFound();return <main><div className="shell"><Header locale={locale}/></div><Browse locale={locale} view="home"/></main>;}

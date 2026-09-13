import {notFound} from 'next/navigation';
import {Header} from '../../../components/header';
import {PlatformAdmin} from '../../../features/viewing/admin';
import {isLocale} from '../../../i18n';
export default async function Page({params}:{params:Promise<{locale:string}>}){const{locale}=await params;if(!isLocale(locale))notFound();return <main><div className="shell"><Header locale={locale}/></div><PlatformAdmin locale={locale}/></main>;}

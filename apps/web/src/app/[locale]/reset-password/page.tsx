import {notFound} from 'next/navigation';
import {Header} from '../../../components/header';
import {IdentityForm} from '../../../features/viewing/identity';
import {isLocale} from '../../../i18n';
export default async function Page({params}:{params:Promise<{locale:string}>}){const{locale}=await params;if(!isLocale(locale))notFound();return <main><div className="shell"><Header locale={locale}/></div><IdentityForm locale={locale} mode="reset-password"/></main>;}

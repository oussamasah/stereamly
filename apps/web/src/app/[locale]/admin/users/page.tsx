import {notFound} from 'next/navigation';
import {Header} from '../../../../components/header';
import {AdminNav} from '../../../../components/admin-nav';
import {UsersAdmin} from '../../../../features/viewing/users';
import {isLocale} from '../../../../i18n';
export default async function Page({params}:{params:Promise<{locale:string}>}){const{locale}=await params;if(!isLocale(locale))notFound();return <main><div className="shell"><Header locale={locale}/><AdminNav locale={locale}/></div><UsersAdmin/></main>;}

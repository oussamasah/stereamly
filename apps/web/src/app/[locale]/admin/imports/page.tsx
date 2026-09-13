import { notFound } from 'next/navigation';
import { AdminNav } from '../../../../components/admin-nav';
import { Header } from '../../../../components/header';
import { LiveImports } from '../../../../features/viewing/imports';
import { isLocale } from '../../../../i18n';

export default async function AdminImports({params}:{params:Promise<{locale:string}>}){
 const{locale}=await params;if(!isLocale(locale))notFound();
 return <main className="shell"><Header locale={locale}/><AdminNav locale={locale} current="imports"/><LiveImports/></main>;
}

import { notFound } from 'next/navigation';
import { AdminNav } from '../../../../components/admin-nav';
import { EpgAdmin } from '../../../../components/epg-admin';
import { Header } from '../../../../components/header';
import { isLocale } from '../../../../i18n';
export default async function AdminEpg({params}:{params:Promise<{locale:string}>}){const{locale}=await params;if(!isLocale(locale))notFound();return <main className="shell"><Header locale={locale}/><AdminNav locale={locale} current="epg"/><div className="admin-heading"><p className="eyebrow">PROGRAMMATION</p><h1>EPG / XMLTV</h1><p className="lead">Importez les grilles et corrigez les associations entre programmes et chaînes.</p></div><EpgAdmin/></main>}

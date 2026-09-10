import { notFound } from 'next/navigation';
import { AdminNav } from '../../../../components/admin-nav';
import { Header } from '../../../../components/header';
import { SourceManager } from '../../../../components/source-manager';
import { isLocale } from '../../../../i18n';
export default async function AdminSources({params}:{params:Promise<{locale:string}>}){const{locale}=await params;if(!isLocale(locale))notFound();return <main className="shell"><Header locale={locale}/><AdminNav locale={locale} current="sources"/><div className="admin-heading"><p className="eyebrow">DIFFUSION</p><h1>Sources IPTV</h1><p className="lead">Configurez, testez puis activez vos sources. Les secrets restent chiffrés côté serveur.</p></div><SourceManager/></main>}

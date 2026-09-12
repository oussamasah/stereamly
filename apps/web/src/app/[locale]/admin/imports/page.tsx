import { notFound } from 'next/navigation';
import { AdminNav } from '../../../../components/admin-nav';
import { Header } from '../../../../components/header';
import { ImportManager } from '../../../../components/import-manager';
import { isLocale } from '../../../../i18n';

export default async function AdminImports({params}:{params:Promise<{locale:string}>}){
 const{locale}=await params;if(!isLocale(locale))notFound();
 return <main className="shell"><Header locale={locale}/><AdminNav locale={locale} current="imports"/><div className="admin-heading decoder-heading"><p className="eyebrow">BIBLIOTHÈQUE DES SOURCES</p><h1>Synchroniser et publier</h1><p className="lead">Une seule interface pour parcourir les chaînes, films, séries et documentaires de chaque source.</p></div><ImportManager/></main>;
}

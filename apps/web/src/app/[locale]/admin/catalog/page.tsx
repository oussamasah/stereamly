import { notFound } from 'next/navigation';
import { AdminNav } from '../../../../components/admin-nav';
import { EditorialStudio } from '../../../../components/editorial-studio';
import { Header } from '../../../../components/header';
import { isLocale } from '../../../../i18n';
export default async function AdminCatalogue({params}:{params:Promise<{locale:string}>}){const{locale}=await params;if(!isLocale(locale))notFound();return <main className="shell"><Header locale={locale}/><AdminNav locale={locale} current="catalog"/><div className="admin-heading"><p className="eyebrow">STUDIO ÉDITORIAL</p><h1>Catalogue et accueil</h1><p className="lead">Organisez les contenus, les collections et la mise en avant de l’accueil.</p></div><EditorialStudio/></main>}

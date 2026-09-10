import { notFound } from 'next/navigation';
import { Header } from '../../../components/header';
import { AccountClient } from '../../../components/account-client';
import { isLocale } from '../../../i18n';

export default async function Account({params}:{params:Promise<{locale:string}>}) {
  const {locale}=await params;
  if(!isLocale(locale))notFound();
  const title=locale==='en'?'My account':locale==='ar'?'حسابي':'Mon compte';
  const eyebrow=locale==='en'?'YOUR SPACE':locale==='ar'?'مساحتك':'VOTRE ESPACE';
  return <main className="shell"><Header locale={locale}/><div className="page-heading"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div><AccountClient/></main>;
}

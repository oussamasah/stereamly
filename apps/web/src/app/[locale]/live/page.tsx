import { notFound } from 'next/navigation';
import { Header } from '../../../components/header';
import { LiveGuide } from '../../../components/live-guide';
import { isLocale } from '../../../i18n';

export default async function Live({params}:{params:Promise<{locale:string}>}) {
  const {locale}=await params;
  if(!isLocale(locale))notFound();
  const title=locale==='en'?'TV Guide':locale==='ar'?'دليل التلفاز':'Guide TV';
  const eyebrow=locale==='en'?'LIVE NOW':locale==='ar'?'مباشر الآن':'EN DIRECT';
  return <main className="shell"><Header locale={locale}/><div className="page-heading"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div><LiveGuide locale={locale}/></main>;
}

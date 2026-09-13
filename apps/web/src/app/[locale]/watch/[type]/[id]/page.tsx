import {notFound} from 'next/navigation';
import {Header} from '../../../../../components/header';
import {Player} from '../../../../../features/viewing/player';
import {isLocale} from '../../../../../i18n';
export default async function Page({params,searchParams}:{params:Promise<{locale:string;type:string;id:string}>;searchParams:Promise<{season?:string;episode?:string}>}){const{locale,type,id}=await params;const query=await searchParams;if(!isLocale(locale)||!['movie','tv','channel','event','iptv'].includes(type)||!/^[-\w]+$/.test(id))notFound();const season=query.season||'1',episode=query.episode||'1';if(type==='tv'&&(!/^\d+$/.test(season)||!(/^[1-9]\d*$/.test(episode))))notFound();const target=['movie','tv'].includes(type)?`tmdb:${type}:${id}${type==='tv'?`:s:${season}:e:${episode}`:''}`:`${type}:${id}`;return <main><div className="shell"><Header locale={locale}/></div><Player locale={locale} target={target}/></main>;}

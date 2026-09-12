'use client';
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Locale } from '../i18n';

type Content={id:string;slug:string;type?:'MOVIE'|'SERIES';names:Record<string,string>;synopsis?:Record<string,string>;images?:{type:string;url:string}[];logoUrl?:string;releaseYear?:number;rating?:string;category?:{names:Record<string,string>}};
type Entry={mediaTitle?:Content|null;channel?:Content|null};
type Rail={id:string;type:string;names:Record<string,string>;items:Entry[];collection?:{items:Entry[]}|null};
type Layout={rails:Rail[]};
type HomeData={layout:Layout|null;movies:Content[];series:Content[];channels:Content[]};
const api=process.env.NEXT_PUBLIC_API_URL;
const copy={
  fr:{featured:'À LA UNE',watch:'Lecture',info:'Plus d’infos',movies:'Films à découvrir',series:'Séries à regarder',live:'Chaînes en direct',empty:'Votre plateforme de streaming',emptyText:'Les films, séries et chaînes publiés depuis le back-office apparaîtront automatiquement ici.',admin:'Ouvrir le back-office'},
  en:{featured:'FEATURED',watch:'Play',info:'More info',movies:'Movies to discover',series:'Series to watch',live:'Live channels',empty:'Your streaming platform',emptyText:'Movies, series and channels published from the back office will automatically appear here.',admin:'Open back office'},
  ar:{featured:'مختارات',watch:'تشغيل',info:'معلومات',movies:'أفلام مقترحة',series:'مسلسلات للمشاهدة',live:'قنوات مباشرة',empty:'منصة البث الخاصة بك',emptyText:'ستظهر الأفلام والمسلسلات والقنوات المنشورة من لوحة الإدارة هنا تلقائياً.',admin:'فتح لوحة الإدارة'},
} as const;

export function StreamingHome({locale}:{locale:Locale}){
  const[data,setData]=useState<HomeData>({layout:null,movies:[],series:[],channels:[]});
  const[loading,setLoading]=useState(true);
  useEffect(()=>{let cancelled=false;void Promise.allSettled([
    fetch(`${api}/home/${locale}/ALL`).then(r=>r.ok?r.json():null),
    fetch(`${api}/media/titles?type=MOVIE&sort=recent&page=1&pageSize=24`).then(r=>r.ok?r.json():{items:[]}),
    fetch(`${api}/media/titles?type=SERIES&sort=recent&page=1&pageSize=24`).then(r=>r.ok?r.json():{items:[]}),
    fetch(`${api}/catalog/channels?country=FR&currency=EUR&page=1&pageSize=24`).then(r=>r.ok?r.json():{items:[]}),
  ]).then(results=>{if(cancelled)return;const value=<T,>(index:number,fallback:T)=>results[index].status==='fulfilled'?(results[index] as PromiseFulfilledResult<T>).value:fallback;setData({layout:value<Layout|null>(0,null),movies:value<{items:Content[]}>(1,{items:[]}).items??[],series:value<{items:Content[]}>(2,{items:[]}).items??[],channels:value<{items:Content[]}>(3,{items:[]}).items??[]});}).finally(()=>{if(!cancelled)setLoading(false)});return()=>{cancelled=true}},[locale]);
  const editorial=useMemo(()=>data.layout?.rails??[],[data.layout]);
  const hero=useMemo(()=>contentOf(editorial.find(v=>v.type==='HERO')?.items[0]??editorial.flatMap(entries)[0])??data.movies[0]??data.series[0]??data.channels[0]??null,[editorial,data.movies,data.series,data.channels]);
  if(loading)return <><div className="hero-premium skeleton"/><div className="rail-skeleton skeleton"/></>;
  if(!hero)return <Empty locale={locale}/>;
  const backdrop=image(hero,'BACKDROP')??image(hero,'POSTER')??hero.logoUrl;
  const automatic=[{id:'auto-movies',title:copy[locale].movies,values:data.movies},{id:'auto-series',title:copy[locale].series,values:data.series},{id:'auto-live',title:copy[locale].live,values:data.channels}].filter(rail=>rail.values.length);
  return <><section className="hero-premium" style={backdrop?{backgroundImage:`url(${backdrop})`}:undefined}><div><p className="eyebrow">{copy[locale].featured}</p><h1>{name(hero,locale)}</h1><p className="hero-meta">{[hero.releaseYear,hero.rating&&`★ ${hero.rating}`,hero.type==='SERIES'?'SÉRIE':hero.type==='MOVIE'?'FILM':'LIVE'].filter(Boolean).join(' · ')}</p><p className="lead">{hero.synopsis?.[locale]??hero.synopsis?.fr??hero.category?.names?.[locale]??hero.category?.names?.fr}</p><div className="hero-actions"><Link className="button" href={href(hero,locale)}>▶ {copy[locale].watch}</Link><Link className="button secondary" href={href(hero,locale)}>ⓘ {copy[locale].info}</Link></div></div></section>{editorial.filter(v=>v.type!=='HERO'&&entries(v).length>0).map(rail=><ContentRail key={rail.id} title={rail.names[locale]??rail.names.fr} items={entries(rail).map(contentOf).filter((item):item is Content=>!!item)} locale={locale}/>)}{automatic.map(rail=><ContentRail key={rail.id} title={rail.title} items={rail.values} locale={locale}/>)}</>;
}

function ContentRail({title,items,locale}:{title:string;items:Content[];locale:Locale}){return <section className="content-rail"><h2>{title}</h2><div className="rail-track">{items.map(item=>{const artwork=image(item,item.type?'POSTER':'LOGO')??image(item,'BACKDROP')??item.logoUrl,itemName=name(item,locale);return <Link className={`rail-card ${item.type?'portrait':'channel'}`} href={href(item,locale)} key={item.id}><div className="rail-art"><RailArtwork url={artwork} title={itemName} media={Boolean(item.type)}/>{!item.type&&<span className="live-pill"><i/> LIVE</span>}<span className="play-overlay">▶</span></div><strong>{itemName}</strong><small>{item.type==='MOVIE'?'Film':item.type==='SERIES'?'Série':item.category?.names?.[locale]??'En direct'}</small></Link>})}</div></section>}
function RailArtwork({url,title,media}:{url?:string;title:string;media:boolean}){const[failed,setFailed]=useState(false);return url&&!failed?<img src={url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:<span className={`rail-fallback ${media?'media':'live'}`}><i aria-hidden="true">{media?'▶':'●'}</i><b>{title}</b><small>STREAMLY</small></span>}
function entries(rail:Rail){return rail.collection?.items?.length?rail.collection.items:rail.items}
function contentOf(entry?:Entry){return entry?.mediaTitle??entry?.channel??null}
function image(value:Content,type:string){return value.images?.find(item=>item.type===type)?.url}
function name(value:Content,locale:Locale){return value.names[locale]??value.names.fr??Object.values(value.names)[0]??'Sans titre'}
function href(value:Content,locale:Locale){return value.type==='MOVIE'?`/${locale}/movies/${value.slug}`:value.type==='SERIES'?`/${locale}/series/${value.slug}`:`/${locale}/channels/${value.slug}`}
function Empty({locale}:{locale:Locale}){return <section className="hero-premium fallback"><div><p className="eyebrow">STREAMLY</p><h1>{copy[locale].empty}</h1><p className="lead">{copy[locale].emptyText}</p><Link className="button" href={`/${locale}/admin`}>{copy[locale].admin}</Link></div></section>}

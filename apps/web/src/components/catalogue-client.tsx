'use client';
/* eslint-disable @next/next/no-img-element -- logos are normalized to WebP by the API */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getMessages, Locale } from '../i18n';
type Price={currency:string;period:string;amountMinor:number}; type Channel={id:string;slug:string;names:Record<string,string>;logoUrl?:string;languageCode:string;countryCode:string;prices:Price[];category:{names:Record<string,string>}};
type Pack={id:string;slug:string;names:Record<string,string>;description?:Record<string,string>;maxDevices:number;maxConcurrentStreams:number;prices:Price[];channels:{channel:Channel}[]};
const api=process.env.NEXT_PUBLIC_API_URL;
export function CatalogueClient({locale,kind}:{locale:Locale;kind:'channels'|'packages'}){
 const t=getMessages(locale); const [country,setCountry]=useState('FR'); const [search,setSearch]=useState(''); const [items,setItems]=useState<(Channel|Pack)[]>([]); const [loading,setLoading]=useState(true);
 useEffect(()=>{const timer=setTimeout(async()=>{setLoading(true);try{const params=new URLSearchParams({country,currency:'EUR',search,page:'1',pageSize:'60'}); const response=await fetch(`${api}/catalog/${kind}?${params}`); const data=await response.json();setItems(response.ok?data.items:[]);}catch{setItems([]);}finally{setLoading(false);}},250);return()=>clearTimeout(timer);},[country,search,kind]);
 const channels=items as Channel[];
 return <><div className="toolbar"><label>{t.country}<select value={country} onChange={e=>setCountry(e.target.value)}><option value="FR">France</option><option value="MA">Maroc</option><option value="GB">United Kingdom</option><option value="US">United States</option></select></label><label>{t.search}<input type="search" value={search} onChange={e=>setSearch(e.target.value)}/></label></div>
 {loading?<section className="channel-browser">{Array.from({length:12},(_,i)=><div className="channel-tile skeleton" key={i}/>)}</section>:items.length===0?<section className="empty-state"><span className="empty-icon">!</span><h2>{t.empty}</h2><p>Publiez des chaînes depuis le back-office pour les afficher ici.</p></section>:<section className="channel-browser">{kind==='channels'?channels.map(item=><Link className="channel-tile" href={`/${locale}/channels/${item.slug}`} key={item.id}><div className="channel-art">{item.logoUrl?<img src={item.logoUrl} alt=""/>:<strong>{(item.names[locale]??item.names.fr).slice(0,2)}</strong>}<span className="live-pill"><i/> LIVE</span><span className="play-overlay">▶</span></div><h2>{item.names[locale]??item.names.fr}</h2><p>{item.category.names[locale]??item.category.names.fr} · {item.languageCode.toUpperCase()}</p></Link>):(items as Pack[]).map(item=><article className="card" key={item.id}><h2>{item.names[locale]??item.names.fr}</h2><p className="muted">{item.channels.length} {t.channels}</p></article>)}</section>}</>;
}

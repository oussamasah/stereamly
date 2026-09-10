'use client';
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Locale } from '../i18n';
type Channel={id:string;names:Record<string,string>;description?:Record<string,string>;logoUrl?:string;languageCode:string;countryCode:string;category:{names:Record<string,string>};playbackVariants:{id:string;label:string;quality?:string}[]};
const api=process.env.NEXT_PUBLIC_API_URL;
export function ChannelDetail({locale,slug}:{locale:Locale;slug:string}){
 const[item,setItem]=useState<Channel|null>(null);
 useEffect(()=>{void fetch(`${api}/catalog/channels/${slug}?country=FR&currency=EUR`).then(r=>r.ok?r.json():null).then(setItem);},[slug]);
 if(!item)return <div className="detail-hero skeleton"/>;
 return <section className="channel-detail card">{item.logoUrl&&<img src={item.logoUrl} alt=""/>}<div><p className="eyebrow">LIVE · {item.category.names[locale]??item.category.names.fr}</p><h1>{item.names[locale]??item.names.fr}</h1><p className="lead">{item.description?.[locale]??item.description?.fr}</p><p className="meta">{item.countryCode} · {item.languageCode} · {item.playbackVariants.map(v=>v.quality).filter(Boolean).join(', ')}</p><Link className="button" href={`/${locale}/watch/channel/${item.id}`}>▶ Regarder en direct</Link></div></section>;
}

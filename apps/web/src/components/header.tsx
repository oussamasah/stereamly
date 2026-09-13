'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Locale,locales} from '../i18n';
import {labels} from '../features/viewing/labels';
import {adminRoles,useAuth} from './auth-provider';
export function Header({locale}:{locale:Locale}){const t=labels[locale];const pathname=usePathname();const{user}=useAuth();const links=[['',t.home],['movies',t.movie],['series',t.tv],['channels',t.channels],['sports',t.sports],['search',t.search],['my-list',t.library]];return <header className="view-header"><Link className="brand" href={`/${locale}`}><span className="brand-mark">S</span>Streamly</Link><nav aria-label={t.home}>{links.map(([path,label])=><Link key={path} aria-current={pathname===`/${locale}${path?`/${path}`:''}`?'page':undefined} href={`/${locale}/${path}`}>{label}</Link>)}</nav><div className="view-actions">{user&&adminRoles.has(user.role)&&<Link href={`/${locale}/admin`}>Admin</Link>}<Link href={`/${locale}/${user?'account':'login'}`} aria-label={locale==='ar'?'الحساب':locale==='fr'?'Compte':'Account'}>◎</Link><select aria-label="Language" value={locale} onChange={e=>{window.location.href=pathname.replace(/^\/(en|fr|ar)(?=\/|$)/,`/${e.target.value}`)+window.location.search+window.location.hash;}}>{locales.map(l=><option key={l}>{l}</option>)}</select></div></header>;}

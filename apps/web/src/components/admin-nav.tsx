'use client';

import Link from 'next/link';
import { Locale } from '../i18n';
import { useAuth } from './auth-provider';

const modules = [
  { id: 'catalog', label: 'Catalogue' },
  { id: 'sources', label: 'Sources' },
  { id: 'imports', label: 'Bibliothèque' },
  { id: 'epg', label: 'EPG' },
  { id: 'help', label: 'Guide' },
] as const;

export function AdminNav({ locale, current }: { locale: Locale; current?: typeof modules[number]['id'] }) {
  const { user } = useAuth();
  const canManageSources = user?.role === 'TECHNICAL_ADMIN' || user?.role === 'SUPER_ADMIN';
  const visibleModules = modules.filter(module => canManageSources || (module.id !== 'sources' && module.id !== 'imports'));
  const back = locale === 'en' ? 'Admin home' : locale === 'ar' ? 'لوحة الإدارة' : 'Accueil admin';
  return <nav className="admin-nav" aria-label="Back-office navigation">
    <Link className="admin-back" href={`/${locale}/admin`}><span aria-hidden="true">←</span>{back}</Link>
    <div className="admin-tabs">{visibleModules.map(module => <Link className={`admin-tab ${current === module.id ? 'active' : ''}`} href={`/${locale}/admin/${module.id}`} aria-current={current === module.id ? 'page' : undefined} key={module.id}>{module.label}</Link>)}</div>
  </nav>;
}

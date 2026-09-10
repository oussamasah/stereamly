import Link from 'next/link';
import { Locale } from '../i18n';

const modules = [
  { id: 'catalog', label: 'Catalogue' },
  { id: 'sources', label: 'Sources' },
  { id: 'imports', label: 'Chaînes' },
  { id: 'epg', label: 'EPG' },
  { id: 'help', label: 'Guide' },
] as const;

export function AdminNav({ locale, current }: { locale: Locale; current?: typeof modules[number]['id'] }) {
  const back = locale === 'en' ? 'Admin home' : locale === 'ar' ? 'لوحة الإدارة' : 'Accueil admin';
  return <nav className="admin-nav" aria-label="Back-office navigation">
    <Link className="admin-back" href={`/${locale}/admin`}><span aria-hidden="true">←</span>{back}</Link>
    <div className="admin-tabs">{modules.map(module => <Link className={`admin-tab ${current === module.id ? 'active' : ''}`} href={`/${locale}/admin/${module.id}`} aria-current={current === module.id ? 'page' : undefined} key={module.id}>{module.label}</Link>)}</div>
  </nav>;
}

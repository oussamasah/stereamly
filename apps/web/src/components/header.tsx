import Link from 'next/link';
import { getMessages, Locale, locales } from '../i18n';

const labels = {
  fr: { home: 'Accueil', live: 'En direct', browse: 'Chaînes', movies: 'Films', series: 'Séries', list: 'Ma liste', account: 'Compte', search: 'Rechercher' },
  en: { home: 'Home', live: 'Live', browse: 'Channels', movies: 'Movies', series: 'Series', list: 'My list', account: 'Account', search: 'Search' },
  ar: { home: 'الرئيسية', live: 'مباشر', browse: 'القنوات', movies: 'أفلام', series: 'مسلسلات', list: 'قائمتي', account: 'الحساب', search: 'بحث' },
} as const;

export function Header({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  const label = labels[locale];
  return <header className="site-header">
    <Link className="brand" href={`/${locale}`} aria-label={`${t.brand} — ${label.home}`}>
      <span className="brand-mark" aria-hidden="true">S</span><span>{t.brand}</span>
    </Link>
    <nav className="nav" aria-label="Main navigation">
      <div className="nav-primary">
        <Link className="nav-link" href={`/${locale}`}>{label.home}</Link>
        <Link className="nav-link" href={`/${locale}/live`}>{label.live}</Link>
        <Link className="nav-link" href={`/${locale}/channels`}>{label.browse}</Link>
        <Link className="nav-link" href={`/${locale}/movies`}>{label.movies}</Link>
        <Link className="nav-link" href={`/${locale}/series`}>{label.series}</Link>
      </div>
      <div className="nav-utility">
        <Link className="icon-link" href={`/${locale}/search`} aria-label={label.search} title={label.search}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>
        </Link>
        <Link className="nav-link account-link" href={`/${locale}/my-list`}>{label.list}</Link>
        <Link className="nav-link account-link" href={`/${locale}/account`}>{label.account}</Link>
        <div className="locale-group" aria-label="Language">
          {locales.map(item => <Link className={`locale-link ${item === locale ? 'current' : ''}`} key={item} href={`/${item}`} hrefLang={item} aria-current={item === locale ? 'page' : undefined}>{item.toUpperCase()}</Link>)}
        </div>
        <Link className="button secondary compact" href={`/${locale}/login`}>{t.login}</Link>
        <Link className="button compact" href={`/${locale}/register`}>{t.register}</Link>
      </div>
    </nav>
  </header>;
}

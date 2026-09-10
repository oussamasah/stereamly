import { notFound } from 'next/navigation';
import { direction, isLocale, locales } from '../../i18n';
import { AuthProvider } from '../../components/auth-provider';
export function generateStaticParams() { return locales.map((locale) => ({ locale })); }
export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params; if (!isLocale(locale)) notFound();
  return <AuthProvider><div className="locale-root" lang={locale} dir={direction(locale)}>{children}</div></AuthProvider>;
}

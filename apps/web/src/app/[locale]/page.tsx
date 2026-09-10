import { notFound } from 'next/navigation';
import { Header } from '../../components/header';
import { StreamingHome } from '../../components/streaming-home';
import { isLocale } from '../../i18n';
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; if (!isLocale(locale)) notFound();
  return <main><div className="shell"><Header locale={locale}/></div><StreamingHome locale={locale}/></main>;
}

import { notFound } from 'next/navigation';
import { AdminDashboard } from '../../../components/admin-dashboard';
import { Header } from '../../../components/header';
import { isLocale } from '../../../i18n';

export default async function AdminHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <main className="shell"><Header locale={locale}/>
    <section className="admin-heading"><p className="eyebrow">STREAMLY CONTROL</p><h1>Back-office</h1><p className="lead">Pilotez le catalogue, les sources et la diffusion depuis un espace central.</p></section>
    <AdminDashboard locale={locale}/>
  </main>;
}

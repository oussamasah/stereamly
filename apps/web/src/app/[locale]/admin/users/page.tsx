import { notFound } from 'next/navigation';
import { AdminNav } from '../../../../components/admin-nav';
import { Header } from '../../../../components/header';
import { isLocale } from '../../../../i18n';
import { UsersAdmin } from '../../../../features/viewing/users';
export default async function Page({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; if (!isLocale(locale)) notFound(); return <main className="shell"><Header locale={locale}/><AdminNav locale={locale} current="users"/><div className="admin-heading"><p className="eyebrow">ACCÈS</p><h1>Utilisateurs & rôles</h1><p className="lead">Contrôlez les permissions du back-office et suspendez un compte sans supprimer son historique.</p></div><UsersAdmin/></main>; }

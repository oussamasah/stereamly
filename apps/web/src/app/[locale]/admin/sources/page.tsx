import { notFound } from "next/navigation";
import { AdminNav } from "../../../../components/admin-nav";
import { Header } from "../../../../components/header";
import { SourcesWorkspace } from "../../../../components/sources-workspace";
import { isLocale } from "../../../../i18n";
export default async function AdminSources({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <main className="shell">
      <Header locale={locale} />
      <AdminNav locale={locale} current="sources" />
      <div className="admin-heading">
        <p className="eyebrow">DIFFUSION</p>
        <h1>Sources de streaming</h1>
        <p className="lead">
          Gérez les fournisseurs IPTV qui alimentent le catalogue et les
          serveurs de lecture de secours depuis un seul espace.
        </p>
      </div>
      <SourcesWorkspace locale={locale} />
    </main>
  );
}

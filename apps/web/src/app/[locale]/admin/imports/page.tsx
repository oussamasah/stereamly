import { notFound } from "next/navigation";
import { AdminNav } from "../../../../components/admin-nav";
import { Header } from "../../../../components/header";
import { ImportManager } from "../../../../components/import-manager";
import { isLocale } from "../../../../i18n";

export default async function AdminImports({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <main className="shell">
      <Header locale={locale} />
      <AdminNav locale={locale} current="imports" />
      <div className="admin-heading">
        <p className="eyebrow">CATALOGUE</p>
        <h1>Bibliothèque TV &amp; Live</h1>
        <p className="lead">
          Synchronisez, contrôlez et publiez les chaînes provenant de vos
          entrées M3U, Xtream, Portal et URL directe.
        </p>
      </div>
      <ImportManager locale={locale} />
    </main>
  );
}

import { notFound } from "next/navigation";
import { isLocale } from "../../../../i18n";
import { redirect } from "next/navigation";

export default async function AdminProviders({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirect(`/${locale}/admin/sources`);
}

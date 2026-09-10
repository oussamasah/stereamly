import { notFound } from 'next/navigation';
import { RouteGuard } from '../../../components/route-guard';
import { isLocale } from '../../../i18n';
export default async function ListLayout({children,params}:{children:React.ReactNode;params:Promise<{locale:string}>}){const{locale}=await params;if(!isLocale(locale))notFound();return <RouteGuard locale={locale}>{children}</RouteGuard>}

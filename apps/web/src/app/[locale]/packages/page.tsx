import { notFound, redirect } from 'next/navigation'; import { isLocale } from '../../../i18n';
export default async function Packages({params}:{params:Promise<{locale:string}>}){const {locale}=await params;if(!isLocale(locale))notFound();redirect(`/${locale}`);}

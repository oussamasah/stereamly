import { NextRequest, NextResponse } from 'next/server';
import { locales } from './i18n';
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (locales.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`))) return NextResponse.next();
  const preferred = request.headers.get('accept-language')?.toLowerCase() ?? '';
  const locale = preferred.startsWith('ar') ? 'ar' : preferred.startsWith('en') ? 'en' : 'fr';
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}
export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'] };


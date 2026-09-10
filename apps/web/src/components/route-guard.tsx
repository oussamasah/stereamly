'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Locale } from '../i18n';
import { adminRoles, useAuth } from './auth-provider';

export function RouteGuard({ children, locale, admin = false }: { children: React.ReactNode; locale: Locale; admin?: boolean }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const role = user?.role ?? '';
  const technicalPage = /\/admin\/(sources|imports)(?:\/|$)/.test(pathname);
  const permitted = adminRoles.has(role) && (!technicalPage || role === 'TECHNICAL_ADMIN' || role === 'SUPER_ADMIN');
  const forbidden = status === 'authenticated' && admin && !permitted;

  useEffect(() => {
    if (status === 'anonymous') router.replace(`/${locale}/login?next=${encodeURIComponent(pathname)}`);
    else if (forbidden) router.replace(`/${locale}/account?forbidden=admin`);
  }, [forbidden, locale, pathname, router, status]);

  if (status === 'loading') return <main className="auth-gate" aria-busy="true"><div className="auth-gate-spinner"/><p>Vérification de votre session…</p></main>;
  if (status === 'anonymous') return <main className="auth-gate"><p>Redirection vers la connexion…</p></main>;
  if (forbidden) return <main className="auth-gate"><h1>Accès administrateur requis</h1><p>Votre compte ne possède pas les droits nécessaires.</p></main>;
  return children;
}

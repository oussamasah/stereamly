'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { getMessages, Locale } from '../i18n';
import { adminRoles, AuthUser, useAuth } from './auth-provider';

type Session = { accessToken?: string; user?: AuthUser };

export function AuthForm({ locale, mode }: { locale: Locale; mode: 'login' | 'register' }) {
  const t = getMessages(locale);
  const router = useRouter();
  const { status: authStatus, user: currentUser, acceptSession } = useAuth();
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const api = process.env.NEXT_PUBLIC_API_URL;

  const copy = locale === 'en'
    ? { wait: 'Signing you in…', unavailable: 'Service temporarily unavailable.', created: 'Account created. Preparing your space…', welcome: 'Welcome', verify: 'Account created. Check your email before signing in.' }
    : locale === 'ar'
      ? { wait: 'جارٍ تسجيل الدخول…', unavailable: 'الخدمة غير متاحة مؤقتًا.', created: 'تم إنشاء الحساب. جارٍ تجهيز مساحتك…', welcome: 'مرحبًا', verify: 'تم إنشاء الحساب. تحقق من بريدك الإلكتروني قبل تسجيل الدخول.' }
      : { wait: 'Connexion en cours…', unavailable: 'Service temporairement indisponible.', created: 'Compte créé. Préparation de votre espace…', welcome: 'Bienvenue', verify: 'Compte créé. Vérifiez votre e-mail avant de vous connecter.' };

  function destination(role?: string) { return role && adminRoles.has(role) ? `/${locale}/admin` : `/${locale}`; }
  function saveAndRedirect(session: Session) {
    if (!session.accessToken || !session.user) return false;
    acceptSession({ accessToken: session.accessToken, user: session.user });
    setStatus(`${copy.welcome} ${session.user.displayName}. Redirection…`);
    const requested = new URLSearchParams(window.location.search).get('next');
    const safeNext = requested?.startsWith(`/${locale}/`) && !requested.startsWith('//') ? requested : null;
    router.replace(safeNext ?? destination(session.user.role));
    router.refresh();
    return true;
  }

  useEffect(() => {
    if (authStatus === 'authenticated') router.replace(currentUser?.role && adminRoles.has(currentUser.role) ? `/${locale}/admin` : `/${locale}`);
  }, [authStatus, currentUser?.role, locale, router]);

  async function post(path: string, body: unknown) {
    return fetch(`${api}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus(mode === 'login' ? copy.wait : copy.created);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const credentials = { email: data.email, password: data.password };
    try {
      if (mode === 'login') {
        const response = await post('/auth/login', credentials);
        const result = await response.json() as Session & { message?: string };
        if (!response.ok) { setStatus(result.message ?? 'Erreur de connexion'); return; }
        if (!saveAndRedirect(result)) setStatus('Réponse de connexion incomplète.');
        return;
      }

      const registration = await post('/auth/register', { ...credentials, displayName: data.displayName, locale });
      const registered = await registration.json() as { verificationToken?: string; message?: string };
      if (!registration.ok) { setStatus(registered.message ?? 'Erreur lors de la création du compte'); return; }

      if (!registered.verificationToken) {
        setStatus(copy.verify);
        window.setTimeout(() => router.replace(`/${locale}/login?registered=1`), 900);
        return;
      }

      const verification = await post('/auth/verify-email', { token: registered.verificationToken });
      if (!verification.ok) { setStatus(copy.verify); return; }
      const login = await post('/auth/login', credentials);
      const session = await login.json() as Session & { message?: string };
      if (!login.ok || !saveAndRedirect(session)) setStatus(session.message ?? copy.verify);
    } catch { setStatus(copy.unavailable); }
    finally { setBusy(false); }
  }

  const hasError = /erreur|error|invalid|incorrect|indisponible|unavailable|suspendu|expired|required/i.test(status);
  return <form onSubmit={submit} aria-busy={busy}>
    {mode === 'register' && <label>{t.name}<input name="displayName" autoComplete="name" minLength={2} placeholder={locale === 'en' ? 'Your name' : locale === 'ar' ? 'اسمك' : 'Votre nom'} required /></label>}
    <label>{t.email}<input name="email" type="email" autoComplete="email" inputMode="email" placeholder="name@example.com" required /></label>
    <label>{t.password}<input name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={12} placeholder="••••••••••••" required />{mode === 'register' && <span className="field-hint">{locale === 'en' ? 'Use at least 12 characters.' : locale === 'ar' ? 'استخدم 12 حرفًا على الأقل.' : 'Utilisez au moins 12 caractères.'}</span>}</label>
    <button className="button" disabled={busy}>{busy ? copy.wait : mode === 'register' ? t.create : t.submitLogin}</button>
    {<div className="view-actions"><Link href={`/${locale}/forgot-password`}>{locale==='ar'?'نسيت كلمة المرور؟':locale==='fr'?'Mot de passe oublié ?':'Forgot password?'}</Link><Link href={`/${locale}/resend-verification`}>{locale==='ar'?'إعادة إرسال التأكيد':locale==='fr'?'Renvoyer la vérification':'Resend verification'}</Link></div>}
    <p className={`form-status ${hasError ? 'error' : ''}`} aria-live="polite">{status}</p>
  </form>;
}

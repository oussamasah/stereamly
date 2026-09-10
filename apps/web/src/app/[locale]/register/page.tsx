import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AuthForm } from '../../../components/auth-form';
import { Header } from '../../../components/header';
import { isLocale } from '../../../i18n';

export default async function Register({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = locale === 'en'
    ? { eye:'YOUR STREAMING, YOUR WAY', title:'One place. Every screen.', lead:'Build your watchlist, follow live channels and pick up exactly where you left off.', points:['Personal recommendations','Continue watching on any device','No commitment, cancel anytime'], form:'Create your account', sub:'Start exploring in less than a minute.', switch:'Already have an account?', link:'Sign in' }
    : locale === 'ar'
      ? { eye:'مشاهدتك، بطريقتك', title:'مكان واحد. كل الشاشات.', lead:'أنشئ قائمتك وتابع القنوات المباشرة وأكمل من حيث توقفت.', points:['اقتراحات مخصصة','تابع المشاهدة على أي جهاز','بدون التزام، ألغِ في أي وقت'], form:'إنشاء حساب', sub:'ابدأ الاستكشاف في أقل من دقيقة.', switch:'لديك حساب بالفعل؟', link:'تسجيل الدخول' }
      : { eye:'VOTRE STREAMING, À VOTRE FAÇON', title:'Un seul espace. Tous vos écrans.', lead:'Créez votre liste, suivez le direct et reprenez exactement là où vous vous êtes arrêté.', points:['Des recommandations personnalisées','Reprenez sur tous vos appareils','Sans engagement, résiliez à tout moment'], form:'Créer votre compte', sub:'Commencez à explorer en moins d’une minute.', switch:'Vous avez déjà un compte ?', link:'Se connecter' };
  return <main className="shell"><Header locale={locale}/><div className="auth-page">
    <section className="auth-intro"><p className="eyebrow">{copy.eye}</p><h1>{copy.title}</h1><p className="lead">{copy.lead}</p><div className="auth-points">{copy.points.map(point=><span className="auth-point" key={point}>{point}</span>)}</div></section>
    <section className="auth"><h2>{copy.form}</h2><p className="auth-subtitle">{copy.sub}</p><AuthForm locale={locale} mode="register"/><p className="auth-switch">{copy.switch} <Link href={`/${locale}/login`}>{copy.link}</Link></p></section>
  </div></main>;
}

import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
@Injectable()
export class MailService {
  private readonly transport?: Transporter;
  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    if (host) {
      const port = Number(config.get('SMTP_PORT', 587));
      this.transport = createTransport({
        host, port, secure: port === 465, requireTLS: true,
        auth: { user: config.getOrThrow('SMTP_USER'), pass: config.getOrThrow('SMTP_PASSWORD') },
        connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
        disableFileAccess: true, disableUrlAccess: true,
      });
    }
  }
  assertAvailable() {
    if (this.config.get('NODE_ENV') === 'production' && (!this.transport || !this.config.get('EMAIL_FROM'))) throw new ServiceUnavailableException('EMAIL_DELIVERY_NOT_CONFIGURED');
  }
  async send(to: string, locale: string, kind: 'verify' | 'reset', token: string) {
    this.assertAvailable();
    if (!this.transport) return;
    const language = ['en', 'fr', 'ar'].includes(locale) ? locale : 'en';
    const url = new URL(`/${language}/${kind === 'verify' ? 'verify-email' : 'reset-password'}`, this.config.getOrThrow('WEB_ORIGIN'));
    // Fragment tokens are not sent in URL requests or referrer headers.
    url.hash = `token=${encodeURIComponent(token)}`;
    const subjects = {
      en: { verify: 'Verify your Streamly email', reset: 'Reset your Streamly password' },
      fr: { verify: 'Vérifiez votre adresse Streamly', reset: 'Réinitialisez votre mot de passe Streamly' },
      ar: { verify: 'تأكيد بريدك في Streamly', reset: 'إعادة تعيين كلمة مرور Streamly' },
    };
    const subject = subjects[language as keyof typeof subjects][kind];
    try { await this.transport.sendMail({ from: this.config.getOrThrow('EMAIL_FROM'), to, subject, text: `${subject}\n\n${url.toString()}\n\nStreamly` }); }
    catch { throw new ServiceUnavailableException('EMAIL_DELIVERY_FAILED_RETRY'); }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  DEFAULT_LOCALE,
  type LocaleCode,
  type MessageKey,
  t,
} from '../common/i18n';

export type MailPurpose =
  'signup' | 'password-reset' | 'platform-2fa' | 'platform-password-reset';

/** Member-facing codes are sent in the person's language; the platform-staff
 * console is English-only, so its two purposes keep the literal copy below. */
const LOCALIZED_CODES: Partial<
  Record<MailPurpose, { subject: MessageKey; lead: MessageKey }>
> = {
  signup: {
    subject: 'mail.code.signup.subject',
    lead: 'mail.code.signup.lead',
  },
  'password-reset': {
    subject: 'mail.code.passwordReset.subject',
    lead: 'mail.code.passwordReset.lead',
  },
};

const CODE_SUBJECTS: Record<MailPurpose, string> = {
  signup: 'Your Drift Tennis verification code',
  'password-reset': 'Reset your Drift Tennis password',
  'platform-2fa': 'Your Drift Tennis staff sign-in code',
  'platform-password-reset': 'Reset your Drift Tennis staff password',
};

const CODE_LEAD: Record<MailPurpose, string> = {
  signup: 'Welcome to Drift Tennis. Your email verification code is:',
  'password-reset': 'Use the code below to reset your Drift Tennis password:',
  'platform-2fa': 'Your Drift Tennis staff sign-in code is:',
  'platform-password-reset':
    'Use the code below to reset your Drift Tennis staff password:',
};

/**
 * SMTP delivery for every transactional email in the product. The transport is
 * built once from env at construction; when SMTP_HOST is absent the service is
 * disabled and every send is a no-op — callers keep their pre-mailer behaviour
 * (dev console codes, `PENDING_PROVIDER` delivery) instead of failing.
 *
 * Sends never throw: a mail outage must not take down login, verification or
 * support flows. Failures are logged loudly and reported via the boolean
 * return, which callers surface as delivery status.
 *
 * Member-facing mails take the recipient's `locale` (see `common/i18n`) and
 * default to English; platform-staff mails are English-only.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: Transporter | null = null;
  private readonly from: string;

  constructor(config: ConfigService) {
    this.from =
      config.get<string>('MAIL_FROM') ??
      'Drift Tennis <no-reply@einsbrand.com>';

    const host = config.get<string>('SMTP_HOST');
    if (!host) return;

    const port = Number(config.get<string>('SMTP_PORT') ?? '465');
    const user = config.get<string>('SMTP_USER');
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      ...(user
        ? { auth: { user, pass: config.get<string>('SMTP_PASS') ?? '' } }
        : {}),
    });
    this.logger.log(`SMTP transport configured for ${host}:${port}`);
  }

  get enabled(): boolean {
    return this.transporter !== null;
  }

  private async send(
    to: string,
    subject: string,
    text: string,
  ): Promise<boolean> {
    if (!this.transporter) return false;
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, text });
      return true;
    } catch (err) {
      this.logger.error(
        `Mail to ${to} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }

  async sendVerificationCode(
    to: string,
    code: string,
    purpose: MailPurpose,
    locale: LocaleCode = DEFAULT_LOCALE,
  ): Promise<boolean> {
    const localized = LOCALIZED_CODES[purpose];
    // Staff codes stay English whatever locale is passed.
    const lang = localized ? locale : DEFAULT_LOCALE;
    return this.send(
      to,
      localized ? t(lang, localized.subject) : CODE_SUBJECTS[purpose],
      [
        localized ? t(lang, localized.lead) : CODE_LEAD[purpose],
        '',
        `  ${code}`,
        '',
        t(lang, 'mail.code.expiry'),
        t(lang, 'mail.code.ignore'),
        '',
        t(lang, 'mail.signoff'),
      ].join('\n'),
    );
  }

  async sendPlatformInvitation(
    to: string,
    inviteUrl: string,
    expiresAt: Date,
  ): Promise<boolean> {
    return this.send(
      to,
      'You have been invited to Drift Tennis Platform Admin',
      [
        'You have been invited to a Drift Tennis platform staff account.',
        '',
        `Accept your invitation (valid until ${expiresAt.toISOString()}):`,
        inviteUrl,
        '',
        'If you were not expecting this, ignore this email.',
        '',
        '— Drift Tennis',
      ].join('\n'),
    );
  }

  async sendClubSetupLink(
    to: string,
    setupUrl: string,
    locale: LocaleCode = DEFAULT_LOCALE,
  ): Promise<boolean> {
    return this.send(
      to,
      t(locale, 'mail.clubSetup.subject'),
      [
        t(locale, 'mail.clubSetup.approved'),
        '',
        t(locale, 'mail.clubSetup.finish'),
        setupUrl,
        '',
        t(locale, 'mail.ignoreIfNotRequested'),
        '',
        t(locale, 'mail.signoff'),
      ].join('\n'),
    );
  }

  async sendClubWelcome(
    to: string,
    clubName: string,
    role: string,
    locale: LocaleCode = DEFAULT_LOCALE,
  ): Promise<boolean> {
    // An unknown role (one added to the enum but not the catalogs) is shown
    // as its raw value rather than as a missing key.
    const roleKey = `mail.role.${role}` as MessageKey;
    const translatedRole = t(locale, roleKey);
    const roleLabel = translatedRole === roleKey ? role : translatedRole;
    return this.send(
      to,
      t(locale, 'mail.clubWelcome.subject', { club: clubName }),
      [
        t(locale, 'mail.clubWelcome.added', {
          club: clubName,
          role: roleLabel,
        }),
        '',
        t(locale, 'mail.clubWelcome.open'),
        '',
        t(locale, 'mail.signoff'),
      ].join('\n'),
    );
  }

  /**
   * Sent once an account is ready to use. Player and coach accounts share the
   * same account-creation flow, so the member version deliberately welcomes
   * both without assuming why someone joined. Club owners receive the club
   * version after they complete their approved setup.
   */
  async sendWelcome(
    to: string,
    firstName?: string | null,
    clubName?: string,
    locale: LocaleCode = DEFAULT_LOCALE,
  ): Promise<boolean> {
    const name = firstName?.trim();
    const greeting = name
      ? t(locale, 'mail.welcome.greetingNamed', { name })
      : t(locale, 'mail.welcome.greeting');
    const club = clubName?.trim();

    return this.send(
      to,
      club
        ? t(locale, 'mail.welcomeClub.subject', { club })
        : t(locale, 'mail.welcome.subject'),
      [
        greeting,
        '',
        club
          ? t(locale, 'mail.welcomeClub.body', { club })
          : t(locale, 'mail.welcome.body'),
        // The club version closes on its own paragraph; the member version's
        // last line ("See you on court,") leads straight into the sign-off.
        ...(club ? [''] : []),
        t(locale, 'mail.signoff'),
      ].join('\n'),
    );
  }

  /**
   * Waitlist confirmation for the public site. Not a `MailPurpose` — that
   * union is for verification-code mails, and this carries no code.
   *
   * The promise here has to match the public privacy copy: launch news first,
   * followed only by occasional internal Drift Tennis updates or offers.
   */
  async sendWaitlistConfirmation(
    to: string,
    firstName?: string,
    locale: LocaleCode = DEFAULT_LOCALE,
  ): Promise<boolean> {
    const name = firstName?.trim();
    const greeting = name
      ? t(locale, 'mail.waitlist.greetingNamed', { name })
      : t(locale, 'mail.waitlist.greeting');

    return this.send(
      to,
      t(locale, 'mail.waitlist.subject'),
      [greeting, '', t(locale, 'mail.waitlist.body'), '', 'Drift Tennis'].join(
        '\n',
      ),
    );
  }

  async sendSupportReply(
    to: string,
    ticketSubject: string,
    reply: string,
    locale: LocaleCode = DEFAULT_LOCALE,
  ): Promise<boolean> {
    return this.send(
      to,
      t(locale, 'mail.support.subject', { subject: ticketSubject }),
      [
        t(locale, 'mail.support.lead'),
        '',
        `  "${reply}"`,
        '',
        t(locale, 'mail.support.open'),
        '',
        t(locale, 'mail.signoff'),
      ].join('\n'),
    );
  }

  /**
   * One recipient of a platform-admin broadcast to the launch waitlist.
   * Not a `MailPurpose` — that union is for verification-code mails. The
   * subject and body come verbatim from the admin; only the greeting is
   * personalised, and only when the signup gave a first name.
   */
  async sendWaitlistBroadcast(
    to: string,
    firstName: string | null | undefined,
    subject: string,
    body: string,
  ): Promise<boolean> {
    const greeting = firstName?.trim() ? `Hi ${firstName.trim()},` : 'Hi,';

    return this.send(
      to,
      subject,
      [greeting, '', body.trim(), '', '— Drift Tennis'].join('\n'),
    );
  }
}

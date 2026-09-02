import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export type MailPurpose =
  | 'signup'
  | 'password-reset'
  | 'platform-2fa'
  | 'platform-password-reset';

const CODE_SUBJECTS: Record<MailPurpose, string> = {
  signup: 'Your Drift Tennis verification code',
  'password-reset': 'Reset your Drift Tennis password',
  'platform-2fa': 'Your Drift Tennis staff sign-in code',
  'platform-password-reset': 'Reset your Drift Tennis staff password',
};

const CODE_LEAD: Record<MailPurpose, string> = {
  signup: 'Welcome to Drift Tennis. Your email verification code is:',
  'password-reset':
    'Use the code below to reset your Drift Tennis password:',
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
  ): Promise<boolean> {
    return this.send(
      to,
      CODE_SUBJECTS[purpose],
      [
        CODE_LEAD[purpose],
        '',
        `  ${code}`,
        '',
        'The code expires in 10 minutes and can be used once.',
        'If you did not request this, ignore this email — your account is safe.',
        '',
        '— Drift Tennis',
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

  async sendClubSetupLink(to: string, setupUrl: string): Promise<boolean> {
    return this.send(
      to,
      'Your Drift Tennis club was approved — finish setting it up',
      [
        'Your club creation request has been approved.',
        '',
        'Finish setting up your club account:',
        setupUrl,
        '',
        'If you did not request this, ignore this email.',
        '',
        '— Drift Tennis',
      ].join('\n'),
    );
  }

  async sendClubWelcome(
    to: string,
    clubName: string,
    role: string,
  ): Promise<boolean> {
    return this.send(
      to,
      `You have been added to ${clubName} on Drift Tennis`,
      [
        `You have been added to ${clubName} as ${role}.`,
        '',
        'Open the Drift Tennis app to see your club.',
        '',
        '— Drift Tennis',
      ].join('\n'),
    );
  }

  async sendSupportReply(
    to: string,
    ticketSubject: string,
    reply: string,
  ): Promise<boolean> {
    return this.send(
      to,
      `Re: ${ticketSubject} — new reply from Drift Tennis support`,
      [
        'Support has replied to your ticket:',
        '',
        `  "${reply}"`,
        '',
        'Open the Drift Tennis app to continue the conversation.',
        '',
        '— Drift Tennis',
      ].join('\n'),
    );
  }
}

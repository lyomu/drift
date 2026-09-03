import { createHash } from 'crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

const HIBP_RANGE_URL = 'https://api.pwnedpasswords.com/range';
const HIBP_TIMEOUT_MS = 3_000;
const DISABLE_ENV_VALUES = new Set(['1', 'true', 'yes', 'on']);

@Injectable()
export class PasswordPolicyService {
  private readonly logger = new Logger(PasswordPolicyService.name);

  constructor(private readonly config: ConfigService) {}

  async assertAcceptable(password: string): Promise<void> {
    if (password.length < PASSWORD_MIN_LENGTH) {
      throw new BadRequestException(
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
      );
    }
    if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_LENGTH) {
      throw new BadRequestException(
        `Password must be no more than ${PASSWORD_MAX_LENGTH} bytes long.`,
      );
    }

    if (this.checkDisabled()) return;

    const sha1 = createHash('sha1')
      .update(password)
      .digest('hex')
      .toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const range = await this.fetchRange(prefix);
    if (range == null) return;

    const breached = range
      .split(/\r?\n/)
      .some((line) => line.split(':', 1)[0].toUpperCase() === suffix);
    if (breached) {
      throw new BadRequestException(
        'Choose a password that has not appeared in a known data breach.',
      );
    }
  }

  private checkDisabled(): boolean {
    const nodeEnv = this.config.get<string>('NODE_ENV') ?? process.env.NODE_ENV;
    if (nodeEnv === 'test') return true;

    const disabled =
      this.config.get<string>('PASSWORD_BREACH_CHECK_DISABLED') ??
      process.env.PASSWORD_BREACH_CHECK_DISABLED;
    return DISABLE_ENV_VALUES.has((disabled ?? '').trim().toLowerCase());
  }

  private async fetchRange(prefix: string): Promise<string | null> {
    try {
      const response = await fetch(`${HIBP_RANGE_URL}/${prefix}`, {
        headers: { 'Add-Padding': 'true' },
        signal: AbortSignal.timeout(HIBP_TIMEOUT_MS),
      });
      if (response.status !== 200) {
        this.logger.warn(
          `Breached-password check failed open: HIBP returned ${response.status}`,
        );
        return null;
      }
      return response.text();
    } catch (err) {
      this.logger.warn(
        `Breached-password check failed open: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return null;
    }
  }
}

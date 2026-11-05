import {
  Equals,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../password-policy';
import { AGE_POLICY_ERROR_MESSAGE } from '../age-policy';
import { LOCALES, type LocaleCode } from '../../common/i18n';

export class SignUpDto {
  @IsEmail()
  email: string;

  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;

  /** Collected here now instead of deferred to Basic Profile — see
   * `BasicProfileDto.firstName`/`lastName`, which stay required so a Google/
   * Apple sign-up (never touches this DTO) still can't skip past them. */
  @IsString()
  @MinLength(1)
  firstName: string;

  @IsString()
  @MinLength(1)
  lastName: string;

  /** Optional contact detail, stored unverified — see `User.phone`.
   * `IsPhoneNumber()` with no region requires E.164 (`+254…`), which is what
   * the client sends and the only form that is unambiguous across countries. */
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  phoneOnWhatsApp?: boolean;

  @Equals(true, { message: AGE_POLICY_ERROR_MESSAGE })
  acceptedAgePolicy!: true;

  /** The device language at signup (`en`/`fr`/`es`), so the very first
   * email is already in it. Becomes `User.preferredLocale`. */
  @IsOptional()
  @IsIn(LOCALES)
  locale?: LocaleCode;
}

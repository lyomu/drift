import {
  Equals,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../password-policy';
import { AGE_POLICY_ERROR_MESSAGE } from '../age-policy';

export class SignUpDto {
  @IsEmail()
  email: string;

  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;

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
}

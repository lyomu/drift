import { Equals, IsEmail, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../password-policy';
import { AGE_POLICY_ERROR_MESSAGE } from '../age-policy';

export class SignUpDto {
  @IsEmail()
  email: string;

  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;

  @Equals(true, { message: AGE_POLICY_ERROR_MESSAGE })
  acceptedAgePolicy!: true;
}

import { Type } from 'class-transformer';
import {
  Equals,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { AuthProvider } from '@prisma/client';
import { AGE_POLICY_ERROR_MESSAGE } from '../age-policy';

class NewSocialAccountPolicyDto {
  @IsOptional()
  @Equals(true, { message: AGE_POLICY_ERROR_MESSAGE })
  acceptedAgePolicy?: true;
}

export class OAuthGoogleDto extends NewSocialAccountPolicyDto {
  @IsString()
  @IsNotEmpty()
  idToken!: string;

  @IsOptional()
  @IsString()
  nonce?: string;
}

export class AppleNameDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;
}

export class OAuthAppleDto extends NewSocialAccountPolicyDto {
  @IsString()
  @IsNotEmpty()
  identityToken!: string;

  @IsOptional()
  @IsString()
  nonce?: string;

  /** Apple returns the name only on the very first authorization — persisted then or lost. */
  @IsOptional()
  @ValidateNested()
  @Type(() => AppleNameDto)
  name?: AppleNameDto;
}

/** Completes the 4.2 fallback: prove the password of the existing account,
 * then attach the verified social identity to it. */
export class OAuthLinkDto {
  @IsIn([AuthProvider.GOOGLE, AuthProvider.APPLE])
  provider!: AuthProvider;

  @IsString()
  @IsNotEmpty()
  idToken!: string;

  @IsOptional()
  @IsString()
  nonce?: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AppleNameDto)
  name?: AppleNameDto;
}

import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../../auth/password-policy';

export class SubmitClubRequestDto {
  @IsString()
  @MaxLength(200)
  clubName: string;

  @IsString()
  @MaxLength(300)
  location: string;

  @IsString()
  @MaxLength(200)
  requesterName: string;

  @IsEmail()
  @MaxLength(320)
  requesterEmail: string;
}

export class CompleteClubSetupDto {
  // Required only when no Drift account exists yet for the request email —
  // the service enforces that; here it stays optional so an existing-account
  // completion (authenticated) can omit it.
  @IsOptional()
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  requesterName?: string;
}

export class ReviewClubRequestDto {
  @IsIn(['APPROVE', 'REJECT'])
  action: 'APPROVE' | 'REJECT';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  decisionNote?: string;
}

import {
  IsEnum,
  IsIn,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { VerificationStatus } from '@prisma/client';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../../auth/password-policy';

export class LoginPlatformAdminDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  password!: string;
}

export class ForgotPlatformAdminPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPlatformAdminPasswordDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  newPassword!: string;
}

export class UpdateUserStatusDto {
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status!: 'ACTIVE' | 'SUSPENDED';
}

export class UpdateUserVerificationDto {
  // Account-level identity verification, not CoachProfile listing
  // verification — see PlatformAdminService.setUserVerification.
  @IsEnum(VerificationStatus)
  status!: VerificationStatus;
}

export class UpdateReportDto {
  @IsIn(['REVIEWING', 'RESOLVED', 'DISMISSED'])
  status!: 'REVIEWING' | 'RESOLVED' | 'DISMISSED';
}

export class UpsertNewsSourceDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  feedUrl?: string | null;

  @IsIn(['ACTIVE', 'PAUSED', 'BLOCKED'])
  status!: 'ACTIVE' | 'PAUSED' | 'BLOCKED';
}

export class ModerateStoryDto {
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  moderationStatus!: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export class RuleDisputeDto {
  // 'SUBMITTED' upholds the submitter's version; 'DISPUTANT' upholds the
  // disputer's — same contract as club-admin's dispute queue, reusing
  // ResultsService.adminResolveDispute unchanged.
  @IsIn(['SUBMITTED', 'DISPUTANT'])
  ruling!: 'SUBMITTED' | 'DISPUTANT';
}

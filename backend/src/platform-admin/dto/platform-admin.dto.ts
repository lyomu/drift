import {
  IsEnum,
  IsIn,
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsBoolean,
  Length,
  Matches,
  MaxLength,
  MinLength,
  IsInt,
  Min,
  Max,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
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

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string | null;

  @IsOptional()
  @IsPhoneNumber()
  @MaxLength(32)
  phone?: string | null;

  @IsOptional()
  @IsBoolean()
  phoneOnWhatsApp?: boolean;
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

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(120)
  pollIntervalMinutes?: number;

  @IsOptional()
  @IsIn(['MANUAL', 'AUTO'])
  publicationMode?: 'MANUAL' | 'AUTO';
}

export class UpdateNewsSourceRightsDto {
  @IsIn(['UNREVIEWED', 'APPROVED', 'RESTRICTED', 'REVOKED'])
  status!: 'UNREVIEWED' | 'APPROVED' | 'RESTRICTED' | 'REVOKED';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  termsUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  permissionReference?: string;

  @IsBoolean() commercialUseAllowed!: boolean;
  @IsBoolean() headlineAllowed!: boolean;
  @IsBoolean() excerptAllowed!: boolean;
  @IsBoolean() imageAllowed!: boolean;
  @IsBoolean() aiProcessingAllowed!: boolean;
  @IsBoolean() automaticPublishingAllowed!: boolean;
  @IsBoolean() cacheAllowed!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  attributionText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}

export class ModerateStoryDto {
  @IsIn(['PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED'])
  moderationStatus!: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class UpdateNewsStoryDto {
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  headline!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(300)
  highlight!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @Matches(/^[A-Z][A-Z0-9_]{0,49}$/, { each: true })
  categories!: string[];

  @IsInt()
  @Min(1)
  editorialVersion!: number;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class CreateNewsCategoryDto {
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]{0,49}$/)
  slug!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  label!: string;

  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder!: number;
}

export class UpdateNewsCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  label!: string;

  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder!: number;

  @IsBoolean()
  enabled!: boolean;
}

export class UpdateNewsSettingsDto {
  @IsBoolean()
  ingestionPaused!: boolean;

  @IsBoolean() aiEnabled!: boolean;
  @IsBoolean() automaticPublishingEnabled!: boolean;
  @IsInt() @Min(1) @Max(1000) aiDailyRequestLimit!: number;
  @IsInt() @Min(80) @Max(300) aiSummaryMaxCharacters!: number;
  @IsOptional() @IsInt() @Min(15) @Max(120) retryBaseMinutes?: number;
  @IsOptional() @IsInt() @Min(7) @Max(365) runRetentionDays?: number;
}

export class RuleDisputeDto {
  // 'SUBMITTED' upholds the submitter's version; 'DISPUTANT' upholds the
  // disputer's — same contract as club-admin's dispute queue, reusing
  // ResultsService.adminResolveDispute unchanged.
  @IsIn(['SUBMITTED', 'DISPUTANT'])
  ruling!: 'SUBMITTED' | 'DISPUTANT';
}

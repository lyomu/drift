import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  BillingSubscriptionStatus,
  ClubPlatformStatus,
  ListingVerificationStatus,
} from '@prisma/client';

export class UpdateOrganizationProfileDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string | null;

  @IsEnum(ListingVerificationStatus)
  verificationStatus!: ListingVerificationStatus;
}

export class UpdateOrganizationStatusDto {
  @IsEnum(ClubPlatformStatus)
  status!: ClubPlatformStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class ReviewAdminApprovalDto {
  @IsIn(['APPROVE', 'REJECT'])
  action!: 'APPROVE' | 'REJECT';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class OverrideClubSubscriptionDto {
  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsEnum(BillingSubscriptionStatus)
  status?: BillingSubscriptionStatus;

  @IsOptional()
  @IsDateString()
  currentPeriodEnd?: string;

  @IsString()
  @MaxLength(1000)
  reason!: string;
}

export class ReviewEscalatedModerationDto {
  @IsIn(['APPROVE', 'REMOVE'])
  action!: 'APPROVE' | 'REMOVE';

  @IsString()
  @MaxLength(1000)
  reason!: string;
}

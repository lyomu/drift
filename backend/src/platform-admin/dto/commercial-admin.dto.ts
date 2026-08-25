import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  BillingAudience,
  BillingInterval,
  PromotionDiscountType,
} from '@prisma/client';

export class UpsertPaymentPlanDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsEnum(BillingAudience)
  audience!: BillingAudience;

  @IsInt()
  @Min(0)
  priceMinor!: number;

  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency!: string;

  @IsEnum(BillingInterval)
  interval!: BillingInterval;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  entitlements?: string[];

  @IsBoolean()
  isActive!: boolean;

  @IsOptional()
  @IsBoolean()
  isTest?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class RefundTransactionDto {
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}

export class UpsertPromotionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsOptional()
  @IsEnum(BillingAudience)
  audience?: BillingAudience | null;

  @IsEnum(PromotionDiscountType)
  discountType!: PromotionDiscountType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  percentOff?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  amountOffMinor?: number | null;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency?: string | null;

  @IsDateString()
  startsAt!: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptions?: number | null;

  @IsBoolean()
  isActive!: boolean;
}

export class DeactivatePromotionDto {
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}

export class UpsertSponsorPlacementDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  sponsorName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  placementKey!: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(1000)
  destinationUrl?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(1000)
  imageUrl?: string | null;

  @IsDateString()
  startsAt!: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string | null;

  @IsBoolean()
  isActive!: boolean;
}

export class DeactivateSponsorPlacementDto {
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}

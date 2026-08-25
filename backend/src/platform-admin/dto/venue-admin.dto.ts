import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CourtBookingType,
  CourtSurface,
  ListingVerificationStatus,
  MatchSport,
} from '@prisma/client';

export class PlatformVenueCourtGroupDto {
  @IsEnum(MatchSport)
  sport!: MatchSport;

  @IsEnum(CourtSurface)
  surface!: CourtSurface;

  @IsBoolean()
  indoor!: boolean;

  @IsBoolean()
  lighting!: boolean;

  @IsInt()
  @Min(1)
  @Max(100)
  count!: number;
}

export class UpsertPlatformVenueDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string | null;

  @IsEnum(CourtBookingType)
  bookingType!: CourtBookingType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bookingUrl?: string | null;

  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  amenities!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  openingHoursNote?: string | null;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean | null;

  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  photoUrls!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(300)
  googlePlacesRef?: string | null;

  @IsOptional()
  @IsString()
  clubId?: string | null;

  @IsEnum(ListingVerificationStatus)
  verificationStatus!: ListingVerificationStatus;

  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => PlatformVenueCourtGroupDto)
  courtGroups!: PlatformVenueCourtGroupDto[];
}

export class BulkVenueActionDto {
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  ids!: string[];

  @IsIn(['VERIFY', 'UNVERIFY', 'MARK_PLACES_STALE'])
  action!: 'VERIFY' | 'UNVERIFY' | 'MARK_PLACES_STALE';
}

export class ReviewVenueVerificationDto {
  @IsIn(['APPROVE', 'REJECT', 'REQUEST_MORE_INFO'])
  action!: 'APPROVE' | 'REJECT' | 'REQUEST_MORE_INFO';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class VenuePairDto {
  @IsString()
  firstCourtId!: string;

  @IsString()
  secondCourtId!: string;
}

export class MergeVenuesDto {
  @IsString()
  survivorCourtId!: string;

  @IsString()
  duplicateCourtId!: string;
}

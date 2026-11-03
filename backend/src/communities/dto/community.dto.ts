import {
  AssessmentBranch,
  CommunityFrequency,
  CommunityJoinPolicy,
  CommunityRole,
  CommunityType,
  ReportReason,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Types a player can create from the app. CLUB communities come from
 * club-admin only (CreateClubCommunityDto). */
export const PLAYER_COMMUNITY_TYPES = [
  CommunityType.SOCIAL,
  CommunityType.TRAINING,
  CommunityType.LADDER,
] as const;

export class SearchCommunitiesDto {
  /** Case-insensitive match on the community's city. */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  /** "Near me": both coordinates plus a radius. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  maxDistanceKm?: number;

  @IsOptional()
  @IsEnum(CommunityType)
  type?: CommunityType;

  /** Name search. */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  take?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;
}

class CommunityFieldsDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @IsEnum(CommunityFrequency)
  frequency: CommunityFrequency;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  about?: string;

  @IsOptional()
  @IsEnum(CommunityJoinPolicy)
  joinPolicy?: CommunityJoinPolicy;
}

export class CreateCommunityDto extends CommunityFieldsDto {
  @IsIn(PLAYER_COMMUNITY_TYPES)
  type: (typeof PLAYER_COMMUNITY_TYPES)[number];

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  city: string;

  /** Where the community plays, when the app could geocode it. Falls back
   * to the creator's profile location. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;
}

/** Club-admin: the club's own community. The map location comes from the
 * club; the city is asked for, since clubs only store a free-text address. */
export class CreateClubCommunityDto extends CommunityFieldsDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  city: string;
}

export class UpdateCommunityDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsEnum(CommunityFrequency)
  frequency?: CommunityFrequency;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  about?: string;

  @IsOptional()
  @IsEnum(CommunityJoinPolicy)
  joinPolicy?: CommunityJoinPolicy;
}

export class UpdateMemberRoleDto {
  @IsIn([CommunityRole.ADMIN, CommunityRole.MEMBER])
  role: 'ADMIN' | 'MEMBER';
}

export class TransferOwnershipDto {
  @IsUUID()
  userId: string;
}

export class ReportCommunityDto {
  @IsEnum(ReportReason)
  reason: ReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  /** "Report and exit": leave the community in the same step. */
  @IsOptional()
  @IsBoolean()
  leave?: boolean;
}

export class CreateCommunityLadderDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  challengeRange?: number;
}

export class CreateCommunityLeagueDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(AssessmentBranch)
  levelBand?: AssessmentBranch;

  @Type(() => Date)
  @IsDate()
  registrationOpensAt: Date;

  @Type(() => Date)
  @IsDate()
  registrationClosesAt: Date;

  @Type(() => Date)
  @IsDate()
  startsAt: Date;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  roundCount: number;

  /** Days between rounds; stored as minutes on the league. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  roundIntervalDays: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(256)
  capacity?: number;
}

export class ReviewCommunityDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class AdminListCommunitiesDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;
}

import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DominantHand } from '@prisma/client';

/** Edit Profile (Doc 4 §A.10) — a post-onboarding partial update, distinct
 * from BasicProfileDto's onboarding-step version (all fields required
 * there, since it advances the onboarding step; nothing here does). */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @IsOptional()
  @IsEnum(DominantHand)
  dominantHand?: DominantHand;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  bio?: string;
}

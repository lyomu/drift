import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ClubMembershipStatus, ClubRole, VerificationStatus } from '@prisma/client';

/** Shortest justification an admin may give for a sensitive action. Long
 * enough to rule out "x" / "ok", short enough not to be a chore. */
export const REASON_MIN_LENGTH = 10;
export const REASON_MAX_LENGTH = 500;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Every sensitive user action carries a written reason, stored on the audit
 * row. Trimmed before validation so whitespace cannot satisfy the minimum. */
export class ReasonDto {
  @Transform(trim)
  @IsString()
  @MinLength(REASON_MIN_LENGTH, {
    message: `A reason of at least ${REASON_MIN_LENGTH} characters is required.`,
  })
  @MaxLength(REASON_MAX_LENGTH)
  reason!: string;
}

export class SetUserStatusDto extends ReasonDto {
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status!: 'ACTIVE' | 'SUSPENDED';
}

export class SetUserVerificationDto extends ReasonDto {
  // Account-level identity verification, not CoachProfile listing
  // verification — see UserAdminService.setVerification.
  @IsEnum(VerificationStatus)
  status!: VerificationStatus;
}

export class SetClubMembershipDto extends ReasonDto {
  @IsEnum(ClubRole)
  role!: ClubRole;

  @IsOptional()
  @IsEnum(ClubMembershipStatus)
  status?: ClubMembershipStatus;
}

export class SetCoachListingDto extends ReasonDto {
  /** true = hide the listing, false = reinstate it. */
  @IsBoolean()
  suspended!: boolean;
}

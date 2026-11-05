import { IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { LeagueRegistrationStatus } from '@prisma/client';

/** Not a Prisma enum — a transient instruction, never persisted as-is. */
export enum DisputeRuling {
  SUBMITTED = 'SUBMITTED',
  DISPUTANT = 'DISPUTANT',
}

/** A club admin enrolling or waitlisting a member directly. */
export class AddRegistrationDto {
  @IsUUID()
  userId: string;

  // WITHDRAWN is not offered here: removing a player is an update to an
  // existing registration, not an add.
  @IsIn([
    LeagueRegistrationStatus.ENROLLED,
    LeagueRegistrationStatus.WAITLISTED,
  ])
  status: LeagueRegistrationStatus;
}

export class UpdateRegistrationDto {
  @IsEnum(LeagueRegistrationStatus)
  status: LeagueRegistrationStatus;
}

/** Only takes effect while the fixture's match hasn't been created yet
 * (before the round opens) — see `club-competitions-admin.service.ts`. */
export class UpdateFixtureDto {
  @IsOptional()
  @IsString()
  sideAUserId?: string;

  @IsOptional()
  @IsString()
  sideBUserId?: string;
}

/** An admin ruling on an open dispute — picks whichever submitted version
 * is authoritative, bypassing the player-only "both must agree" rule
 * `results.service.ts` otherwise enforces. The documented gap M7 named. */
export class ResolveDisputeDto {
  @IsEnum(DisputeRuling)
  ruling: DisputeRuling;
}

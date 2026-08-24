import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { ClubMembershipStatus, ClubRole } from '@prisma/client';

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsEnum(ClubRole)
  role: ClubRole;
}

export class UpdateMembershipDto {
  @IsOptional()
  @IsEnum(ClubRole)
  role?: ClubRole;

  @IsOptional()
  @IsEnum(ClubMembershipStatus)
  status?: ClubMembershipStatus;
}

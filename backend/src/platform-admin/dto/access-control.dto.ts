import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PlatformPermission } from '@prisma/client';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../../auth/password-policy';

export class VerifyPlatformTwoFactorDto {
  @IsString()
  challengeToken!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code!: string;
}

export class ResendPlatformTwoFactorDto {
  @IsString()
  challengeToken!: string;
}

export class CreatePlatformRoleDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsArray()
  @ArrayUnique()
  @IsEnum(PlatformPermission, { each: true })
  permissions!: PlatformPermission[];
}

export class UpdatePlatformRoleDto extends CreatePlatformRoleDto {}

export class InvitePlatformAdminDto {
  @IsEmail()
  email!: string;

  @IsString()
  roleId!: string;
}

export class AcceptPlatformAdminInviteDto {
  @IsString()
  token!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}

export class UpdatePlatformAdminDto {
  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status?: 'ACTIVE' | 'SUSPENDED';
}

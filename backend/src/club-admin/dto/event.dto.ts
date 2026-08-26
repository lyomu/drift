import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ClubEventRegistrationStatus, ClubEventStatus } from '@prisma/client';

export class SaveEventDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @Type(() => Date)
  @IsDate()
  startsAt: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endsAt?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsEnum(ClubEventStatus)
  status: ClubEventStatus;
}

export class UpdateEventDto {
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @Type(() => Date) @IsDate() startsAt?: Date;
  @IsOptional() @Type(() => Date) @IsDate() endsAt?: Date;
  @IsOptional() @IsInt() @Min(1) capacity?: number;
  @IsOptional() @IsEnum(ClubEventStatus) status?: ClubEventStatus;
}

export class AddEventRegistrationDto {
  @IsEmail()
  email: string;
}

export class MarkAttendanceDto {
  @IsEnum(ClubEventRegistrationStatus)
  status: ClubEventRegistrationStatus;
}

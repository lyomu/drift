import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CoachLevel } from '@prisma/client';

class CoachFieldsDto {
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  bio?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  qualifications?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(80)
  yearsExperience?: number | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  specialisations?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(CoachLevel, { each: true })
  levels?: CoachLevel[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  availabilityNote?: string | null;

  @IsOptional()
  @IsEmail()
  publicEmail?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  publicPhone?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  bookingUrl?: string | null;
}

export class CreateCoachDto extends CoachFieldsDto {
  @IsEmail()
  accountEmail: string;
}

export class UpdateCoachDto extends CoachFieldsDto {}

import { PadelSide } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdatePadelPreferencesDto {
  @IsOptional()
  @IsEnum(PadelSide)
  preferredSide?: PadelSide;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  partnerPreference?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  goals?: string[];
}

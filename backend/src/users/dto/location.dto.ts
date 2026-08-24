import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { LocationSource } from '@prisma/client';

export class LocationDto {
  @IsString()
  @MinLength(1)
  generalLocation: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsEnum(LocationSource)
  locationSource: LocationSource;
}

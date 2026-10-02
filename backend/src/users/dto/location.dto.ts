import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
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

  /** ISO-3166-1 alpha-2, from the client's reverse-geocode. */
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;
}

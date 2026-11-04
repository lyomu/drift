import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// Multipart bodies arrive as strings: coerce the non-text fields.
const toBool = ({ value }: { value: unknown }) =>
  value === true || value === 'true' ? true : value === false || value === 'false' ? false : value;
const toInt = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : trim({ value });

/**
 * A fact in all three app languages. Limits match the column sizes and keep
 * every fact readable on one screen without scrolling.
 */
export class TennisFactInputDto {
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(60) titleEn!: string;
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(60) titleFr!: string;
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(60) titleEs!: string;

  @Transform(trim) @IsString() @MinLength(10) @MaxLength(280) bodyEn!: string;
  @Transform(trim) @IsString() @MinLength(10) @MaxLength(280) bodyFr!: string;
  @Transform(trim) @IsString() @MinLength(10) @MaxLength(280) bodyEs!: string;

  @Transform(emptyToNull) @IsOptional() @IsString() @MaxLength(80)
  sourceEn?: string | null;
  @Transform(emptyToNull) @IsOptional() @IsString() @MaxLength(80)
  sourceFr?: string | null;
  @Transform(emptyToNull) @IsOptional() @IsString() @MaxLength(80)
  sourceEs?: string | null;

  @Transform(toBool) @IsOptional() @IsBoolean() active?: boolean;

  @Transform(toInt) @IsOptional() @IsInt() @Min(0) @Max(100000)
  sortOrder?: number;

  /** "true" removes the current image (when no new file is uploaded). */
  @Transform(toBool) @IsOptional() @IsBoolean() removeImage?: boolean;
}

export class UpdateTennisFactDto extends TennisFactInputDto {}

export class ToggleTennisFactDto {
  @IsBoolean() active!: boolean;
}

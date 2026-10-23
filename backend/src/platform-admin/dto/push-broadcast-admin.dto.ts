import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PushBroadcastAudience } from '@prisma/client';
import { Transform } from 'class-transformer';

export class SendPushBroadcastDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  body!: string;

  /**
   * ISO-3166-1 alpha-2; omit (or null) to reach every country. The
   * recipient count is resolved server-side from the same filter the page
   * shows, so the console can never claim a count the send does not use.
   */
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string | null;

  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return [value];
    }
  })
  @IsArray()
  @IsEnum(PushBroadcastAudience, { each: true })
  audience?: PushBroadcastAudience[];

  /** Future UTC ISO timestamp. Omit to deliver immediately. */
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;
}

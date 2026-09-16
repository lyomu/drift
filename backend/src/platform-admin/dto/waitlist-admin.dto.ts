import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { WaitlistAudience } from '@prisma/client';

export class SendWaitlistBroadcastDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  subject!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  body!: string;

  /**
   * Scope the send to one audience; omit (or null) for the whole list. The
   * recipient count is resolved server-side from the same filter the page
   * shows, so the console can never claim a count the send does not use.
   */
  @IsOptional()
  @IsEnum(WaitlistAudience)
  audience?: WaitlistAudience | null;
}

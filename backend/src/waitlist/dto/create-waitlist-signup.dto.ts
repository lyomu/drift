import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { WaitlistAudience } from '@prisma/client';

/**
 * The global ValidationPipe runs with `whitelist` + `forbidNonWhitelisted`
 * (src/config/http-security.ts), so anything not declared here is a 400 —
 * no need to strip unknown fields by hand.
 */
export class CreateWaitlistSignupDto {
  /**
   * Normalised here rather than in the service so the unique index sees one
   * canonical form no matter which caller wrote it. Postgres unique indexes
   * are case-sensitive: without this, `A@b.com` and `a@b.com` are two people.
   */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(320)
  email!: string;

  /**
   * Required by the website form, optional here: the API should still accept
   * a signup captured by some other route later without a name attached.
   */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @IsEnum(WaitlistAudience)
  audience?: WaitlistAudience;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(80)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  /**
   * A band from the app's real 1.0–7.0 scale (e.g. "2.5-3.5"), or "unsure".
   * Free text on purpose: nobody has taken the assessment at this point, so
   * this is self-reported context for launch segmentation, not a rating.
   */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  level?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  source?: string;
}

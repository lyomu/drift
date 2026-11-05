import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateBookingDto {
  @IsOptional()
  @IsUUID()
  courtGroupId?: string;

  @IsISO8601()
  startsAt!: string;

  @IsISO8601()
  endsAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CreateClubBookingDto {
  @IsUUID()
  courtId!: string;

  @IsUUID()
  courtGroupId!: string;

  @IsISO8601()
  startsAt!: string;

  @IsISO8601()
  endsAt!: string;

  /** A club member. Exactly one of userId / guestName is required. */
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  guestName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class DecideBookingDto {
  @IsIn(['APPROVE', 'DECLINE'])
  decision!: 'APPROVE' | 'DECLINE';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CancelBookingDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class OpeningIntervalDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsInt()
  @Min(0)
  @Max(1439)
  opensMinute!: number;

  @IsInt()
  @Min(1)
  @Max(1440)
  closesMinute!: number;
}

export class BookingSettingsDto {
  @IsBoolean()
  enabled!: boolean;

  @IsString()
  @MaxLength(64)
  timezone!: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(240)
  slotMinutes?: number;

  @IsInt()
  @Min(1)
  @Max(12)
  maxSlots!: number;

  @IsInt()
  @Min(1)
  @Max(180)
  advanceDays!: number;

  @ValidateNested({ each: true })
  @Type(() => OpeningIntervalDto)
  @ArrayMaxSize(70)
  hours!: OpeningIntervalDto[];
}

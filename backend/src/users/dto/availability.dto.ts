import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { TimeBlock } from '@prisma/client';

export class AvailabilitySlotDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsEnum(TimeBlock)
  timeBlock: TimeBlock;
}

export class AvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  slots: AvailabilitySlotDto[];
}

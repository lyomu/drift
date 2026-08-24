import { IsArray, IsEnum } from 'class-validator';
import { FormatPreference, StylePreference, TimeBlock } from '@prisma/client';

export class PreferencesDto {
  @IsEnum(FormatPreference)
  formatPreference: FormatPreference;

  @IsEnum(StylePreference)
  stylePreference: StylePreference;

  @IsArray()
  @IsEnum(TimeBlock, { each: true })
  preferredTimeSlots: TimeBlock[];
}

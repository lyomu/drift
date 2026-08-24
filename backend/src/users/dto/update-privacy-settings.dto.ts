import { IsEnum, IsOptional } from 'class-validator';
import { FieldVisibility } from '@prisma/client';

/** Privacy Settings (Doc 4 §A.10) — closes the open dependency M5's
 * player.mapper.ts left, per that phase's documented plan. */
export class UpdatePrivacySettingsDto {
  @IsOptional()
  @IsEnum(FieldVisibility)
  skillBreakdownVisibility?: FieldVisibility;

  @IsOptional()
  @IsEnum(FieldVisibility)
  availabilityVisibility?: FieldVisibility;
}

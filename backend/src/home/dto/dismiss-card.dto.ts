import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class DismissCardDto {
  /**
   * Hours to hide the card for. Omitted means dismiss permanently.
   *
   * Capped at 30 days: a longer "snooze" is a permanent dismissal wearing a
   * disguise, and an uncapped value lets a client hide a card until the heat
   * death of the universe by accident.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24 * 30)
  snoozeHours?: number;
}

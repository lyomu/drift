import { IsNumber, Max, Min } from 'class-validator';

export class LevelDto {
  @IsNumber()
  @Min(1.0)
  @Max(7.0)
  userSelectedLevel: number;
}

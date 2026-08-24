import { IsArray, IsString } from 'class-validator';

export class GoalsDto {
  @IsArray()
  @IsString({ each: true })
  goals: string[];
}

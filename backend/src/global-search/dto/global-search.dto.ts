import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum GlobalSearchEntityType {
  ALL = 'ALL',
  PLAYER = 'PLAYER',
  COURT = 'COURT',
  CLUB = 'CLUB',
  COMPETITION = 'COMPETITION',
}

export class GlobalSearchDto {
  @IsString()
  query!: string;

  @IsOptional()
  @IsEnum(GlobalSearchEntityType)
  type?: GlobalSearchEntityType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  take?: number;
}

import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  connections?: boolean;

  @IsOptional()
  @IsBoolean()
  matches?: boolean;

  @IsOptional()
  @IsBoolean()
  messages?: boolean;

  @IsOptional()
  @IsBoolean()
  competitions?: boolean;

  @IsOptional()
  @IsBoolean()
  learning?: boolean;

  @IsOptional()
  @IsBoolean()
  news?: boolean;

  @IsOptional()
  @IsBoolean()
  clubs?: boolean;
}

import { IsArray, IsOptional, IsString } from 'class-validator';

export class ClubCourtsDto {
  @IsOptional()
  @IsString()
  preferredClubName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredCourtNames?: string[];
}

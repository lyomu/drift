import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { DominantHand } from '@prisma/client';

export class BasicProfileDto {
  @IsString()
  @MinLength(1)
  firstName: string;

  @IsString()
  @MinLength(1)
  lastName: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsEnum(DominantHand)
  dominantHand: DominantHand;
}

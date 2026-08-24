import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ReflectionDto {
  @IsInt()
  @Min(1)
  @Max(5)
  confidence: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

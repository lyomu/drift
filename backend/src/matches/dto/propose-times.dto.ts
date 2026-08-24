import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDate,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ProposeTimesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @Type(() => Date)
  @IsDate({ each: true })
  options: Date[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

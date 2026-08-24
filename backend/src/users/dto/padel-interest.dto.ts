import { IsEnum } from 'class-validator';
import { PadelInterestValue } from '@prisma/client';

export class PadelInterestDto {
  @IsEnum(PadelInterestValue)
  padelInterest: PadelInterestValue;
}

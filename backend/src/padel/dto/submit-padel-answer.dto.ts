import { IsEnum, IsString } from 'class-validator';
import { AnswerOption } from '@prisma/client';

export class SubmitPadelAnswerDto {
  @IsString()
  questionId: string;

  @IsEnum(AnswerOption)
  selectedOption: AnswerOption;
}

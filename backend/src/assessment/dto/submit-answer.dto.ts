import { IsEnum, IsString } from 'class-validator';
import { AnswerOption } from '@prisma/client';

export class SubmitAnswerDto {
  @IsString()
  questionId: string;

  @IsEnum(AnswerOption)
  selectedOption: AnswerOption;
}

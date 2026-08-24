import { IsEmail, Length } from 'class-validator';

export class VerifyDto {
  @IsEmail()
  email: string;

  @Length(6, 6)
  code: string;
}

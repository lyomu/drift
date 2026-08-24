import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateClubPostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body: string;
}

export class ReactionDto {
  /** A single emoji. Kept as free text rather than an enum so the reaction
   * set can change without a migration. */
  @IsString()
  @MinLength(1)
  @MaxLength(8)
  emoji: string;
}

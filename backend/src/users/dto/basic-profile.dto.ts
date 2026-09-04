import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator';
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

  /** Optional contact detail, stored unverified — see `User.phone`. Social
   * sign-ups never pass through the signup screen, so this step is where they
   * get asked. E.164 (`+254…`), as on `SignUpDto`. */
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  phoneOnWhatsApp?: boolean;

  @IsEnum(DominantHand)
  dominantHand: DominantHand;
}

import { PaymentMethodType } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class AddPaymentMethodDto {
  @IsEnum(PaymentMethodType)
  type: PaymentMethodType;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  brand?: string;

  // Provider-tokenised display metadata only. The API intentionally has no
  // PAN, CVV, expiry, or full mobile-money number field.
  @Matches(/^\d{4}$/)
  last4: string;
}

import { IsOptional, IsString, IsUUID } from 'class-validator';

export class ChangeSubscriptionDto {
  @IsString()
  planId: string;

  @IsOptional()
  @IsUUID()
  paymentMethodId?: string;
}

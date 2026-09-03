import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ChangeSubscriptionDto {
  @IsString()
  planId: string;

  @IsOptional()
  @IsUUID()
  paymentMethodId?: string;

  /**
   * A promotion code to apply. With a hosted provider the discount cannot be
   * applied per cycle, so this selects a provider plan minted at the discounted
   * price instead — see `ProviderPlanService`.
   */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  promoCode?: string;
}

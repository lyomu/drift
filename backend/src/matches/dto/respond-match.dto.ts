import { IsOptional, IsUUID } from 'class-validator';

export class AcceptMatchDto {
  /**
   * The accepting opponent's doubles partner. Required when the match format
   * is DOUBLES — validated in the service, which knows the match, rather than
   * here where only the body is visible.
   */
  @IsOptional()
  @IsUUID()
  partnerId?: string;
}

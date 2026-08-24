import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AcceptTimeDto {
  @IsUUID()
  optionId: string;
}

export class SuggestCourtDto {
  @IsString()
  @MaxLength(200)
  courtName: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  courtNote?: string;

  // Added in M9 — an optional link to a real Court row, alongside the free
  // text above (which stays authoritative for the chat-announcement text
  // even when a real court is linked).
  @IsOptional()
  @IsString()
  courtId?: string;
}

export class CancelMatchDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

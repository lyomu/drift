import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PrivacyRequestType,
  SupportTicketCategory,
  SupportTicketPriority,
} from '@prisma/client';

export class CreateSupportTicketDto {
  @IsOptional()
  @IsString()
  userId?: string | null;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  subject!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(4000)
  body!: string;

  @IsEnum(SupportTicketCategory)
  category!: SupportTicketCategory;

  @IsEnum(SupportTicketPriority)
  priority!: SupportTicketPriority;
}

export class AssignSupportTicketDto {
  @IsOptional()
  @IsString()
  assignedToId?: string | null;
}

export class RespondSupportTicketDto {
  // HTML from the rich-text editor, sanitized server-side before storage
  // (see sanitizeRichText in support-admin.service.ts). 8000 rather than the
  // 4000 plain-text limit elsewhere in this file: tags eat into the budget,
  // so the same visible text needs more raw characters once formatted.
  @IsString()
  @MinLength(2)
  @MaxLength(8000)
  body!: string;
}

export class CloseSupportTicketDto {
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  resolutionNote!: string;
}

export class CreatePrivacyRequestDto {
  @IsOptional()
  @IsString()
  userId?: string | null;

  @IsOptional()
  @IsEmail()
  userEmail?: string | null;

  @IsEnum(PrivacyRequestType)
  type!: PrivacyRequestType;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  requestNote?: string | null;
}

export class ProcessPrivacyRequestDto {
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  fulfillmentNote!: string;
}

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
  @IsString()
  @MinLength(2)
  @MaxLength(4000)
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

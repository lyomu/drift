import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AnnouncementStatus } from '@prisma/client';

export class CreateAnnouncementDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(5000)
  body: string;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @IsOptional()
  @IsEnum(AnnouncementStatus)
  status?: AnnouncementStatus;
}

export class UpdateAnnouncementDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  body?: string;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @IsOptional()
  @IsEnum(AnnouncementStatus)
  status?: AnnouncementStatus;
}

import {
  BadRequestException,
  Controller,
  Delete,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClubRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CourtPhotosService } from '../courts/court-photos.service';
import { RequireClubRole } from './decorators/require-club-role.decorator';
import { ClubMembershipGuard } from './guards/club-membership.guard';

const OWNER_OR_ADMIN = [ClubRole.OWNER, ClubRole.ADMIN];

/**
 * Not nested under a specific court id — a photo is uploaded to the club's
 * own pool of assets before a court exists, then the resulting URL is
 * included in the court create/update payload (`CreateCourtDto.photoUrls` /
 * `UpdateCourtDto.photoUrls`). See `CourtPhotosService` for why.
 */
@Controller('clubs/:clubId/court-photos')
@UseGuards(JwtAuthGuard, ClubMembershipGuard)
export class ClubCourtPhotosController {
  constructor(private readonly courtPhotos: CourtPhotosService) {}

  private userId(req: Request) {
    return (req.user as { userId: string }).userId;
  }

  @Post()
  @RequireClubRole(...OWNER_OR_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  upload(
    @Req() req: Request,
    @Param('clubId') clubId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('An image file is required.');
    return this.courtPhotos.upload(clubId, this.userId(req), file);
  }

  @Delete(':id')
  @RequireClubRole(...OWNER_OR_ADMIN)
  delete(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.courtPhotos.delete(clubId, id);
  }
}

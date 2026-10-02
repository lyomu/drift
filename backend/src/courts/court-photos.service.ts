import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Public read side, mirrors `USER_PHOTO_PATH` in `users.service.ts`. */
export const COURT_PHOTO_PATH = '/media/court-photos';

/**
 * Court photos, stored the same way club media and user photos are — bytes
 * in Postgres, served back by opaque asset id — but scoped to the club
 * rather than a specific Court row, so a photo can be uploaded before the
 * court itself exists (the "New court" form uploads first, then submits the
 * resulting URLs on create).
 */
@Injectable()
export class CourtPhotosService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(clubId: string, actorId: string, file: Express.Multer.File) {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image uploads are supported.');
    }
    const bytes = new Uint8Array(file.buffer);
    const asset = await this.prisma.courtPhotoAsset.create({
      data: {
        clubId,
        uploadedById: actorId,
        filename: file.originalname,
        mimeType: file.mimetype,
        bytes,
      },
      select: { id: true },
    });
    return { url: `${COURT_PHOTO_PATH}/${asset.id}` };
  }

  /** Bytes for the public read endpoint. No auth: addressed by the asset's
   * unguessable id rather than the club id, same trade `UsersService` makes
   * for profile photos. */
  async content(id: string) {
    const asset = await this.prisma.courtPhotoAsset.findUnique({
      where: { id },
      select: { bytes: true, mimeType: true, filename: true },
    });
    if (!asset) throw new NotFoundException('Photo not found.');
    return asset;
  }

  async delete(clubId: string, id: string) {
    const deleted = await this.prisma.courtPhotoAsset.deleteMany({
      where: { id, clubId },
    });
    if (!deleted.count) throw new NotFoundException('Photo not found.');
    return { deleted: true };
  }
}

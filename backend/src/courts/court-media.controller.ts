import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CourtPhotosService } from './court-photos.service';

/**
 * Public read side of uploaded court photos — deliberately no `JwtAuthGuard`,
 * same reasoning as `MediaController` (users module): a court photo must be
 * visible to any player browsing venues, and `NetworkImage` on the mobile
 * client cannot attach a bearer token that stays valid across a refresh.
 */
@Controller('media')
export class CourtMediaController {
  constructor(private readonly courtPhotos: CourtPhotosService) {}

  @Get('court-photos/:id')
  async content(@Param('id') id: string, @Res() res: Response) {
    const asset = await this.courtPhotos.content(id);
    res.setHeader('Content-Type', asset.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${asset.filename.replaceAll('"', '')}"`,
    );
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(Buffer.from(asset.bytes));
  }
}

import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { tmpdir } from 'node:os';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MAX_VIDEO_BYTES, VideoAnalysisService } from './video-analysis.service';

@Controller('video-analysis')
@UseGuards(JwtAuthGuard)
export class VideoAnalysisController {
  constructor(private readonly videoAnalysis: VideoAnalysisService) {}

  private userId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }

  /**
   * Upload a clip and get it judged.
   *
   * Unlike the image uploads elsewhere in this API, which buffer into memory and
   * land in a Postgres column, this streams to a temp file: these are videos, and
   * holding one in memory per concurrent upload does not survive contact with real
   * traffic.
   *
   * Returns the job with its verdict already decided. A refused clip is a **201 with
   * status REJECTED**, not an error — the request succeeded, the video did not. The
   * reasons in `rejectionReasons` are written to be shown to the person who uploaded
   * it, so a client can render them directly.
   */
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({ destination: tmpdir() }),
      limits: { fileSize: MAX_VIDEO_BYTES },
    }),
  )
  async upload(@Req() req: Request, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('A video file is required.');
    return this.videoAnalysis.createFromUpload(this.userId(req), file);
  }

  /**
   * Whether the CV service is up, and whether it has its court model.
   *
   * Worth exposing to a client before it spends a user's mobile data on an upload
   * that cannot be judged at the other end.
   */
  @Get('service-status')
  serviceStatus() {
    return this.videoAnalysis.serviceStatus();
  }

  /**
   * Queue an accepted clip for analysis.
   *
   * Separate from the upload rather than automatic, because analysis is minutes of
   * scarce GPU time and most clips are refused before they get near it. Asking makes
   * the cost explicit and keeps the queue full of work somebody actually wants.
   */
  @Post(':id/analyze')
  analyze(@Req() req: Request, @Param('id') id: string) {
    return this.videoAnalysis.requestAnalysis(this.userId(req), id);
  }

  @Get()
  list(@Req() req: Request, @Query('take') take?: string) {
    return this.videoAnalysis.listForUser(
      this.userId(req),
      take ? Number(take) : undefined,
    );
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    return this.videoAnalysis.findForUser(this.userId(req), id);
  }
}

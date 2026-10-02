import { Module } from '@nestjs/common';
import { CourtMediaController } from './court-media.controller';
import { CourtPhotosService } from './court-photos.service';
import { CourtsController } from './courts.controller';
import { CourtsService } from './courts.service';

@Module({
  controllers: [CourtsController, CourtMediaController],
  providers: [CourtsService, CourtPhotosService],
  // matches.module.ts / match.mapper.ts (Phase M9) is a second consumer.
  // CourtPhotosService is also consumed by ClubCourtPhotosController
  // (club-admin module) for the authenticated upload/delete side.
  exports: [CourtsService, CourtPhotosService],
})
export class CourtsModule {}

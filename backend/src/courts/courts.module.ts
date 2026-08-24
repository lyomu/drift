import { Module } from '@nestjs/common';
import { CourtsController } from './courts.controller';
import { CourtsService } from './courts.service';

@Module({
  controllers: [CourtsController],
  providers: [CourtsService],
  // matches.module.ts / match.mapper.ts (Phase M9) is a second consumer.
  exports: [CourtsService],
})
export class CourtsModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LocalDiskVideoStorage, VIDEO_STORAGE } from './video-storage.service';

/**
 * Binds the video storage driver.
 *
 * Only the local-disk driver exists today. When an S3-compatible one arrives, the
 * choice belongs here — a factory reading the configured driver name — and nothing
 * that injects `VIDEO_STORAGE` changes.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    LocalDiskVideoStorage,
    { provide: VIDEO_STORAGE, useExisting: LocalDiskVideoStorage },
  ],
  exports: [VIDEO_STORAGE, LocalDiskVideoStorage],
})
export class StorageModule {}

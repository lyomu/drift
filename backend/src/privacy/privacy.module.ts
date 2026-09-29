import { Global, Module } from '@nestjs/common';
import { ErasureService } from './erasure.service';
import { ErasureScheduler } from './erasure.scheduler';
import { StorageModule } from '../storage/storage.module';

/** Global so both entry points — the admin console and the user-facing
 * delete — reach one definition of erasure rather than two. */
@Global()
@Module({
  // Erasure has to remove uploaded video, which is the first personal data in this
  // product that lives outside Postgres and so outside the erasure transaction.
  imports: [StorageModule],
  providers: [ErasureService, ErasureScheduler],
  exports: [ErasureService],
})
export class PrivacyModule {}

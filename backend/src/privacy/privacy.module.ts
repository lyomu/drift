import { Global, Module } from '@nestjs/common';
import { ErasureService } from './erasure.service';
import { ErasureScheduler } from './erasure.scheduler';

/** Global so both entry points — the admin console and the user-facing
 * delete — reach one definition of erasure rather than two. */
@Global()
@Module({
  providers: [ErasureService, ErasureScheduler],
  exports: [ErasureService],
})
export class PrivacyModule {}

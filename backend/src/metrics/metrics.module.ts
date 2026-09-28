import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';

@Module({
  controllers: [MetricsController],
  providers: [
    MetricsInterceptor,
    { provide: APP_INTERCEPTOR, useExisting: MetricsInterceptor },
  ],
})
export class MetricsModule {}

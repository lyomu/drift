import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { BookingsController } from './bookings.controller';
import { BookingsScheduler } from './bookings.scheduler';
import { BookingsService } from './bookings.service';
import { ClubBookingsController } from './club-bookings.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [BookingsController, ClubBookingsController],
  providers: [BookingsService, BookingsScheduler],
  exports: [BookingsService],
})
export class BookingsModule {}

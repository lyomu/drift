import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BookingsService } from './bookings.service';

/** Hourly sweep that closes booking requests the club never answered. */
@Injectable()
export class BookingsScheduler {
  private readonly logger = new Logger(BookingsScheduler.name);

  constructor(private readonly bookings: BookingsService) {}

  @Cron('7 * * * *')
  async expireStaleRequests(): Promise<void> {
    try {
      const n = await this.bookings.expireStalePending();
      if (n > 0) this.logger.log(`Expired ${n} unanswered booking request(s)`);
    } catch (err) {
      this.logger.error(
        `Booking expiry sweep failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

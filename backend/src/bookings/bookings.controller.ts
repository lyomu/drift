import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/booking.dto';

/** Player-facing native court booking. */
@Controller()
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  private userId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }

  @Get('courts/:id/availability')
  availability(
    @Req() req: Request,
    @Param('id') id: string,
    @Query('date') date: string,
    @Query('groupId') groupId?: string,
  ) {
    return this.bookings.availability(this.userId(req), id, date, groupId);
  }

  @Post('courts/:id/bookings')
  request(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookings.request(this.userId(req), id, dto);
  }

  @Get('me/bookings')
  mine(@Req() req: Request) {
    return this.bookings.mine(this.userId(req));
  }

  @Post('me/bookings/:id/cancel')
  cancel(@Req() req: Request, @Param('id') id: string) {
    return this.bookings.cancelMine(this.userId(req), id);
  }
}

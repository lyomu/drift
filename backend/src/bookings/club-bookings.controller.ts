import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClubRole } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireClubRole } from '../club-admin/decorators/require-club-role.decorator';
import { ClubMembershipGuard } from '../club-admin/guards/club-membership.guard';
import { BookingsService } from './bookings.service';
import {
  BookingSettingsDto,
  CancelBookingDto,
  CreateClubBookingDto,
  DecideBookingDto,
} from './dto/booking.dto';

const MANAGERS = [ClubRole.OWNER, ClubRole.ADMIN];

/** Club-admin side: approvals, staff-entered bookings and court settings. */
@Controller('clubs/:clubId')
@UseGuards(JwtAuthGuard, ClubMembershipGuard)
export class ClubBookingsController {
  constructor(private readonly bookings: BookingsService) {}

  private userId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }

  @RequireClubRole(...MANAGERS)
  @Get('bookings')
  list(
    @Param('clubId') clubId: string,
    @Query('status') status?: string,
    @Query('courtId') courtId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.bookings.listForClub(clubId, { status, courtId, from, to });
  }

  @RequireClubRole(...MANAGERS)
  @Post('bookings')
  create(
    @Req() req: Request,
    @Param('clubId') clubId: string,
    @Body() dto: CreateClubBookingDto,
  ) {
    return this.bookings.createForClub(clubId, this.userId(req), dto);
  }

  @RequireClubRole(...MANAGERS)
  @Patch('bookings/:bookingId')
  decide(
    @Req() req: Request,
    @Param('clubId') clubId: string,
    @Param('bookingId') bookingId: string,
    @Body() dto: DecideBookingDto,
  ) {
    return this.bookings.decide(clubId, bookingId, this.userId(req), dto);
  }

  @RequireClubRole(...MANAGERS)
  @Post('bookings/:bookingId/cancel')
  cancel(
    @Req() req: Request,
    @Param('clubId') clubId: string,
    @Param('bookingId') bookingId: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookings.cancelForClub(
      clubId,
      bookingId,
      this.userId(req),
      dto.note,
    );
  }

  @RequireClubRole(...MANAGERS)
  @Get('courts/:courtId/booking-settings')
  settings(@Param('clubId') clubId: string, @Param('courtId') courtId: string) {
    return this.bookings.getSettings(clubId, courtId);
  }

  @RequireClubRole(...MANAGERS)
  @Put('courts/:courtId/booking-settings')
  putSettings(
    @Req() req: Request,
    @Param('clubId') clubId: string,
    @Param('courtId') courtId: string,
    @Body() dto: BookingSettingsDto,
  ) {
    return this.bookings.putSettings(clubId, courtId, this.userId(req), dto);
  }
}

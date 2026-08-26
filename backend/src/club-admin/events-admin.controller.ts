import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ClubRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EventsService } from '../events/events.service';
import { RequireClubRole } from './decorators/require-club-role.decorator';
import { ClubMembershipGuard } from './guards/club-membership.guard';
import {
  AddEventRegistrationDto,
  MarkAttendanceDto,
  SaveEventDto,
  UpdateEventDto,
} from './dto/event.dto';

const MANAGERS = [ClubRole.OWNER, ClubRole.ADMIN];

@Controller('clubs/:clubId/events')
@UseGuards(JwtAuthGuard, ClubMembershipGuard)
export class EventsAdminController {
  constructor(private readonly events: EventsService) {}

  private userId(req: Request) {
    return (req.user as { userId: string }).userId;
  }

  @Get()
  list(
    @Param('clubId') clubId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.events.list(
      clubId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get(':id')
  detail(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.events.detail(clubId, id);
  }

  @Post()
  @RequireClubRole(...MANAGERS)
  create(
    @Req() req: Request,
    @Param('clubId') clubId: string,
    @Body() dto: SaveEventDto,
  ) {
    return this.events.create(clubId, this.userId(req), dto);
  }

  @Patch(':id')
  @RequireClubRole(...MANAGERS)
  update(
    @Req() req: Request,
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.events.update(clubId, id, this.userId(req), dto);
  }

  @Post(':id/registrations')
  @RequireClubRole(...MANAGERS)
  register(
    @Req() req: Request,
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Body() dto: AddEventRegistrationDto,
  ) {
    return this.events.addRegistration(clubId, id, this.userId(req), dto.email);
  }

  @Patch(':id/registrations/:registrationId')
  @RequireClubRole(...MANAGERS)
  attendance(
    @Req() req: Request,
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Param('registrationId') registrationId: string,
    @Body() dto: MarkAttendanceDto,
  ) {
    return this.events.markAttendance(
      clubId,
      id,
      registrationId,
      this.userId(req),
      dto.status,
    );
  }

  @Get(':id/registrations.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportRegistrations(
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="event-${id}-registrations.csv"`,
    );
    return this.events.registrationCsv(clubId, id);
  }
}

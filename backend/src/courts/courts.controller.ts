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
import { CourtsService } from './courts.service';
import { SearchCourtsDto } from './dto/search-courts.dto';
import { ReportCourtDto } from './dto/report-court.dto';

@Controller('courts')
@UseGuards(JwtAuthGuard)
export class CourtsController {
  constructor(private readonly courtsService: CourtsService) {}

  private userId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }

  @Get()
  search(@Query() dto: SearchCourtsDto) {
    return this.courtsService.search(dto);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
  ) {
    const viewerCoords =
      latitude !== undefined && longitude !== undefined
        ? { latitude: Number(latitude), longitude: Number(longitude) }
        : undefined;
    return this.courtsService.findOne(id, viewerCoords);
  }

  @Post(':id/report')
  report(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: ReportCourtDto,
  ) {
    return this.courtsService.report(this.userId(req), id, dto);
  }
}

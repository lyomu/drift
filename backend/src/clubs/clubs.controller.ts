import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClubsService } from './clubs.service';
import { SearchClubsDto } from './dto/search-clubs.dto';

@Controller('clubs')
@UseGuards(JwtAuthGuard)
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  @Get()
  search(@Query() dto: SearchClubsDto) {
    return this.clubsService.search(dto);
  }

  @Get(':id')
  findOne(
    @Req() req: Request,
    @Param('id') id: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
  ) {
    const viewerCoords =
      latitude !== undefined && longitude !== undefined
        ? { latitude: Number(latitude), longitude: Number(longitude) }
        : undefined;
    const viewerId = (req.user as { userId: string }).userId;
    return this.clubsService.findOne(id, viewerId, viewerCoords);
  }
}

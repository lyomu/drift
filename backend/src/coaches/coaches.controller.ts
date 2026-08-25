import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CoachesService } from './coaches.service';
import { SearchCoachesDto } from './dto/search-coaches.dto';

@Controller('coaches')
@UseGuards(JwtAuthGuard)
export class CoachesController {
  constructor(private readonly coaches: CoachesService) {}

  private userId(req: Request) {
    return (req.user as { userId: string }).userId;
  }

  @Get()
  search(@Req() req: Request, @Query() dto: SearchCoachesDto) {
    return this.coaches.search(this.userId(req), dto);
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    return this.coaches.findOne(this.userId(req), id);
  }
}

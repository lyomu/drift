import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CoachesService } from './coaches.service';
import { SearchCoachesDto } from './dto/search-coaches.dto';
import { UpdateCoachDto } from './dto/coach-admin.dto';

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

  // Declared before `:id` so a request for /coaches/me is never read as a
  // lookup of a coach whose id is the literal string "me".
  @Get('me')
  findMine(@Req() req: Request) {
    return this.coaches.findMine(this.userId(req));
  }

  @Patch('me')
  updateMine(@Req() req: Request, @Body() dto: UpdateCoachDto) {
    return this.coaches.updateMine(this.userId(req), dto);
  }

  @Get('me/clubs')
  listMyClubs(@Req() req: Request) {
    return this.coaches.listMyClubs(this.userId(req));
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    return this.coaches.findOne(this.userId(req), id);
  }
}

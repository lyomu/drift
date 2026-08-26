import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GlobalSearchDto } from './dto/global-search.dto';
import { GlobalSearchService } from './global-search.service';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class GlobalSearchController {
  constructor(private readonly search: GlobalSearchService) {}

  @Get()
  run(@Req() req: Request, @Query() dto: GlobalSearchDto) {
    return this.search.run((req.user as { userId: string }).userId, dto);
  }
}

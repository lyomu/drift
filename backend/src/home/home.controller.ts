import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HomeService } from './home.service';

@Controller('home')
@UseGuards(JwtAuthGuard)
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get('feed')
  feed(@Req() req: Request) {
    const { userId } = req.user as { userId: string };
    return this.homeService.getFeed(userId);
  }
}

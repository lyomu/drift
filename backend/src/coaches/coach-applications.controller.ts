import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CoachApplicationsService } from './coach-applications.service';
import { SaveCoachApplicationDto } from './dto/coach-application.dto';

/**
 * The coach's own application. Every route is scoped to the authenticated
 * user by the service, never by an id in the path -- there is deliberately no
 * way to address someone else's application from here.
 */
@Controller('coach-applications')
@UseGuards(JwtAuthGuard)
export class CoachApplicationsController {
  constructor(private readonly applications: CoachApplicationsService) {}

  private userId(req: Request) {
    return (req.user as { userId: string }).userId;
  }

  @Get('me')
  findMine(@Req() req: Request) {
    return this.applications.findMine(this.userId(req));
  }

  @Patch('me')
  saveMine(@Req() req: Request, @Body() dto: SaveCoachApplicationDto) {
    return this.applications.saveMine(this.userId(req), dto);
  }

  @Post('me/submit')
  @HttpCode(HttpStatus.OK)
  submitMine(@Req() req: Request) {
    return this.applications.submitMine(this.userId(req));
  }
}

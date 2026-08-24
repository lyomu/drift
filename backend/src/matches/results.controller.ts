import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResultsService } from './results.service';
import { ResultVersionDto } from './dto/result-version.dto';
import { ReflectionDto } from './dto/reflection.dto';
import { toMatchDto } from './match.mapper';

@Controller('matches/:id')
@UseGuards(JwtAuthGuard)
export class ResultsController {
  constructor(private readonly results: ResultsService) {}

  private userId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }

  @Post('results')
  async submit(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: ResultVersionDto,
  ) {
    const userId = this.userId(req);
    const match = await this.results.submit(userId, id, dto);
    return toMatchDto(match, userId);
  }

  @Patch('results/confirm')
  async confirm(@Req() req: Request, @Param('id') id: string) {
    const userId = this.userId(req);
    const match = await this.results.confirm(userId, id);
    return toMatchDto(match, userId);
  }

  @Patch('results/dispute')
  async dispute(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: ResultVersionDto,
  ) {
    const userId = this.userId(req);
    const match = await this.results.dispute(userId, id, dto);
    return toMatchDto(match, userId);
  }

  @Patch('results/resubmit')
  async resubmit(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: ResultVersionDto,
  ) {
    const userId = this.userId(req);
    const match = await this.results.resubmit(userId, id, dto);
    return toMatchDto(match, userId);
  }

  @Post('reflection')
  reflection(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: ReflectionDto,
  ) {
    return this.results.submitReflection(this.userId(req), id, dto);
  }
}

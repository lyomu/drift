import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LearningService } from './learning.service';
import { SearchContentDto } from './dto/search-content.dto';
import { LogPracticeSessionDto } from './dto/log-practice-session.dto';
import { CreateGoalDto, UpdateGoalDto } from './dto/goal.dto';

@Controller('learning')
@UseGuards(JwtAuthGuard)
export class LearningController {
  constructor(private readonly learning: LearningService) {}

  private userId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }

  @Get('skill-profile')
  getSkillProfile(@Req() req: Request) {
    return this.learning.getSkillProfile(this.userId(req));
  }

  @Get('skill-profile/:skill')
  getSkillDetail(@Req() req: Request, @Param('skill') skill: string) {
    return this.learning.getSkillDetail(this.userId(req), skill);
  }

  @Get('progress')
  getProgressReport(@Req() req: Request) {
    return this.learning.getProgressReport(this.userId(req));
  }

  @Get('content')
  browseContent(@Query() dto: SearchContentDto) {
    return this.learning.browseContent(dto);
  }

  @Get('content/:id')
  getContent(@Param('id') id: string) {
    return this.learning.getContent(id);
  }

  @Post('content/:id/complete')
  markContentComplete(@Req() req: Request, @Param('id') id: string) {
    return this.learning.markContentComplete(this.userId(req), id);
  }

  @Get('practice-sessions')
  listPracticeSessions(@Req() req: Request) {
    return this.learning.listPracticeSessions(this.userId(req));
  }

  @Post('practice-sessions')
  logPracticeSession(@Req() req: Request, @Body() dto: LogPracticeSessionDto) {
    return this.learning.logPracticeSession(this.userId(req), dto);
  }

  @Get('goals')
  listGoals(@Req() req: Request) {
    return this.learning.listGoals(this.userId(req));
  }

  @Post('goals')
  createGoal(@Req() req: Request, @Body() dto: CreateGoalDto) {
    return this.learning.createGoal(this.userId(req), dto);
  }

  @Get('goals/:id')
  getGoal(@Req() req: Request, @Param('id') id: string) {
    return this.learning.getGoal(this.userId(req), id);
  }

  @Patch('goals/:id')
  updateGoal(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.learning.updateGoal(this.userId(req), id, dto);
  }

  @Delete('goals/:id')
  deleteGoal(@Req() req: Request, @Param('id') id: string) {
    return this.learning.deleteGoal(this.userId(req), id);
  }

  @Patch('goals/:id/complete')
  completeGoal(@Req() req: Request, @Param('id') id: string) {
    return this.learning.completeGoal(this.userId(req), id);
  }

  @Patch('goals/:id/milestones/:milestoneId/complete')
  completeMilestone(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
  ) {
    return this.learning.completeMilestone(this.userId(req), id, milestoneId);
  }
}

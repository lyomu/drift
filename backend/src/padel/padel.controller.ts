import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PadelService } from './padel.service';
import { PadelAssessmentService } from './padel-assessment.service';
import { UpdatePadelPreferencesDto } from './dto/update-padel-preferences.dto';
import { SubmitPadelAnswerDto } from './dto/submit-padel-answer.dto';

@Controller('padel')
@UseGuards(JwtAuthGuard)
export class PadelController {
  constructor(
    private readonly padelService: PadelService,
    private readonly padelAssessmentService: PadelAssessmentService,
  ) {}

  private userId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }

  @Post('profile')
  addPadel(@Req() req: Request) {
    return this.padelService.addPadel(this.userId(req));
  }

  @Get('profile')
  getProfile(@Req() req: Request) {
    return this.padelService.getProfile(this.userId(req));
  }

  @Patch('profile/preferences')
  updatePreferences(
    @Req() req: Request,
    @Body() dto: UpdatePadelPreferencesDto,
  ) {
    return this.padelService.updatePreferences(this.userId(req), dto);
  }

  @Post('assessment/sessions')
  startOrResume(@Req() req: Request) {
    return this.padelAssessmentService.startOrResumeSession(this.userId(req));
  }

  @Get('assessment/sessions/active')
  active(@Req() req: Request) {
    return this.padelAssessmentService.getActiveSession(this.userId(req));
  }

  @Post('assessment/sessions/:id/answers')
  submitAnswer(
    @Req() req: Request,
    @Param('id') sessionId: string,
    @Body() dto: SubmitPadelAnswerDto,
  ) {
    return this.padelAssessmentService.submitAnswer(
      this.userId(req),
      sessionId,
      dto.questionId,
      dto.selectedOption,
    );
  }
}

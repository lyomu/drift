import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssessmentService } from './assessment.service';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

@Controller('assessment')
@UseGuards(JwtAuthGuard)
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  @Post('sessions')
  startOrResume(@Req() req: Request) {
    const { userId } = req.user as { userId: string };
    return this.assessmentService.startOrResumeSession(userId);
  }

  @Get('sessions/active')
  active(@Req() req: Request) {
    const { userId } = req.user as { userId: string };
    return this.assessmentService.getActiveSession(userId);
  }

  @Post('sessions/:id/answers')
  submitAnswer(
    @Req() req: Request,
    @Param('id') sessionId: string,
    @Body() dto: SubmitAnswerDto,
  ) {
    const { userId } = req.user as { userId: string };
    return this.assessmentService.submitAnswer(
      userId,
      sessionId,
      dto.questionId,
      dto.selectedOption,
    );
  }
}

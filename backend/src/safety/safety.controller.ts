import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SafetyService } from './safety.service';
import { CreateBlockDto } from './dto/create-block.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { CreateMessageReportDto } from './dto/create-message-report.dto';

@Controller('safety')
@UseGuards(JwtAuthGuard)
export class SafetyController {
  constructor(private readonly safetyService: SafetyService) {}

  private userId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }

  @Post('blocks')
  block(@Req() req: Request, @Body() dto: CreateBlockDto) {
    return this.safetyService.block(this.userId(req), dto.blockedId);
  }

  @Delete('blocks/:userId')
  unblock(@Req() req: Request, @Param('userId') blockedId: string) {
    return this.safetyService.unblock(this.userId(req), blockedId);
  }

  @Get('blocks')
  listBlocks(@Req() req: Request) {
    return this.safetyService.listBlocks(this.userId(req));
  }

  @Post('reports')
  report(@Req() req: Request, @Body() dto: CreateReportDto) {
    return this.safetyService.report(this.userId(req), dto);
  }

  @Post('message-reports')
  reportMessage(@Req() req: Request, @Body() dto: CreateMessageReportDto) {
    return this.safetyService.reportMessage(this.userId(req), dto);
  }
}

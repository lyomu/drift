import {
  Body,
  Controller,
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
import { MessagingService } from './messaging.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  private userId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }

  @Get()
  list(@Req() req: Request) {
    return this.messaging.listConversations(this.userId(req));
  }

  @Get(':id/messages')
  messages(
    @Req() req: Request,
    @Param('id') id: string,
    @Query('before') before?: string,
  ) {
    return this.messaging.getMessages(this.userId(req), id, before);
  }

  @Post(':id/messages')
  send(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messaging.sendMessage(this.userId(req), id, dto.body);
  }

  @Patch(':id/read')
  markRead(@Req() req: Request, @Param('id') id: string) {
    return this.messaging.markRead(this.userId(req), id);
  }
}

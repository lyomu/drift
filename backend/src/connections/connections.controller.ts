import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ConnectionStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConnectionsService } from './connections.service';
import { CreateConnectionDto } from './dto/create-connection.dto';

@Controller('connections')
@UseGuards(JwtAuthGuard)
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  private userId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }

  @Post()
  request(@Req() req: Request, @Body() dto: CreateConnectionDto) {
    return this.connectionsService.request(this.userId(req), dto.addresseeId);
  }

  @Get()
  listAccepted(@Req() req: Request) {
    return this.connectionsService.listAccepted(this.userId(req));
  }

  @Get('pending')
  listPending(@Req() req: Request) {
    return this.connectionsService.listPending(this.userId(req));
  }

  @Patch(':id/accept')
  accept(@Req() req: Request, @Param('id') id: string) {
    return this.connectionsService.respond(
      this.userId(req),
      id,
      ConnectionStatus.ACCEPTED,
    );
  }

  @Patch(':id/decline')
  decline(@Req() req: Request, @Param('id') id: string) {
    return this.connectionsService.respond(
      this.userId(req),
      id,
      ConnectionStatus.DECLINED,
    );
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.connectionsService.remove(this.userId(req), id);
  }
}

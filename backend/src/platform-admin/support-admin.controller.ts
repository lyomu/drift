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
import { PlatformPermission } from '@prisma/client';
import { RequirePlatformPermission } from './decorators/require-platform-permission.decorator';
import { PlatformGuard } from './guards/platform.guard';
import { PlatformPermissionGuard } from './guards/platform-permission.guard';
import { SupportAdminService } from './support-admin.service';
import {
  AssignSupportTicketDto,
  CloseSupportTicketDto,
  CreatePrivacyRequestDto,
  CreateSupportTicketDto,
  ProcessPrivacyRequestDto,
  RespondSupportTicketDto,
} from './dto/support-admin.dto';

@Controller('platform-admin/support')
@UseGuards(PlatformGuard, PlatformPermissionGuard)
@RequirePlatformPermission(PlatformPermission.SUPPORT_MANAGE)
export class SupportAdminController {
  constructor(private readonly support: SupportAdminService) {}

  @Get('tickets')
  tickets(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('search') search?: string,
  ) {
    return this.support.listTickets({ status, priority, assignedToId, search });
  }

  @Post('tickets')
  createTicket(
    @Req() req: { user: { adminId: string } },
    @Body() dto: CreateSupportTicketDto,
  ) {
    return this.support.createTicket(req.user.adminId, dto);
  }

  @Get('tickets/:id')
  ticketDetail(@Param('id') id: string) {
    return this.support.ticketDetail(id);
  }

  @Patch('tickets/:id/assign')
  assignTicket(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: AssignSupportTicketDto,
  ) {
    return this.support.assignTicket(req.user.adminId, id, dto);
  }

  @Post('tickets/:id/messages')
  respondToTicket(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: RespondSupportTicketDto,
  ) {
    return this.support.respondToTicket(req.user.adminId, id, dto);
  }

  @Post('tickets/:id/close')
  closeTicket(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: CloseSupportTicketDto,
  ) {
    return this.support.closeTicket(req.user.adminId, id, dto);
  }

  @Get('privacy-requests')
  privacyRequests(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    return this.support.listPrivacyRequests({ status, type, search });
  }

  @Post('privacy-requests')
  createPrivacyRequest(
    @Req() req: { user: { adminId: string } },
    @Body() dto: CreatePrivacyRequestDto,
  ) {
    return this.support.createPrivacyRequest(req.user.adminId, dto);
  }

  @Post('privacy-requests/:id/process')
  processPrivacyRequest(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: ProcessPrivacyRequestDto,
  ) {
    return this.support.processPrivacyRequest(req.user.adminId, id, dto);
  }
}

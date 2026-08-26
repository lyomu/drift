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
import { TrustSafetyAdminService } from './trust-safety-admin.service';
import {
  CreateAbuseCaseDto,
  OpenAbuseCaseDto,
  ReviewReportedContentDto,
  UpdateAbuseCaseDto,
} from './dto/trust-safety-admin.dto';

@Controller('platform-admin/trust-safety')
@UseGuards(PlatformGuard, PlatformPermissionGuard)
@RequirePlatformPermission(PlatformPermission.TRUST_SAFETY_MANAGE)
export class TrustSafetyAdminController {
  constructor(private readonly trustSafety: TrustSafetyAdminService) {}

  @Get('reports')
  reports(
    @Query('type') type?: string,
    @Query('state') state?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
  ) {
    return this.trustSafety.listReportedContent({
      type,
      state,
      priority,
      search,
    });
  }

  @Patch('reports/:type/:id')
  reviewReport(
    @Req() req: { user: { adminId: string } },
    @Param('type') type: string,
    @Param('id') id: string,
    @Body() dto: ReviewReportedContentDto,
  ) {
    return this.trustSafety.reviewReportedContent(
      req.user.adminId,
      type,
      id,
      dto,
    );
  }

  @Post('reports/:type/:id/case')
  openCaseFromReport(
    @Req() req: { user: { adminId: string } },
    @Param('type') type: string,
    @Param('id') id: string,
    @Body() dto: OpenAbuseCaseDto,
  ) {
    return this.trustSafety.openCaseFromReport(req.user.adminId, type, id, dto);
  }

  @Get('abuse-cases')
  cases(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
  ) {
    return this.trustSafety.listAbuseCases({ status, priority, search });
  }

  @Post('abuse-cases')
  createCase(
    @Req() req: { user: { adminId: string } },
    @Body() dto: CreateAbuseCaseDto,
  ) {
    return this.trustSafety.createAbuseCase(req.user.adminId, dto);
  }

  @Get('abuse-cases/:id')
  caseDetail(@Param('id') id: string) {
    return this.trustSafety.abuseCaseDetail(id);
  }

  @Patch('abuse-cases/:id')
  updateCase(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: UpdateAbuseCaseDto,
  ) {
    return this.trustSafety.updateAbuseCase(req.user.adminId, id, dto);
  }
}

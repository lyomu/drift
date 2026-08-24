import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ClubRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClubMembershipGuard } from './guards/club-membership.guard';
import { RequireClubRole } from './decorators/require-club-role.decorator';
import { SafetyService } from '../safety/safety.service';
import { UpdateReportDto } from './dto/update-report.dto';

const OWNER_OR_ADMIN = [ClubRole.OWNER, ClubRole.ADMIN];

@Controller('clubs/:clubId/reports')
@UseGuards(JwtAuthGuard, ClubMembershipGuard)
export class ReportsAdminController {
  constructor(private readonly safety: SafetyService) {}

  @Get()
  list(@Param('clubId') clubId: string) {
    return this.safety.listCourtReportsForClub(clubId);
  }

  @Patch(':id')
  @RequireClubRole(...OWNER_OR_ADMIN)
  resolve(
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Body() dto: UpdateReportDto,
  ) {
    return this.safety.resolveCourtReport(clubId, id, dto.status);
  }
}

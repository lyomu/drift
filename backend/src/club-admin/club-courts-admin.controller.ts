import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClubRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClubMembershipGuard } from './guards/club-membership.guard';
import { RequireClubRole } from './decorators/require-club-role.decorator';
import { CourtsService } from '../courts/courts.service';
import { CreateCourtDto, UpdateCourtDto } from './dto/court-admin.dto';

const OWNER_OR_ADMIN = [ClubRole.OWNER, ClubRole.ADMIN];

@Controller('clubs/:clubId/courts')
@UseGuards(JwtAuthGuard, ClubMembershipGuard)
export class ClubCourtsAdminController {
  constructor(private readonly courts: CourtsService) {}

  @Get()
  list(@Param('clubId') clubId: string) {
    return this.courts.listForClub(clubId);
  }

  @Post()
  @RequireClubRole(...OWNER_OR_ADMIN)
  create(@Param('clubId') clubId: string, @Body() dto: CreateCourtDto) {
    return this.courts.createForClub(clubId, dto);
  }

  @Patch(':id')
  @RequireClubRole(...OWNER_OR_ADMIN)
  update(
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCourtDto,
  ) {
    return this.courts.updateForClub(clubId, id, dto);
  }

  @Patch(':id/claim')
  @RequireClubRole(...OWNER_OR_ADMIN)
  claim(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.courts.claimForClub(clubId, id);
  }
}

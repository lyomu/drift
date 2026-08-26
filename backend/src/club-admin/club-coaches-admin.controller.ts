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
import { CoachesService } from '../coaches/coaches.service';
import { CreateCoachDto, UpdateCoachDto } from '../coaches/dto/coach-admin.dto';
import { RequireClubRole } from './decorators/require-club-role.decorator';
import { ClubMembershipGuard } from './guards/club-membership.guard';

const OWNER_OR_ADMIN = [ClubRole.OWNER, ClubRole.ADMIN];

@Controller('clubs/:clubId/coaches')
@UseGuards(JwtAuthGuard, ClubMembershipGuard)
export class ClubCoachesAdminController {
  constructor(private readonly coaches: CoachesService) {}

  @Get()
  list(@Param('clubId') clubId: string) {
    return this.coaches.listForClub(clubId);
  }

  @Post()
  @RequireClubRole(...OWNER_OR_ADMIN)
  create(@Param('clubId') clubId: string, @Body() dto: CreateCoachDto) {
    return this.coaches.createForClub(clubId, dto);
  }

  @Get(':coachId')
  findOne(@Param('clubId') clubId: string, @Param('coachId') coachId: string) {
    return this.coaches.findForClub(clubId, coachId);
  }

  @Patch(':coachId')
  @RequireClubRole(...OWNER_OR_ADMIN)
  update(
    @Param('clubId') clubId: string,
    @Param('coachId') coachId: string,
    @Body() dto: UpdateCoachDto,
  ) {
    return this.coaches.updateForClub(clubId, coachId, dto);
  }
}

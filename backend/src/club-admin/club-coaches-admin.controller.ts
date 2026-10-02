import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClubRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CoachesService } from '../coaches/coaches.service';
import { CreateCoachDto, UpdateCoachDto } from '../coaches/dto/coach-admin.dto';
import { UsersService } from '../users/users.service';
import { RequireClubRole } from './decorators/require-club-role.decorator';
import { ClubMembershipGuard } from './guards/club-membership.guard';

const OWNER_OR_ADMIN = [ClubRole.OWNER, ClubRole.ADMIN];

@Controller('clubs/:clubId/coaches')
@UseGuards(JwtAuthGuard, ClubMembershipGuard)
export class ClubCoachesAdminController {
  constructor(
    private readonly coaches: CoachesService,
    private readonly users: UsersService,
  ) {}

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

  /** A coach's photo is just their account's `User.photoUrl` — these two
   * routes let a club admin set it on a coach's behalf, reusing the same
   * upload/delete logic the coach's own `/users/me/photo` calls. */
  @Post(':coachId/photo')
  @RequireClubRole(...OWNER_OR_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  async uploadPhoto(
    @Param('clubId') clubId: string,
    @Param('coachId') coachId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('An image file is required.');
    const coach = await this.coaches.findForClub(clubId, coachId);
    await this.users.uploadPhoto(coach.userId, file);
    return this.coaches.findForClub(clubId, coachId);
  }

  @Delete(':coachId/photo')
  @RequireClubRole(...OWNER_OR_ADMIN)
  async deletePhoto(
    @Param('clubId') clubId: string,
    @Param('coachId') coachId: string,
  ) {
    const coach = await this.coaches.findForClub(clubId, coachId);
    await this.users.deletePhoto(coach.userId);
    return this.coaches.findForClub(clubId, coachId);
  }
}

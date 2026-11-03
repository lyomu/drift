import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResolveDisputeDto } from '../club-admin/dto/fixture-admin.dto';
import { CommunitiesService } from './communities.service';
import {
  CreateCommunityDto,
  CreateCommunityLadderDto,
  CreateCommunityLeagueDto,
  ReportCommunityDto,
  SearchCommunitiesDto,
  TransferOwnershipDto,
  UpdateCommunityDto,
  UpdateMemberRoleDto,
} from './dto/community.dto';

/** Player API for communities. Management actions check the caller's
 * community role inside the service. */
@Controller('communities')
@UseGuards(JwtAuthGuard)
export class CommunitiesController {
  constructor(private readonly communities: CommunitiesService) {}

  private userId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }

  @Get()
  search(@Req() req: Request, @Query() dto: SearchCommunitiesDto) {
    return this.communities.search(this.userId(req), dto);
  }

  @Get('mine')
  mine(@Req() req: Request) {
    return this.communities.mine(this.userId(req));
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreateCommunityDto) {
    return this.communities.create(this.userId(req), dto);
  }

  @Get(':id')
  detail(@Req() req: Request, @Param('id') id: string) {
    return this.communities.detail(this.userId(req), id);
  }

  @Patch(':id')
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateCommunityDto,
  ) {
    return this.communities.update(this.userId(req), id, dto);
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.communities.remove(this.userId(req), id);
  }

  /** Same 5MB ceiling and image-only rule as profile photos. */
  @Post(':id/photo')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  uploadPhoto(
    @Req() req: Request,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('An image file is required.');
    return this.communities.uploadPhoto(this.userId(req), id, file);
  }

  @Delete(':id/photo')
  deletePhoto(@Req() req: Request, @Param('id') id: string) {
    return this.communities.deletePhoto(this.userId(req), id);
  }

  // ---------------------------------------------------------- membership

  @Post(':id/join')
  join(@Req() req: Request, @Param('id') id: string) {
    return this.communities.join(this.userId(req), id);
  }

  @Delete(':id/join')
  cancelRequest(@Req() req: Request, @Param('id') id: string) {
    return this.communities.cancelRequest(this.userId(req), id);
  }

  @Post(':id/leave')
  leave(@Req() req: Request, @Param('id') id: string) {
    return this.communities.leave(this.userId(req), id);
  }

  @Post(':id/mute')
  mute(@Req() req: Request, @Param('id') id: string) {
    return this.communities.setMuted(this.userId(req), id, true);
  }

  @Post(':id/unmute')
  unmute(@Req() req: Request, @Param('id') id: string) {
    return this.communities.setMuted(this.userId(req), id, false);
  }

  @Post(':id/report')
  report(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: ReportCommunityDto,
  ) {
    return this.communities.report(this.userId(req), id, dto);
  }

  @Get(':id/members')
  members(@Req() req: Request, @Param('id') id: string) {
    return this.communities.members(this.userId(req), id);
  }

  @Post(':id/requests/:userId/approve')
  approve(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.communities.approveRequest(this.userId(req), id, userId);
  }

  @Post(':id/requests/:userId/decline')
  decline(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.communities.declineRequest(this.userId(req), id, userId);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.communities.removeMember(this.userId(req), id, userId);
  }

  @Patch(':id/members/:userId')
  updateRole(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.communities.updateRole(this.userId(req), id, userId, dto.role);
  }

  @Post(':id/transfer')
  transfer(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: TransferOwnershipDto,
  ) {
    return this.communities.transferOwnership(this.userId(req), id, dto.userId);
  }

  // -------------------------------------------------------- competitions

  @Get(':id/competitions')
  competitions(@Req() req: Request, @Param('id') id: string) {
    return this.communities.competitions(this.userId(req), id);
  }

  @Post(':id/ladders')
  createLadder(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: CreateCommunityLadderDto,
  ) {
    return this.communities.createLadder(this.userId(req), id, dto);
  }

  @Post(':id/leagues')
  createLeague(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: CreateCommunityLeagueDto,
  ) {
    return this.communities.createLeague(this.userId(req), id, dto);
  }

  @Get(':id/disputes')
  disputes(@Req() req: Request, @Param('id') id: string) {
    return this.communities.disputes(this.userId(req), id);
  }

  @Patch(':id/disputes/:fixtureId/resolve')
  resolveDispute(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('fixtureId') fixtureId: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.communities.resolveDispute(
      this.userId(req),
      id,
      fixtureId,
      dto.ruling,
    );
  }
}

/**
 * Public read side of community photos, unauthenticated for the same reason
 * as `/media/user-photos` (NetworkImage can't carry a refreshing bearer
 * token); addressed by the asset's UUID, not the community id.
 */
@Controller('media')
export class CommunityMediaController {
  constructor(private readonly communities: CommunitiesService) {}

  @Get('community-photos/:id')
  async photo(@Param('id') id: string, @Res() res: Response) {
    const asset = await this.communities.photoContent(id);
    res.setHeader('Content-Type', asset.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${asset.filename.replaceAll('"', '')}"`,
    );
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(Buffer.from(asset.bytes));
  }
}

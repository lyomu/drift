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
import { ClubMembership } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClubMembershipGuard } from '../club-admin/guards/club-membership.guard';
import { ClubFeedService } from './club-feed.service';
import { CreateClubPostDto, ReactionDto } from './dto/club-post.dto';

/**
 * Members-only, by design: Doc 4 §A.9 calls Club Feed "community
 * conversation for a joined club". ClubMembershipGuard already rejects
 * anyone without an ACTIVE membership, so a PENDING request sees 403 until
 * an admin approves it.
 */
@Controller('clubs/:clubId/posts')
@UseGuards(JwtAuthGuard, ClubMembershipGuard)
export class ClubFeedController {
  constructor(private readonly feed: ClubFeedService) {}

  private userId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }

  private role(req: Request) {
    return (req as Request & { clubMembership?: ClubMembership }).clubMembership
      ?.role;
  }

  @Get()
  list(@Req() req: Request, @Param('clubId') clubId: string) {
    return this.feed.list(clubId, this.userId(req));
  }

  @Post()
  create(
    @Req() req: Request,
    @Param('clubId') clubId: string,
    @Body() dto: CreateClubPostDto,
  ) {
    return this.feed.create(clubId, this.userId(req), dto);
  }

  @Delete(':postId')
  remove(
    @Req() req: Request,
    @Param('clubId') clubId: string,
    @Param('postId') postId: string,
  ) {
    return this.feed.remove(clubId, postId, this.userId(req), this.role(req));
  }

  @Post(':postId/reactions')
  react(
    @Req() req: Request,
    @Param('clubId') clubId: string,
    @Param('postId') postId: string,
    @Body() dto: ReactionDto,
  ) {
    return this.feed.react(clubId, postId, this.userId(req), dto);
  }

  @Delete(':postId/reactions')
  unreact(
    @Req() req: Request,
    @Param('clubId') clubId: string,
    @Param('postId') postId: string,
    @Body() dto: ReactionDto,
  ) {
    return this.feed.unreact(clubId, postId, this.userId(req), dto);
  }
}

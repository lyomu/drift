import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HomeService } from './home.service';
import { DismissCardDto } from './dto/dismiss-card.dto';

@Controller('home')
@UseGuards(JwtAuthGuard)
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get('feed')
  feed(@Req() req: Request) {
    const { userId } = req.user as { userId: string };
    return this.homeService.getFeed(userId);
  }

  /** The identity header above the feed — see `HomeService.getSummary`. */
  @Get('summary')
  summary(@Req() req: Request) {
    const { userId } = req.user as { userId: string };
    return this.homeService.getSummary(userId);
  }

  /**
   * Dismiss or snooze one card. Scoped to the caller by `userId` from the
   * JWT, never from the body — a dismissal is per-user state, so there is no
   * id here an attacker could swap to affect somebody else's feed.
   */
  @Post('cards/:cardId/dismiss')
  dismiss(
    @Req() req: Request,
    @Param('cardId') cardId: string,
    @Body() dto: DismissCardDto,
  ) {
    const { userId } = req.user as { userId: string };
    return this.homeService.dismissCard(userId, cardId, dto.snoozeHours);
  }
}

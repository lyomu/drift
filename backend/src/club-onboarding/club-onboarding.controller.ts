import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { ClubOnboardingService } from './club-onboarding.service';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';
import {
  CompleteClubSetupDto,
  SubmitClubRequestDto,
} from './dto/club-onboarding.dto';

/** Public — the pre-account club-creation request + magic-link setup flow. */
@Controller('club-creation-requests')
export class ClubOnboardingController {
  constructor(private readonly onboarding: ClubOnboardingService) {}

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  submit(@Body() dto: SubmitClubRequestDto) {
    return this.onboarding.submitRequest(dto);
  }

  @Get(':token')
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  byToken(@Param('token') token: string) {
    return this.onboarding.getByToken(token);
  }

  @Post(':token/complete')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @UseGuards(OptionalJwtAuthGuard)
  complete(
    @Req() req: Request,
    @Param('token') token: string,
    @Body() dto: CompleteClubSetupDto,
  ) {
    const userId = (req.user as { userId?: string } | undefined)?.userId;
    return this.onboarding.complete(token, dto, userId);
  }
}

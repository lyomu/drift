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
import { CommercialAdminService } from './commercial-admin.service';
import {
  DeactivatePromotionDto,
  DeactivateSponsorPlacementDto,
  RefundTransactionDto,
  UpsertPaymentPlanDto,
  UpsertPromotionDto,
  UpsertSponsorPlacementDto,
} from './dto/commercial-admin.dto';
import { SUPPORTED_CURRENCIES } from './supported-currencies';

@Controller('platform-admin/commercial')
@UseGuards(PlatformGuard, PlatformPermissionGuard)
@RequirePlatformPermission(PlatformPermission.COMMERCIAL_MANAGE)
export class CommercialAdminController {
  constructor(private readonly commercial: CommercialAdminService) {}

  /**
   * The currencies a plan or promotion may be priced in. The console renders
   * its currency dropdown from this, so the options it offers and the codes
   * the DTOs accept can never drift apart.
   */
  @Get('currencies')
  listCurrencies() {
    return { currencies: SUPPORTED_CURRENCIES };
  }

  @Get('plans')
  listPlans(
    @Query('audience') audience?: string,
    @Query('status') status?: string,
  ) {
    return this.commercial.listPlans({ audience, status });
  }

  @Post('plans')
  createPlan(
    @Req() req: { user: { adminId: string } },
    @Body() dto: UpsertPaymentPlanDto,
  ) {
    return this.commercial.createPlan(req.user.adminId, dto);
  }

  @Patch('plans/:id')
  updatePlan(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: UpsertPaymentPlanDto,
  ) {
    return this.commercial.updatePlan(req.user.adminId, id, dto);
  }

  @Get('payments')
  listPayments(
    @Query('status') status?: string,
    @Query('audience') audience?: string,
    @Query('currency') currency?: string,
    @Query('search') search?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.commercial.listPayments({
      status,
      audience,
      currency,
      search,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
  }

  @Get('payments/:id')
  paymentDetail(@Param('id') id: string) {
    return this.commercial.paymentDetail(id);
  }

  @Post('payments/:id/refund')
  refundTransaction(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: RefundTransactionDto,
  ) {
    return this.commercial.refundTransaction(req.user.adminId, id, dto);
  }

  @Get('promotions')
  listPromotions(
    @Query('status') status?: string,
    @Query('audience') audience?: string,
  ) {
    return this.commercial.listPromotions({ status, audience });
  }

  @Post('promotions')
  createPromotion(
    @Req() req: { user: { adminId: string } },
    @Body() dto: UpsertPromotionDto,
  ) {
    return this.commercial.createPromotion(req.user.adminId, dto);
  }

  @Patch('promotions/:id')
  updatePromotion(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: UpsertPromotionDto,
  ) {
    return this.commercial.updatePromotion(req.user.adminId, id, dto);
  }

  @Post('promotions/:id/deactivate')
  deactivatePromotion(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: DeactivatePromotionDto,
  ) {
    return this.commercial.deactivatePromotion(req.user.adminId, id, dto);
  }

  @Get('sponsors')
  listSponsorPlacements(
    @Query('state') state?: string,
    @Query('placementKey') placementKey?: string,
  ) {
    return this.commercial.listSponsorPlacements({ state, placementKey });
  }

  @Post('sponsors')
  createSponsorPlacement(
    @Req() req: { user: { adminId: string } },
    @Body() dto: UpsertSponsorPlacementDto,
  ) {
    return this.commercial.createSponsorPlacement(req.user.adminId, dto);
  }

  @Patch('sponsors/:id')
  updateSponsorPlacement(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: UpsertSponsorPlacementDto,
  ) {
    return this.commercial.updateSponsorPlacement(req.user.adminId, id, dto);
  }

  @Post('sponsors/:id/deactivate')
  deactivateSponsorPlacement(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: DeactivateSponsorPlacementDto,
  ) {
    return this.commercial.deactivateSponsorPlacement(
      req.user.adminId,
      id,
      dto,
    );
  }
}

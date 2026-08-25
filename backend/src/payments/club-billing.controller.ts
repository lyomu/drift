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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChangeSubscriptionDto } from './dto/change-subscription.dto';
import { AddPaymentMethodDto } from './dto/payment-method.dto';
import { PaymentsService } from './payments.service';

@Controller('clubs/:clubId/billing')
@UseGuards(JwtAuthGuard)
export class ClubBillingController {
  constructor(private readonly payments: PaymentsService) {}

  private userId(req: Request) {
    return (req.user as { userId: string }).userId;
  }

  @Get()
  billing(@Req() req: Request, @Param('clubId') clubId: string) {
    return this.payments.clubBilling(this.userId(req), clubId);
  }

  @Post('methods')
  addMethod(
    @Req() req: Request,
    @Param('clubId') clubId: string,
    @Body() dto: AddPaymentMethodDto,
  ) {
    return this.payments.addClubMethod(this.userId(req), clubId, dto);
  }

  @Delete('methods/:methodId')
  removeMethod(
    @Req() req: Request,
    @Param('clubId') clubId: string,
    @Param('methodId') methodId: string,
  ) {
    return this.payments.removeClubMethod(
      this.userId(req),
      clubId,
      methodId,
    );
  }

  @Post('subscription')
  changeSubscription(
    @Req() req: Request,
    @Param('clubId') clubId: string,
    @Body() dto: ChangeSubscriptionDto,
  ) {
    return this.payments.changeClubSubscription(
      this.userId(req),
      clubId,
      dto,
    );
  }

  @Get('invoices/:invoiceId')
  receipt(
    @Req() req: Request,
    @Param('clubId') clubId: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.payments.clubReceipt(this.userId(req), clubId, invoiceId);
  }
}

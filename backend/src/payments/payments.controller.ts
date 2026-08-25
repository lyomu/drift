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

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  private userId(req: Request) {
    return (req.user as { userId: string }).userId;
  }

  @Get('plans')
  plans() {
    return this.payments.playerPlans();
  }

  @Get('summary')
  summary(@Req() req: Request) {
    return this.payments.playerSummary(this.userId(req));
  }

  @Get('methods')
  methods(@Req() req: Request) {
    return this.payments.playerMethods(this.userId(req));
  }

  @Post('methods')
  addMethod(@Req() req: Request, @Body() dto: AddPaymentMethodDto) {
    return this.payments.addPlayerMethod(this.userId(req), dto);
  }

  @Delete('methods/:methodId')
  removeMethod(@Req() req: Request, @Param('methodId') methodId: string) {
    return this.payments.removePlayerMethod(this.userId(req), methodId);
  }

  @Post('subscription')
  changeSubscription(
    @Req() req: Request,
    @Body() dto: ChangeSubscriptionDto,
  ) {
    return this.payments.changePlayerSubscription(this.userId(req), dto);
  }

  @Get('invoices')
  invoices(@Req() req: Request) {
    return this.payments.playerInvoices(this.userId(req));
  }

  @Get('invoices/:invoiceId')
  receipt(@Req() req: Request, @Param('invoiceId') invoiceId: string) {
    return this.payments.playerReceipt(this.userId(req), invoiceId);
  }
}

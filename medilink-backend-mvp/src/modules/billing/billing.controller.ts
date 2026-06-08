import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RequestUser } from '../../common/types/request-user.type';
import { BillingService } from './billing.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';

@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('establishments/:id/status')
  @UseGuards(AuthGuard)
  status(@CurrentUser() user: RequestUser, @Param('id') establishmentId: string) {
    return this.billing.getEstablishmentBillingStatus(user, establishmentId);
  }

  @Post('checkout/subscription')
  @UseGuards(AuthGuard)
  createSubscriptionCheckout(@CurrentUser() user: RequestUser, @Body() dto: CreateCheckoutSessionDto) {
    return this.billing.createSubscriptionCheckout(user, dto.establishmentId);
  }

  @Post('checkout/publication-credit')
  @UseGuards(AuthGuard)
  createPublicationCreditCheckout(@CurrentUser() user: RequestUser, @Body() dto: CreateCheckoutSessionDto) {
    return this.billing.createPublicationCreditCheckout(user, dto.establishmentId);
  }

  @Post('portal')
  @UseGuards(AuthGuard)
  createPortal(@CurrentUser() user: RequestUser, @Body() dto: CreateCheckoutSessionDto) {
    return this.billing.createBillingPortal(user, dto.establishmentId);
  }

  @Post('webhooks/stripe')
  handleStripeWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ) {
    return this.billing.handleStripeWebhook(request.rawBody, signature);
  }
}


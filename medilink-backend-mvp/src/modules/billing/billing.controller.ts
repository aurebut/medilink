import { Body, Controller, Get, Headers, Param, Post, Req } from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequestUser } from '../../common/types/request-user.type';
import { BillingService } from './billing.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';

@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('establishments/:id/status')
  status(@CurrentUser() user: RequestUser, @Param('id') establishmentId: string) {
    return this.billing.getEstablishmentBillingStatus(user, establishmentId);
  }

  @Post('checkout/subscription')
  createSubscriptionCheckout(@CurrentUser() user: RequestUser, @Body() dto: CreateCheckoutSessionDto) {
    return this.billing.createSubscriptionCheckout(user, dto.establishmentId);
  }

  @Post('checkout/publication-credit')
  createPublicationCreditCheckout(@CurrentUser() user: RequestUser, @Body() dto: CreateCheckoutSessionDto) {
    return this.billing.createPublicationCreditCheckout(user, dto.establishmentId);
  }

  @Post('portal')
  createPortal(@CurrentUser() user: RequestUser, @Body() dto: CreateCheckoutSessionDto) {
    return this.billing.createBillingPortal(user, dto.establishmentId);
  }

  @Post('webhooks/stripe')
  @Public()
  handleStripeWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ) {
    return this.billing.handleStripeWebhook(request.rawBody, signature);
  }
}


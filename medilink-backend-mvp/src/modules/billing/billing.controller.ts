import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RequestUser } from '../../common/types/request-user.type';
import { BillingService } from './billing.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { AccountingService } from './accounting.service';
import { CreateAccountingEntryDto, SetAccountingClassificationDto, UpdateAccountingSettingsDto } from './dto/accounting.dto';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly accounting: AccountingService,
  ) {}

  @Get('accounting/candidate')
  @UseGuards(AuthGuard)
  candidateAccounting(@CurrentUser() user: RequestUser) {
    return this.accounting.getCandidateWorkspace(user);
  }

  @Post('accounting/candidate/entries')
  @UseGuards(AuthGuard)
  createCandidateAccountingEntry(@CurrentUser() user: RequestUser, @Body() dto: CreateAccountingEntryDto) {
    return this.accounting.createCandidateEntry(user, dto);
  }

  @Delete('accounting/candidate/entries/:entryId')
  @UseGuards(AuthGuard)
  deleteCandidateAccountingEntry(@CurrentUser() user: RequestUser, @Param('entryId') entryId: string) {
    return this.accounting.deleteCandidateEntry(user, entryId);
  }

  @Patch('accounting/candidate/settings')
  @UseGuards(AuthGuard)
  updateCandidateAccountingSettings(@CurrentUser() user: RequestUser, @Body() dto: UpdateAccountingSettingsDto) {
    return this.accounting.updateCandidateSettings(user, dto);
  }

  @Post('accounting/candidate/classification')
  @UseGuards(AuthGuard)
  classifyCandidateAccountingRecord(@CurrentUser() user: RequestUser, @Body() dto: SetAccountingClassificationDto) {
    return this.accounting.classifyCandidateRecord(user, dto);
  }

  @Get('accounting/establishments/:id')
  @UseGuards(AuthGuard)
  establishmentAccounting(@CurrentUser() user: RequestUser, @Param('id') establishmentId: string) {
    return this.accounting.getEstablishmentWorkspace(user, establishmentId);
  }

  @Post('accounting/establishments/:id/entries')
  @UseGuards(AuthGuard)
  createEstablishmentAccountingEntry(@CurrentUser() user: RequestUser, @Param('id') establishmentId: string, @Body() dto: CreateAccountingEntryDto) {
    return this.accounting.createEstablishmentEntry(user, establishmentId, dto);
  }

  @Delete('accounting/establishments/:id/entries/:entryId')
  @UseGuards(AuthGuard)
  deleteEstablishmentAccountingEntry(@CurrentUser() user: RequestUser, @Param('id') establishmentId: string, @Param('entryId') entryId: string) {
    return this.accounting.deleteEstablishmentEntry(user, establishmentId, entryId);
  }

  @Patch('accounting/establishments/:id/settings')
  @UseGuards(AuthGuard)
  updateEstablishmentAccountingSettings(@CurrentUser() user: RequestUser, @Param('id') establishmentId: string, @Body() dto: UpdateAccountingSettingsDto) {
    return this.accounting.updateEstablishmentSettings(user, establishmentId, dto);
  }

  @Post('accounting/establishments/:id/classification')
  @UseGuards(AuthGuard)
  classifyEstablishmentAccountingRecord(@CurrentUser() user: RequestUser, @Param('id') establishmentId: string, @Body() dto: SetAccountingClassificationDto) {
    return this.accounting.classifyEstablishmentRecord(user, establishmentId, dto);
  }

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


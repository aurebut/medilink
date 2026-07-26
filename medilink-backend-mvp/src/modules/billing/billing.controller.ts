import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Req } from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequestUser } from '../../common/types/request-user.type';
import { BillingService } from './billing.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { AccountingService } from './accounting.service';
import { CreateAccountingEntryDto, SetAccountingClassificationDto, UpdateAccountingSettingsDto, UpdateCandidateAccountingProfileDto } from './dto/accounting.dto';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly accounting: AccountingService,
  ) {}

  @Get('accounting/candidate')
  candidateAccounting(@CurrentUser() user: RequestUser) {
    return this.accounting.getCandidateWorkspace(user);
  }

  @Post('accounting/candidate/entries')
  createCandidateAccountingEntry(@CurrentUser() user: RequestUser, @Body() dto: CreateAccountingEntryDto) {
    return this.accounting.createCandidateEntry(user, dto);
  }

  @Delete('accounting/candidate/entries/:entryId')
  deleteCandidateAccountingEntry(@CurrentUser() user: RequestUser, @Param('entryId') entryId: string) {
    return this.accounting.deleteCandidateEntry(user, entryId);
  }

  @Patch('accounting/candidate/settings')
  updateCandidateAccountingSettings(@CurrentUser() user: RequestUser, @Body() dto: UpdateAccountingSettingsDto) {
    return this.accounting.updateCandidateSettings(user, dto);
  }

  @Patch('accounting/candidate/profile')
  updateCandidateAccountingProfile(@CurrentUser() user: RequestUser, @Body() dto: UpdateCandidateAccountingProfileDto) {
    return this.accounting.updateCandidateProfile(user, dto);
  }

  @Post('accounting/candidate/classification')
  classifyCandidateAccountingRecord(@CurrentUser() user: RequestUser, @Body() dto: SetAccountingClassificationDto) {
    return this.accounting.classifyCandidateRecord(user, dto);
  }

  @Get('accounting/establishments/:id')
  establishmentAccounting(@CurrentUser() user: RequestUser, @Param('id') establishmentId: string) {
    return this.accounting.getEstablishmentWorkspace(user, establishmentId);
  }

  @Post('accounting/establishments/:id/entries')
  createEstablishmentAccountingEntry(@CurrentUser() user: RequestUser, @Param('id') establishmentId: string, @Body() dto: CreateAccountingEntryDto) {
    return this.accounting.createEstablishmentEntry(user, establishmentId, dto);
  }

  @Delete('accounting/establishments/:id/entries/:entryId')
  deleteEstablishmentAccountingEntry(@CurrentUser() user: RequestUser, @Param('id') establishmentId: string, @Param('entryId') entryId: string) {
    return this.accounting.deleteEstablishmentEntry(user, establishmentId, entryId);
  }

  @Patch('accounting/establishments/:id/settings')
  updateEstablishmentAccountingSettings(@CurrentUser() user: RequestUser, @Param('id') establishmentId: string, @Body() dto: UpdateAccountingSettingsDto) {
    return this.accounting.updateEstablishmentSettings(user, establishmentId, dto);
  }

  @Post('accounting/establishments/:id/classification')
  classifyEstablishmentAccountingRecord(@CurrentUser() user: RequestUser, @Param('id') establishmentId: string, @Body() dto: SetAccountingClassificationDto) {
    return this.accounting.classifyEstablishmentRecord(user, establishmentId, dto);
  }

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


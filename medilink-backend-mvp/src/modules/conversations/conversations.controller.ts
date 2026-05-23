import { Body, Controller, Get, MessageEvent, Param, Post, Res, Sse, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RequestUser } from '../../common/types/request-user.type';
import { ConversationEventsService } from './conversation-events.service';
import { ConversationsService } from './conversations.service';
import { SendMessageDto } from './dto/send-message.dto';
import { SendProposalDto } from './dto/workflow-action.dto';

@Controller('conversations')
@UseGuards(AuthGuard)
export class ConversationsController {
  constructor(
    private readonly conversations: ConversationsService,
    private readonly events: ConversationEventsService,
  ) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.conversations.list(user);
  }

  @Sse('events')
  eventsStream(@CurrentUser() user: RequestUser): Observable<MessageEvent> {
    return this.events.streamForUser(user.id);
  }

  @Get(':id')
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.conversations.get(user, id);
  }

  @Get(':id/messages')
  messages(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.conversations.messages(user, id);
  }

  @Post(':id/messages')
  send(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.conversations.sendMessage(user, id, dto);
  }

  @Post(':id/proposal')
  sendProposal(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: SendProposalDto) {
    return this.conversations.sendProposal(user, id, dto);
  }

  @Post(':id/proposal/accept')
  acceptProposal(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.conversations.acceptProposal(user, id);
  }

  @Post(':id/proposal/reject')
  rejectProposal(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.conversations.rejectProposal(user, id);
  }

  @Post(':id/mission/complete')
  completeMission(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.conversations.markCompleted(user, id);
  }

  @Post(':id/payment/secure')
  securePayment(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.conversations.securePayment(user, id);
  }

  @Post(':id/payment/release')
  releasePayment(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.conversations.releasePayment(user, id);
  }

  @Post(':id/invoices/generate')
  generateInvoices(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.conversations.generateInvoices(user, id);
  }

  @Get(':id/invoices/:type.pdf')
  async downloadInvoice(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('type') type: 'recruiter' | 'candidate',
    @Res() response: Response,
  ) {
    const invoice = await this.conversations.downloadInvoicePdf(user, id, type);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="${invoice.fileName}"`);
    response.send(invoice.buffer);
  }

  @Post(':id/read')
  read(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.conversations.markAsRead(user, id);
  }

  @Post(':id/archive')
  archive(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.conversations.archive(user, id);
  }
}

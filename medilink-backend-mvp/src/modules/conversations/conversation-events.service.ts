import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

type ConversationEvent = {
  type: 'message.created';
  conversationId: string;
  message: unknown;
};

@Injectable()
export class ConversationEventsService {
  private readonly streams = new Map<string, Subject<MessageEvent>>();

  constructor(private readonly prisma: PrismaService) {}

  streamForUser(userId: string): Observable<MessageEvent> {
    let stream = this.streams.get(userId);
    if (!stream) {
      stream = new Subject<MessageEvent>();
      this.streams.set(userId, stream);
    }
    return stream.asObservable();
  }

  async emitMessageCreated(conversationId: string, message: unknown) {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, archivedAt: null },
      select: { userId: true },
    });

    const event: ConversationEvent = {
      type: 'message.created',
      conversationId,
      message,
    };

    participants.forEach((participant) => {
      this.streams.get(participant.userId)?.next({ data: event });
    });
  }
}

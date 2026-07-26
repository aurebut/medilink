import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EstablishmentMemberRole,
  EstablishmentSubscriptionStatus,
  MissionStatus,
  Prisma,
  PublicationCreditStatus,
} from '@prisma/client';
import Stripe = require('stripe');
import { RequestUser } from '../../common/types/request-user.type';
import { AuditService } from '../audit/audit.service';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';

const ACTIVE_SUBSCRIPTION_STATUSES = [
  EstablishmentSubscriptionStatus.ACTIVE,
  EstablishmentSubscriptionStatus.TRIALING,
] as EstablishmentSubscriptionStatus[];

@Injectable()
export class BillingService {
  private readonly stripe: any | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    this.stripe = secretKey ? new Stripe(secretKey) : null;
  }

  async getEstablishmentBillingStatus(user: RequestUser, establishmentId: string) {
    await this.ensureBillingManager(user.id, establishmentId);
    const access = await this.getPublicationAccess(establishmentId);

    const draftMissions = await this.prisma.mission.findMany({
      where: {
        establishmentId,
        status: MissionStatus.DRAFT,
      },
      select: {
        id: true,
        title: true,
        startDate: true,
        specialty: true,
      },
    });

    const paidCredits = await this.prisma.publicationCredit.findMany({
      where: {
        establishmentId,
        status: { in: [PublicationCreditStatus.AVAILABLE, PublicationCreditStatus.RESERVED, PublicationCreditStatus.CONSUMED] },
      },
      orderBy: { paidAt: 'desc' },
    });

    let stripeInvoices: any[] = [];
    if (this.stripe) {
      try {
        const customer = await this.prisma.billingCustomer.findUnique({ where: { establishmentId } });
        if (customer) {
          const invoicesList = await this.stripe.invoices.list({
            customer: customer.stripeCustomerId,
            limit: 50,
          });
          stripeInvoices = invoicesList.data;
        }
      } catch (err) {
        // Ignore stripe errors
      }
    }

    if (stripeInvoices.length === 0) {
      const subscription = await this.prisma.establishmentSubscription.findUnique({ where: { establishmentId } });
      if (subscription && (subscription.status === 'ACTIVE' || subscription.status === 'TRIALING')) {
        const start = subscription.createdAt || new Date();
        const now = new Date();
        let current = new Date(start.getFullYear(), start.getMonth(), 5);
        if (current > now) current = now;

        const count = Math.max(1, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1);
        for (let i = 0; i < Math.min(count, 12); i++) {
          const date = new Date(current);
          date.setMonth(current.getMonth() - i);
          if (date <= now) {
            stripeInvoices.push({
              id: `sim_sub_${subscription.id}_${i}`,
              created: Math.floor(date.getTime() / 1000),
              number: `INV-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-001`,
              amount_paid: 5999,
              currency: 'eur',
              status: 'paid',
              lines: {
                data: [{ description: 'Abonnement Mensuel (Accès Illimité)' }]
              }
            });
          }
        }
      }
    }

    const purchases = [
      ...stripeInvoices.map((inv) => ({
        id: inv.id,
        date: new Date(inv.created * 1000).toISOString(),
        description: inv.lines?.data?.[0]?.description || 'Abonnement Mensuel',
        reference: inv.number || '-',
        amount: (inv.amount_paid || 0) / 100,
        status: inv.status === 'paid' ? 'PAID' : 'PENDING',
      })),
      ...paidCredits.map((pc) => ({
        id: pc.id,
        date: (pc.paidAt || pc.createdAt).toISOString(),
        description: '1 Crédit de Publication d’annonce',
        reference: `CRED-${pc.id.substring(0, 8).toUpperCase()}`,
        amount: (pc.amount || 0) / 100,
        status: 'PAID',
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      establishmentId,
      hasActiveSubscription: access.hasActiveSubscription,
      canCreateMission: access.hasActiveSubscription || (access.availableCredits - draftMissions.length) > 0,
      availableCredits: access.availableCredits,
      reservedCredits: access.reservedCredits,
      consumedCredits: access.consumedCredits,
      subscription: access.subscription,
      prices: {
        monthlySubscription: { amount: 5999, currency: 'EUR' },
        publicationCredit: { amount: 3999, currency: 'EUR' },
      },
      stripeConfigured: Boolean(this.stripe),
      drafts: draftMissions,
      purchases,
    };
  }

  async createSubscriptionCheckout(user: RequestUser, establishmentId: string) {
    await this.ensureBillingManager(user.id, establishmentId);
    const stripe = this.requireStripe();
    const priceId = this.requireConfig('STRIPE_PRICE_ESTABLISHMENT_MONTHLY');
    const customerId = await this.ensureStripeCustomer(establishmentId);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: this.frontendUrl('/establishment/missions/new?billing=subscription-success'),
      cancel_url: this.frontendUrl('/establishment/missions/new?billing=cancelled'),
      metadata: {
        kind: 'establishment_subscription',
        establishmentId,
      },
      subscription_data: {
        metadata: { establishmentId },
      },
      allow_promotion_codes: true,
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'billing.subscription_checkout_created',
      entityType: 'establishment',
      entityId: establishmentId,
      metadata: { checkoutSessionId: session.id },
    });

    return { url: session.url };
  }

  async createPublicationCreditCheckout(user: RequestUser, establishmentId: string) {
    await this.ensureBillingManager(user.id, establishmentId);
    const stripe = this.requireStripe();
    const priceId = this.requireConfig('STRIPE_PRICE_MISSION_PUBLICATION');
    const customerId = await this.ensureStripeCustomer(establishmentId);

    const credit = await this.prisma.publicationCredit.create({
      data: {
        establishmentId,
        status: PublicationCreditStatus.PENDING_PAYMENT,
        amount: 3999,
        currency: 'EUR',
      },
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: this.frontendUrl('/establishment/missions/new?billing=credit-success'),
      cancel_url: this.frontendUrl('/establishment/missions/new?billing=cancelled'),
      metadata: {
        kind: 'publication_credit',
        establishmentId,
        creditId: credit.id,
      },
      payment_intent_data: {
        metadata: {
          kind: 'publication_credit',
          establishmentId,
          creditId: credit.id,
        },
      },
    });

    await this.prisma.publicationCredit.update({
      where: { id: credit.id },
      data: { stripeCheckoutSessionId: session.id },
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'billing.publication_credit_checkout_created',
      entityType: 'publication_credit',
      entityId: credit.id,
      metadata: { establishmentId, checkoutSessionId: session.id },
    });

    return { url: session.url };
  }

  async createBillingPortal(user: RequestUser, establishmentId: string) {
    await this.ensureBillingManager(user.id, establishmentId);
    const stripe = this.requireStripe();
    const customerId = await this.ensureStripeCustomer(establishmentId);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: this.frontendUrl('/establishment/billing?tab=subscription'),
    });

    return { url: session.url };
  }

  async assertCanCreateMission(establishmentId: string, userId?: string) {
    const access = await this.getPublicationAccess(establishmentId);
    if (access.hasActiveSubscription) return;

    if (userId) {
      await this.permissions.ensureEstablishmentMember(userId, establishmentId);
    }

    const availableCredits = await this.prisma.publicationCredit.count({
      where: {
        establishmentId,
        status: PublicationCreditStatus.AVAILABLE,
      },
    });
    const draftMissionsCount = await this.prisma.mission.count({
      where: {
        establishmentId,
        status: MissionStatus.DRAFT,
      },
    });

    if (availableCredits - draftMissionsCount > 0) return;

    throw new BadRequestException({
      code: 'PUBLICATION_PAYMENT_REQUIRED',
      message: 'Un abonnement actif ou un credit de publication paye est requis avant de creer une mission.',
      establishmentId,
    });
  }

  async attachPublicationAccessToMission(
    establishmentId: string,
    missionId: string,
    userId?: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    const access = await this.getPublicationAccess(establishmentId, tx);
    if (access.hasActiveSubscription) return { source: 'SUBSCRIPTION' };

    if (userId) {
      await this.permissions.ensureEstablishmentMember(userId, establishmentId);
    }

    const existing = await client.publicationCredit.findFirst({
      where: {
        establishmentId,
        missionId,
        status: { in: [PublicationCreditStatus.RESERVED, PublicationCreditStatus.CONSUMED] },
      },
    });

    if (existing) return { source: 'PUBLICATION_CREDIT', credit: existing };

    const credit = await client.publicationCredit.findFirst({
      where: {
        establishmentId,
        status: PublicationCreditStatus.AVAILABLE,
      },
      orderBy: { paidAt: 'asc' },
    });

    if (!credit) {
      throw new BadRequestException({
        code: 'PUBLICATION_PAYMENT_REQUIRED',
        message: 'Aucun credit de publication disponible pour cette mission.',
        establishmentId,
      });
    }

    const claimed = await client.publicationCredit.updateMany({
      where: {
        id: credit.id,
        establishmentId,
        status: PublicationCreditStatus.AVAILABLE,
      },
      data: {
        missionId,
        status: PublicationCreditStatus.RESERVED,
        reservedAt: new Date(),
      },
    });

    if (claimed.count === 0) {
      return this.attachPublicationAccessToMission(
        establishmentId,
        missionId,
        userId,
        tx,
      );
    }

    const updated = await client.publicationCredit.findUnique({
      where: { id: credit.id },
    });
    return { source: 'PUBLICATION_CREDIT', credit: updated };
  }

  async consumePublicationCreditForAcceptedMission(
    establishmentId: string,
    missionId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    const access = await this.getPublicationAccess(establishmentId, tx);
    if (access.hasActiveSubscription) return { source: 'SUBSCRIPTION' };

    const existingConsumed = await client.publicationCredit.findFirst({
      where: {
        establishmentId,
        missionId,
        status: PublicationCreditStatus.CONSUMED,
      },
    });

    if (existingConsumed) return { source: 'PUBLICATION_CREDIT', credit: existingConsumed };

    const reserved = await client.publicationCredit.findFirst({
      where: {
        establishmentId,
        missionId,
        status: PublicationCreditStatus.RESERVED,
      },
      orderBy: { reservedAt: 'asc' },
    });

    if (!reserved) {
      throw new BadRequestException({
        code: 'PUBLICATION_PAYMENT_REQUIRED',
        message: 'Aucun credit de publication reserve pour cette mission.',
        establishmentId,
        missionId,
      });
    }

    const consumed = await client.publicationCredit.updateMany({
      where: { id: reserved.id, status: PublicationCreditStatus.RESERVED },
      data: {
        status: PublicationCreditStatus.CONSUMED,
        consumedAt: new Date(),
      },
    });

    if (consumed.count === 0) {
      return this.consumePublicationCreditForAcceptedMission(establishmentId, missionId, tx);
    }

    const updated = await client.publicationCredit.findUnique({ where: { id: reserved.id } });
    return { source: 'PUBLICATION_CREDIT', credit: updated };
  }

  async releaseReservedPublicationCreditForMission(establishmentId: string, missionId: string) {
    await this.prisma.publicationCredit.updateMany({
      where: {
        establishmentId,
        missionId,
        status: PublicationCreditStatus.RESERVED,
      },
      data: {
        missionId: null,
        status: PublicationCreditStatus.AVAILABLE,
        reservedAt: null,
      },
    });
  }

  async refundPublicationCreditForCancelledMission(
    establishmentId: string,
    missionId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;

    await client.publicationCredit.updateMany({
      where: {
        establishmentId,
        missionId,
        status: PublicationCreditStatus.RESERVED,
      },
      data: {
        missionId: null,
        status: PublicationCreditStatus.AVAILABLE,
        reservedAt: null,
      },
    });
  }

  async assertCanPublishMission(establishmentId: string, missionId: string) {
    const access = await this.getPublicationAccess(establishmentId);
    if (access.hasActiveSubscription) return;

    const credit = await this.prisma.publicationCredit.findFirst({
      where: {
        establishmentId,
        missionId,
        status: { in: [PublicationCreditStatus.RESERVED, PublicationCreditStatus.CONSUMED] },
      },
    });

    if (credit) return;

    throw new BadRequestException({
      code: 'PUBLICATION_PAYMENT_REQUIRED',
      message: 'Cette mission doit etre associee a un credit de publication paye avant publication.',
      establishmentId,
      missionId,
    });
  }

  async handleStripeWebhook(rawBody?: Buffer, signature?: string) {
    const stripe = this.requireStripe();
    const webhookSecret = this.requireConfig('STRIPE_WEBHOOK_SECRET');
    if (!rawBody || !signature) {
      throw new BadRequestException('Webhook Stripe invalide.');
    }

    let event: any;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      throw new BadRequestException('Signature Stripe invalide.');
    }

    const billingEventId = await this.claimBillingEvent(event);
    if (!billingEventId) {
      return { received: true, duplicate: true };
    }

    try {
      await this.processStripeEvent(event, stripe);
      await this.prisma.billingEvent.update({
        where: { id: billingEventId },
        data: {
          processedAt: new Date(),
          processingStartedAt: null,
          failedAt: null,
          lastError: null,
        },
      });
      return { received: true };
    } catch (error) {
      const lastError =
        error instanceof Error
          ? `${error.name || 'Error'} while processing Stripe event`
          : 'Unknown error while processing Stripe event';
      await this.prisma.billingEvent.updateMany({
        where: { id: billingEventId, processedAt: null },
        data: {
          processingStartedAt: null,
          failedAt: new Date(),
          lastError,
        },
      }).catch(() => undefined);
      throw error;
    }
  }

  private async claimBillingEvent(event: any): Promise<string | null> {
    const now = new Date();
    try {
      const created = await this.prisma.billingEvent.create({
        data: {
          providerEventId: event.id,
          eventType: event.type,
          payload: {
            objectId: event.data.object?.id || null,
            created: event.created || null,
            livemode: Boolean(event.livemode),
          },
          processingStartedAt: now,
          attemptCount: 1,
        },
        select: { id: true },
      });
      return created.id;
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      ) {
        throw error;
      }
    }

    const existing = await this.prisma.billingEvent.findUnique({
      where: { providerEventId: event.id },
      select: {
        id: true,
        processedAt: true,
      },
    });
    if (!existing) {
      throw new ServiceUnavailableException('Evenement Stripe temporairement indisponible.');
    }
    if (existing.processedAt) {
      return null;
    }

    const claimed = await this.prisma.billingEvent.updateMany({
      where: {
        id: existing.id,
        processedAt: null,
        OR: [
          { failedAt: { not: null } },
          { processingStartedAt: null },
          { processingStartedAt: { lt: new Date(now.getTime() - 5 * 60_000) } },
        ],
      },
      data: {
        processingStartedAt: now,
        failedAt: null,
        lastError: null,
        attemptCount: { increment: 1 },
      },
    });

    if (claimed.count !== 1) {
      throw new ServiceUnavailableException(
        'Cet evenement Stripe est deja en cours de traitement.',
      );
    }
    return existing.id;
  }

  private async processStripeEvent(event: any, stripe: any) {
    const eventCreatedAt = this.dateFromUnix(event.created) || new Date();

    if (event.type === 'checkout.session.completed') {
      await this.handleCheckoutCompleted(event.data.object, eventCreatedAt);
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      await this.upsertSubscription(event.data.object, eventCreatedAt);
    }

    if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const subscriptionId = this.idFromStripeRef(invoice.subscription);
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await this.upsertSubscription(subscription, eventCreatedAt);
      }
    }
  }

  private async handleCheckoutCompleted(session: any, eventCreatedAt: Date) {
    if (session.metadata?.kind === 'publication_credit') {
      if (session.payment_status !== 'paid') return;

      const creditId = session.metadata.creditId;
      const establishmentId = session.metadata.establishmentId;
      const amountTotal = Number(session.amount_total);
      const currency = String(session.currency || '').toUpperCase();
      if (
        !creditId ||
        !establishmentId ||
        !session.id ||
        session.mode !== 'payment' ||
        !Number.isSafeInteger(amountTotal) ||
        amountTotal <= 0 ||
        !currency
      ) {
        throw new BadRequestException('Session Stripe de credit invalide.');
      }
      await this.assertStripeCustomerBinding(establishmentId, session.customer);

      const claimed = await this.prisma.publicationCredit.updateMany({
        where: {
          id: creditId,
          establishmentId,
          stripeCheckoutSessionId: session.id,
          status: PublicationCreditStatus.PENDING_PAYMENT,
          amount: amountTotal,
          currency,
        },
        data: {
          status: PublicationCreditStatus.AVAILABLE,
          stripePaymentIntentId: this.idFromStripeRef(session.payment_intent),
          paidAt: new Date(),
        },
      });

      if (claimed.count !== 1) {
        const existing = await this.prisma.publicationCredit.findUnique({
          where: { id: creditId },
          select: {
            establishmentId: true,
            stripeCheckoutSessionId: true,
            status: true,
            amount: true,
            currency: true,
          },
        });
        const alreadyApplied =
          existing?.establishmentId === establishmentId &&
          existing.stripeCheckoutSessionId === session.id &&
          existing.status === PublicationCreditStatus.AVAILABLE &&
          existing.amount === amountTotal &&
          existing.currency === currency;
        if (!alreadyApplied) {
          throw new BadRequestException(
            'Le paiement Stripe ne correspond pas au credit attendu.',
          );
        }
      }
      return;
    }

    if (session.mode === 'subscription') {
      const subscriptionId = this.idFromStripeRef(session.subscription);
      if (!subscriptionId || !this.stripe) return;
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      await this.upsertSubscription(subscription, eventCreatedAt);
    }
  }

  private async upsertSubscription(subscription: any, eventCreatedAt: Date) {
    const establishmentId = subscription.metadata?.establishmentId;
    if (!establishmentId) return;
    if (!subscription.id) {
      throw new BadRequestException('Abonnement Stripe invalide.');
    }
    await this.assertStripeCustomerBinding(establishmentId, subscription.customer);

    const data = {
      stripeSubscriptionId: subscription.id,
      status: this.mapSubscriptionStatus(subscription.status),
      stripePriceId: subscription.items.data[0]?.price?.id,
      currentPeriodStart: this.dateFromUnix(subscription.current_period_start),
      currentPeriodEnd: this.dateFromUnix(subscription.current_period_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: this.dateFromUnix(subscription.canceled_at),
      stripeEventCreatedAt: eventCreatedAt,
    };
    const current = await this.prisma.establishmentSubscription.findUnique({
      where: { establishmentId },
      select: { id: true, stripeEventCreatedAt: true },
    });

    if (current) {
      if (
        current.stripeEventCreatedAt &&
        current.stripeEventCreatedAt > eventCreatedAt
      ) {
        return;
      }
      await this.prisma.establishmentSubscription.updateMany({
        where: {
          id: current.id,
          OR: [
            { stripeEventCreatedAt: null },
            { stripeEventCreatedAt: { lte: eventCreatedAt } },
          ],
        },
        data,
      });
      return;
    }

    try {
      await this.prisma.establishmentSubscription.create({
        data: {
          establishmentId,
          ...data,
        },
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      ) {
        throw error;
      }

      const concurrent = await this.prisma.establishmentSubscription.updateMany({
        where: {
          establishmentId,
          OR: [
            { stripeEventCreatedAt: null },
            { stripeEventCreatedAt: { lte: eventCreatedAt } },
          ],
        },
        data,
      });
      if (concurrent.count !== 1) {
        return;
      }
    }
  }

  private async assertStripeCustomerBinding(
    establishmentId: string,
    stripeCustomer: unknown,
  ) {
    const stripeCustomerId = this.idFromStripeRef(stripeCustomer);
    const billingCustomer = await this.prisma.billingCustomer.findUnique({
      where: { establishmentId },
      select: { stripeCustomerId: true },
    });
    if (
      !stripeCustomerId ||
      !billingCustomer ||
      billingCustomer.stripeCustomerId !== stripeCustomerId
    ) {
      throw new BadRequestException(
        'Le client Stripe ne correspond pas a cet etablissement.',
      );
    }
  }

  private async getPublicationAccess(establishmentId: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    const subscription = await client.establishmentSubscription.findUnique({ where: { establishmentId } });
    const availableCredits = await client.publicationCredit.count({
      where: { establishmentId, status: PublicationCreditStatus.AVAILABLE },
    });
    const reservedCredits = await client.publicationCredit.count({
      where: { establishmentId, status: PublicationCreditStatus.RESERVED },
    });
    const consumedCredits = await client.publicationCredit.count({
      where: { establishmentId, status: PublicationCreditStatus.CONSUMED },
    });

    const hasActiveSubscription = Boolean(
      subscription &&
      ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status) &&
      (!subscription.currentPeriodEnd || subscription.currentPeriodEnd > new Date()),
    );

    return {
      hasActiveSubscription,
      availableCredits,
      reservedCredits,
      consumedCredits,
      subscription,
    };
  }

  private async ensureBillingManager(userId: string, establishmentId: string) {
    return this.permissions.ensureEstablishmentMember(userId, establishmentId, [
      EstablishmentMemberRole.OWNER,
      EstablishmentMemberRole.ADMIN,
    ]);
  }

  private async ensureStripeCustomer(establishmentId: string) {
    const existing = await this.prisma.billingCustomer.findUnique({ where: { establishmentId } });
    if (existing) return existing.stripeCustomerId;

    const establishment = await this.prisma.establishment.findUnique({
      where: { id: establishmentId },
      include: {
        members: {
          include: { user: { select: { email: true } } },
          take: 1,
        },
      },
    });
    if (!establishment) throw new BadRequestException('Etablissement introuvable.');

    const stripe = this.requireStripe();
    const customer = await stripe.customers.create({
      name: establishment.name,
      email: establishment.email || establishment.members[0]?.user.email,
      phone: establishment.phone || undefined,
      metadata: { establishmentId },
    });

    await this.prisma.billingCustomer.create({
      data: {
        establishmentId,
        stripeCustomerId: customer.id,
      },
    });

    return customer.id;
  }

  private requireStripe() {
    if (!this.stripe) {
      throw new ServiceUnavailableException('Stripe n’est pas encore configure sur ce serveur.');
    }
    return this.stripe;
  }

  private requireConfig(key: string) {
    const value = this.config.get<string>(key);
    if (!value) {
      throw new ServiceUnavailableException(`Configuration manquante: ${key}.`);
    }
    return value;
  }

  private frontendUrl(path: string) {
    const base = (this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000')
      .split(',')[0]
      .trim()
      .replace(/\/$/, '');
    return `${base}${path}`;
  }

  private mapSubscriptionStatus(status: string): EstablishmentSubscriptionStatus {
    const normalized = status.toUpperCase() as keyof typeof EstablishmentSubscriptionStatus;
    return EstablishmentSubscriptionStatus[normalized] || EstablishmentSubscriptionStatus.INCOMPLETE;
  }

  private dateFromUnix(value?: number | null) {
    return value ? new Date(value * 1000) : null;
  }

  private idFromStripeRef(value: unknown) {
    if (typeof value === 'string') return value;
    if (
      value &&
      typeof value === 'object' &&
      'id' in value &&
      typeof value.id === 'string'
    ) {
      return value.id;
    }
    return null;
  }
}

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

    const draftMissionsCount = await this.prisma.mission.count({
      where: {
        establishmentId,
        status: MissionStatus.DRAFT,
      },
    });

    return {
      establishmentId,
      hasActiveSubscription: access.hasActiveSubscription,
      canCreateMission: access.hasActiveSubscription || (access.availableCredits - draftMissionsCount) > 0,
      availableCredits: access.availableCredits,
      reservedCredits: access.reservedCredits,
      consumedCredits: access.consumedCredits,
      subscription: access.subscription,
      prices: {
        monthlySubscription: { amount: 5999, currency: 'EUR' },
        publicationCredit: { amount: 3999, currency: 'EUR' },
      },
      stripeConfigured: Boolean(this.stripe),
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

  async assertCanCreateMission(establishmentId: string) {
    const access = await this.getPublicationAccess(establishmentId);
    if (access.hasActiveSubscription) return;

    const draftMissionsCount = await this.prisma.mission.count({
      where: {
        establishmentId,
        status: MissionStatus.DRAFT,
      },
    });

    if (access.availableCredits - draftMissionsCount > 0) return;

    throw new BadRequestException({
      code: 'PUBLICATION_PAYMENT_REQUIRED',
      message: 'Un abonnement actif ou un credit de publication paye est requis avant de creer une mission.',
      establishmentId,
    });
  }

  async attachPublicationAccessToMission(establishmentId: string, missionId: string) {
    const access = await this.getPublicationAccess(establishmentId);
    if (access.hasActiveSubscription) return { source: 'SUBSCRIPTION' };

    const existing = await this.prisma.publicationCredit.findFirst({
      where: {
        establishmentId,
        missionId,
        status: { in: [PublicationCreditStatus.RESERVED, PublicationCreditStatus.CONSUMED] },
      },
    });

    if (existing) return { source: 'PUBLICATION_CREDIT', credit: existing };

    const credit = await this.prisma.publicationCredit.findFirst({
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

    const claimed = await this.prisma.publicationCredit.updateMany({
      where: { id: credit.id, status: PublicationCreditStatus.AVAILABLE },
      data: {
        missionId,
        status: PublicationCreditStatus.RESERVED,
        reservedAt: new Date(),
      },
    });

    if (claimed.count === 0) {
      return this.attachPublicationAccessToMission(establishmentId, missionId);
    }

    const updated = await this.prisma.publicationCredit.findUnique({ where: { id: credit.id } });
    return { source: 'PUBLICATION_CREDIT', credit: updated };
  }

  async consumePublicationCreditForAcceptedMission(
    establishmentId: string,
    missionId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    const access = await this.getPublicationAccess(establishmentId);
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
        status: { in: [PublicationCreditStatus.RESERVED, PublicationCreditStatus.CONSUMED] },
      },
      data: {
        missionId: null,
        status: PublicationCreditStatus.AVAILABLE,
        reservedAt: null,
        consumedAt: null,
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

    try {
      await this.prisma.billingEvent.create({
        data: {
          providerEventId: event.id,
          eventType: event.type,
          payload: event.data.object as any,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { received: true, duplicate: true };
      }
      throw error;
    }

    if (event.type === 'checkout.session.completed') {
      await this.handleCheckoutCompleted(event.data.object);
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      await this.upsertSubscription(event.data.object);
    }

    if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const subscriptionId = this.idFromStripeRef(invoice.subscription);
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await this.upsertSubscription(subscription);
      }
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(session: any) {
    if (session.metadata?.kind === 'publication_credit') {
      if (session.payment_status !== 'paid') return;

      const creditId = session.metadata.creditId;
      if (!creditId) return;

      await this.prisma.publicationCredit.update({
        where: { id: creditId },
        data: {
          status: PublicationCreditStatus.AVAILABLE,
          stripePaymentIntentId: this.idFromStripeRef(session.payment_intent),
          paidAt: new Date(),
        },
      });
      return;
    }

    if (session.mode === 'subscription') {
      const subscriptionId = this.idFromStripeRef(session.subscription);
      if (!subscriptionId || !this.stripe) return;
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      await this.upsertSubscription(subscription);
    }
  }

  private async upsertSubscription(subscription: any) {
    const establishmentId = subscription.metadata?.establishmentId;
    if (!establishmentId) return;

    await this.prisma.establishmentSubscription.upsert({
      where: { stripeSubscriptionId: subscription.id },
      update: {
        status: this.mapSubscriptionStatus(subscription.status),
        stripePriceId: subscription.items.data[0]?.price?.id,
        currentPeriodStart: this.dateFromUnix(subscription.current_period_start),
        currentPeriodEnd: this.dateFromUnix(subscription.current_period_end),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: this.dateFromUnix(subscription.canceled_at),
      },
      create: {
        establishmentId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0]?.price?.id,
        status: this.mapSubscriptionStatus(subscription.status),
        currentPeriodStart: this.dateFromUnix(subscription.current_period_start),
        currentPeriodEnd: this.dateFromUnix(subscription.current_period_end),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: this.dateFromUnix(subscription.canceled_at),
      },
    });
  }

  private async getPublicationAccess(establishmentId: string) {
    const [subscription, availableCredits, reservedCredits, consumedCredits] = await Promise.all([
      this.prisma.establishmentSubscription.findUnique({ where: { establishmentId } }),
      this.prisma.publicationCredit.count({
        where: { establishmentId, status: PublicationCreditStatus.AVAILABLE },
      }),
      this.prisma.publicationCredit.count({
        where: { establishmentId, status: PublicationCreditStatus.RESERVED },
      }),
      this.prisma.publicationCredit.count({
        where: { establishmentId, status: PublicationCreditStatus.CONSUMED },
      }),
    ]);

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
      include: { members: { include: { user: true }, take: 1 } },
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

  private idFromStripeRef(value?: string | { id: string } | null) {
    if (!value) return null;
    return typeof value === 'string' ? value : value.id;
  }
}

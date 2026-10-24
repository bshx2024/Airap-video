import { DodoPayments } from 'dodopayments';

import { resolvePeriodEnd } from './period';
import { PROVIDER_TIMEOUT_MS } from './timeout';
import {
  CheckoutSession,
  PaymentBilling,
  PaymentConfigs,
  PaymentEvent,
  PaymentEventType,
  PaymentInterval,
  PaymentOrder,
  PaymentProvider,
  PaymentSession,
  PaymentStatus,
  PlanChangeParams,
  PlanChangeResult,
  SubscriptionCycleType,
  SubscriptionInfo,
  SubscriptionStatus,
  WebhookIgnoredError,
} from './types';

/** Dodo 409 for an immediate change whose payment is still pending. */
export function isPendingPlanChangeConflict(error: unknown): boolean {
  const e = error as { status?: number; message?: string; error?: unknown };
  if (e?.status !== 409) return false;
  const text = `${e.message || ''} ${JSON.stringify(e.error ?? '')}`;
  return /pending\s*_?plan\s*_?change/i.test(text);
}

export interface DodoConfigs extends PaymentConfigs {
  apiKey: string;
  webhookKey?: string;
  /**
   * Required for correct host selection. Dodo keys are mode-scoped but the
   * key string itself does not encode test vs live — set explicitly.
   * Defaults to test_mode when omitted (safer than SDK's live_mode default).
   */
  environment?: 'test_mode' | 'live_mode';
}

/** Provider period dates drift; a renewal may start a little before. */
const RENEWAL_LOOKUP_SKEW_MS = 12 * 60 * 60 * 1000;

export class DodoProvider implements PaymentProvider {
  readonly name = 'dodo';
  configs: DodoConfigs;

  private client: DodoPayments;

  constructor(configs: DodoConfigs) {
    this.configs = configs;
    this.client = new DodoPayments({
      bearerToken: configs.apiKey,
      webhookKey: configs.webhookKey,
      // Pass baseURL: null so an ambient DODO_PAYMENTS_BASE_URL cannot fight
      // the explicit environment (SDK throws “Ambiguous URL” otherwise).
      baseURL: null,
      environment:
        configs.environment === 'live_mode' ? 'live_mode' : 'test_mode',
      // SDK default is 60s per attempt.
      timeout: PROVIDER_TIMEOUT_MS,
    });
  }

  async createPayment({
    order,
  }: {
    order: PaymentOrder;
  }): Promise<CheckoutSession> {
    if (!order.productId) throw new Error('productId is required');

    const customer = order.customer?.email
      ? {
          email: order.customer.email,
          name: order.customer.name || '',
        }
      : undefined;

    const metadata: Record<string, string> = {
      order_no: order.orderNo || '',
      orderNo: order.orderNo || '',
      ...(order.customer?.id ? { user_id: order.customer.id } : {}),
    };

    if (order.metadata) {
      for (const [k, v] of Object.entries(order.metadata)) {
        if (v !== undefined && v !== null) {
          metadata[k] = String(v);
        }
      }
    }

    // Lock checkout to the order currency and hide discount/currency pickers.
    // Orders are stored in catalog base currency (BASE_CURRENCY_PAYMENT_PROVIDERS);
    // adaptive FX or a customer promo would make verifyPaidAmount mark the
    // order abnormal (currency_mismatch / amount_short) after a successful charge.
    const billingCurrency = String(order.price?.currency || 'usd')
      .trim()
      .toUpperCase();

    let session;
    try {
      session = await this.client.checkoutSessions.create({
        product_cart: [
          {
            product_id: order.productId,
            quantity: 1,
          },
        ],
        customer,
        return_url: order.successUrl,
        cancel_url: order.cancelUrl,
        billing_currency: billingCurrency as any,
        feature_flags: {
          allow_currency_selection: false,
          allow_discount_code: false,
        },
        metadata,
      });
    } catch (error: any) {
      const raw = error?.message || String(error);
      if (/\b401\b|unauthorized/i.test(raw)) {
        const env =
          this.configs.environment === 'live_mode' ? 'live_mode' : 'test_mode';
        throw new Error(
          `Dodo Payments unauthorized (${env}). Set Admin → Dodo → Environment to the dashboard mode where this API key was created; this is not a site login error.`
        );
      }
      // e.g. "422 Product ultra_monthly does not exist" when mapping missing/wrong
      if (/\bProduct\s+\S+\s+does not exist\b/i.test(raw)) {
        throw new Error('Payment product mapping not configured');
      }
      throw error;
    }

    return {
      provider: this.name,
      checkoutParams: order,
      checkoutInfo: {
        sessionId: session.session_id,
        checkoutUrl: session.checkout_url || '',
      },
      checkoutResult: session,
      metadata: order.metadata || {},
    };
  }

  async getPaymentSession({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<PaymentSession> {
    try {
      if (sessionId.startsWith('cks_')) {
        const checkoutStatus =
          await this.client.checkoutSessions.retrieve(sessionId);
        // Prefer the payment object whenever Dodo already created one — covers
        // succeeded and failed attempts so handleCheckoutSuccess can update
        // the order (paymentResult.id must match order.paymentSessionId /
        // orderNo).
        if (checkoutStatus.payment_id) {
          return this.getPaymentSessionByPaymentId(
            checkoutStatus.payment_id,
            sessionId
          );
        }

        const paymentStatus =
          checkoutStatus.payment_status === 'succeeded'
            ? PaymentStatus.SUCCESS
            : checkoutStatus.payment_status === 'failed'
              ? PaymentStatus.FAILED
              : checkoutStatus.payment_status === 'cancelled'
                ? PaymentStatus.CANCELED
                : PaymentStatus.PROCESSING;

        return {
          provider: this.name,
          paymentStatus,
          paymentResult: {
            ...checkoutStatus,
            id: sessionId,
          },
        };
      }

      if (sessionId.startsWith('pay_')) {
        return this.getPaymentSessionByPaymentId(sessionId, sessionId);
      }

      return {
        provider: this.name,
        paymentStatus: PaymentStatus.PROCESSING,
      };
    } catch (error: any) {
      console.error('[Dodo] getPaymentSession failed:', error);
      return {
        provider: this.name,
        paymentStatus: PaymentStatus.PROCESSING,
      };
    }
  }

  private async getPaymentSessionByPaymentId(
    paymentId: string,
    originalSessionId: string
  ): Promise<PaymentSession> {
    const payment = await this.client.payments.retrieve(paymentId);

    const paymentStatus =
      payment.status === 'succeeded'
        ? PaymentStatus.SUCCESS
        : payment.status === 'failed'
          ? PaymentStatus.FAILED
          : payment.status === 'cancelled'
            ? PaymentStatus.CANCELED
            : PaymentStatus.PROCESSING;

    const session: PaymentSession = {
      provider: this.name,
      paymentStatus,
      paymentInfo: {
        transactionId: payment.payment_id,
        paymentAmount: payment.total_amount,
        paymentCurrency: payment.currency.toLowerCase(),
        paymentEmail: payment.customer?.email,
        paymentUserName: payment.customer?.name,
        paidAt: payment.created_at ? new Date(payment.created_at) : undefined,
        invoiceId: payment.invoice_id || undefined,
        invoiceUrl: payment.invoice_url || undefined,
      },
      paymentResult: {
        ...payment,
        id: payment.metadata?.order_no || originalSessionId,
        orderNo: payment.metadata?.order_no,
      },
      metadata: payment.metadata || {},
    };

    if (payment.subscription_id) {
      try {
        const sub = await this.client.subscriptions.retrieve(
          payment.subscription_id
        );
        session.subscriptionId = payment.subscription_id;
        session.subscriptionInfo = this.buildSubscriptionInfo(sub);
        session.subscriptionResult = sub;
      } catch (subErr) {
        console.error('[Dodo] failed to retrieve subscription:', subErr);
      }
    }

    return session;
  }

  async getPaymentEvent({ req }: { req: Request }): Promise<PaymentEvent> {
    const payload = await req.text();
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    if (
      !headers['webhook-signature'] ||
      !headers['webhook-id'] ||
      !headers['webhook-timestamp']
    ) {
      throw new Error(
        'Invalid webhook request: missing standard webhook headers'
      );
    }

    const event = this.client.webhooks.unwrap(payload, {
      headers,
      key: this.configs.webhookKey,
    });

    switch (event.type) {
      case 'payment.succeeded': {
        const payment = event.data;
        const orderNo =
          payment.metadata?.order_no ||
          payment.metadata?.orderNo ||
          payment.checkout_session_id;

        const isRenewal = (payment.retry_attempt ?? 0) > 0;
        const session: PaymentSession = {
          provider: this.name,
          paymentStatus: PaymentStatus.SUCCESS,
          paymentInfo: {
            transactionId: payment.payment_id,
            paymentAmount: payment.total_amount,
            paymentCurrency: payment.currency.toLowerCase(),
            paymentEmail: payment.customer?.email,
            paymentUserName: payment.customer?.name,
            paidAt: payment.created_at
              ? new Date(payment.created_at)
              : new Date(),
            invoiceId: payment.invoice_id || undefined,
            invoiceUrl: payment.invoice_url || undefined,
            subscriptionCycleType: payment.subscription_id
              ? isRenewal
                ? SubscriptionCycleType.RENEWAL
                : SubscriptionCycleType.CREATE
              : undefined,
          },
          paymentResult: {
            ...payment,
            id: orderNo || payment.payment_id,
            orderNo: payment.metadata?.order_no || payment.metadata?.orderNo,
          },
          metadata: payment.metadata || {},
        };

        if (payment.subscription_id) {
          session.subscriptionId = payment.subscription_id;
          try {
            const sub = await this.client.subscriptions.retrieve(
              payment.subscription_id
            );
            session.subscriptionInfo = this.buildSubscriptionInfo(sub);
            session.subscriptionResult = sub;
          } catch (err) {
            console.error('[Dodo] Webhook retrieve subscription error:', err);
          }
        }

        return {
          eventType: PaymentEventType.PAYMENT_SUCCESS,
          eventResult: event,
          paymentSession: session,
        };
      }

      case 'payment.failed': {
        const payment = event.data;
        const orderNo =
          payment.metadata?.order_no ||
          payment.metadata?.orderNo ||
          payment.checkout_session_id;

        const session: PaymentSession = {
          provider: this.name,
          paymentStatus: PaymentStatus.FAILED,
          paymentInfo: {
            transactionId: payment.payment_id,
            paymentAmount: payment.total_amount,
            paymentCurrency: payment.currency.toLowerCase(),
          },
          paymentResult: {
            ...payment,
            id: orderNo || payment.payment_id,
          },
          metadata: payment.metadata || {},
        };
        if (payment.subscription_id) {
          session.subscriptionId = payment.subscription_id;
          try {
            const sub = await this.client.subscriptions.retrieve(
              payment.subscription_id
            );
            session.subscriptionInfo = this.buildSubscriptionInfo(sub);
            session.subscriptionResult = sub;
          } catch (err) {
            console.error('[Dodo] Webhook retrieve subscription error:', err);
          }
        }

        return {
          eventType: PaymentEventType.PAYMENT_FAILED,
          eventResult: event,
          paymentSession: session,
        };
      }

      case 'subscription.active':
      case 'subscription.updated':
      case 'subscription.plan_changed':
      case 'subscription.on_hold':
      case 'subscription.past_due': {
        const sub = event.data as any;
        const orderNo = sub.metadata?.order_no || sub.metadata?.orderNo;
        const session: PaymentSession = {
          provider: this.name,
          paymentStatus:
            event.type === 'subscription.past_due' ||
            event.type === 'subscription.on_hold'
              ? PaymentStatus.FAILED
              : PaymentStatus.SUCCESS,
          subscriptionId: sub.subscription_id,
          subscriptionInfo: this.buildSubscriptionInfo(sub),
          subscriptionResult: sub,
          paymentResult: {
            ...sub,
            id: orderNo || sub.subscription_id,
            orderNo,
          },
          metadata: sub.metadata || {},
        };

        return {
          eventType: PaymentEventType.SUBSCRIBE_UPDATED,
          eventResult: event,
          paymentSession: session,
        };
      }

      case 'subscription.cancelled':
      case 'subscription.expired': {
        const sub = event.data as any;
        const orderNo = sub.metadata?.order_no || sub.metadata?.orderNo;
        const session: PaymentSession = {
          provider: this.name,
          paymentStatus: PaymentStatus.CANCELED,
          subscriptionId: sub.subscription_id,
          subscriptionInfo: this.buildSubscriptionInfo(sub),
          subscriptionResult: sub,
          paymentResult: {
            ...sub,
            id: orderNo || sub.subscription_id,
            orderNo,
          },
          metadata: sub.metadata || {},
        };

        return {
          eventType: PaymentEventType.SUBSCRIBE_CANCELED,
          eventResult: event,
          paymentSession: session,
        };
      }

      case 'subscription.renewed': {
        return {
          eventType: PaymentEventType.PAYMENT_SUCCESS,
          eventResult: event,
          paymentSession: this.buildRenewedSession(event.data as any),
        };
      }

      case 'refund.succeeded': {
        const refund = event.data as any;
        return {
          eventType: PaymentEventType.PAYMENT_REFUNDED,
          eventResult: event,
          paymentSession: {
            provider: this.name,
            paymentStatus: PaymentStatus.SUCCESS,
            paymentInfo: {
              transactionId: refund.payment_id,
              paymentAmount: refund.amount,
              paymentCurrency: String(refund.currency || 'usd').toLowerCase(),
            },
            paymentResult: refund,
          },
        };
      }

      default:
        throw new WebhookIgnoredError(
          `No handler for Dodo event: ${event.type}`
        );
    }
  }

  /**
   * Dodo has no immediate cancel via update; both paths cancel at the next
   * billing date (customer keeps the plan until then).
   */
  async cancelSubscription({
    subscriptionId,
  }: {
    subscriptionId: string;
    immediate?: boolean;
  }): Promise<PaymentSession> {
    const sub = await this.client.subscriptions.update(subscriptionId, {
      cancel_at_next_billing_date: true,
    });

    return {
      provider: this.name,
      subscriptionId,
      subscriptionInfo: this.buildSubscriptionInfo(sub),
      subscriptionResult: sub,
    };
  }

  /**
   * Undo cancelSubscription: PATCH cancel_at_next_billing_date=false, the
   * subscription renews on its next billing date again.
   * @docs https://docs.dodopayments.com/api-reference/subscriptions/patch-subscriptions
   */
  async resumeSubscription({
    subscriptionId,
  }: {
    subscriptionId: string;
  }): Promise<PaymentSession> {
    const sub = await this.client.subscriptions.update(subscriptionId, {
      cancel_at_next_billing_date: false,
    });
    if (sub?.cancel_at_next_billing_date) {
      throw new Error('Resume subscription failed');
    }
    return {
      provider: this.name,
      subscriptionId,
      subscriptionInfo: this.buildSubscriptionInfo(sub),
      subscriptionResult: sub,
    };
  }

  /** GET /subscriptions/{id}: reconcile a plan change whose webhook is late. */
  /** Renewal session as `subscription.renewed` reports it. */
  private buildRenewedSession(sub: any): PaymentSession {
    const orderNo = sub.metadata?.order_no || sub.metadata?.orderNo;
    return {
      provider: this.name,
      paymentStatus: PaymentStatus.SUCCESS,
      subscriptionId: sub.subscription_id,
      subscriptionInfo: this.buildSubscriptionInfo(sub),
      subscriptionResult: sub,
      paymentInfo: {
        paymentAmount: sub.recurring_pre_tax_amount,
        paymentCurrency: String(sub.currency || 'usd').toLowerCase(),
        subscriptionCycleType: SubscriptionCycleType.RENEWAL,
      },
      paymentResult: {
        ...sub,
        id: orderNo || sub.subscription_id,
        orderNo,
      },
      metadata: sub.metadata || {},
    };
  }

  /**
   * A renewal whose webhook may be lost: the subscription is active, its
   * current period starts at/after `after`, and a succeeded payment exists
   * for that period. Returns the same session as `subscription.renewed`
   * (Dodo renewals are keyed by subscription + period start, so a late
   * webhook claims the same renewal); null while not renewed.
   */
  async getRenewalSession({
    subscriptionId,
    after,
  }: {
    subscriptionId: string;
    after: Date;
  }): Promise<PaymentSession | null> {
    const sub: any = await this.client.subscriptions.retrieve(subscriptionId);
    if (sub.status !== 'active') return null;
    const session = this.buildRenewedSession(sub);
    const start = session.subscriptionInfo?.currentPeriodStart;
    if (!start || start.getTime() < after.getTime() - RENEWAL_LOOKUP_SKEW_MS) {
      return null;
    }
    const page = await this.client.payments.list({
      subscription_id: subscriptionId,
      status: 'succeeded',
      created_at_gte: new Date(
        start.getTime() - RENEWAL_LOOKUP_SKEW_MS
      ).toISOString(),
      page_size: 10,
    });
    const payment = [...(page.items || [])].sort((a, b) => {
      const at = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bt - at;
    })[0];
    if (!payment) return null;
    session.paymentInfo = {
      ...session.paymentInfo,
      transactionId: payment.payment_id,
      paymentAmount: payment.total_amount,
      paymentCurrency: String(payment.currency || '').toLowerCase(),
      paidAt: payment.created_at ? new Date(payment.created_at) : new Date(),
    };
    return session;
  }

  async getSubscription({
    subscriptionId,
  }: {
    subscriptionId: string;
  }): Promise<PaymentSession> {
    const sub = await this.client.subscriptions.retrieve(subscriptionId);
    return {
      provider: this.name,
      subscriptionId,
      subscriptionInfo: this.buildSubscriptionInfo(sub),
      subscriptionResult: sub,
    };
  }

  /**
   * immediate  → prorated_immediately: credit the unused part of the current
   *              period, charge a full period of the new plan, billing cycle
   *              restarts today (so the new plan's full credits are granted).
   *              Keep the old plan if that payment fails
   *              (on_payment_failure: prevent_change).
   * period_end → effective_at: next_billing_date, nothing billed now; the
   *              booking shows up as `scheduled_change` and can be undone.
   *              Dodo only accepts proration_billing_mode `full_immediately`
   *              with next_billing_date (422 otherwise); the new plan's full
   *              price is charged on the next billing date, as a renewal.
   * @docs https://docs.dodopayments.com/developer-resources/subscription-upgrade-downgrade
   */
  async changeSubscriptionPlan(
    params: PlanChangeParams
  ): Promise<PlanChangeResult> {
    const { subscriptionId, productId, timing } = params;
    const immediate = timing === 'immediate';
    let raw: unknown;
    try {
      raw = await this.client.subscriptions.changePlan(subscriptionId, {
        product_id: productId,
        quantity: 1,
        proration_billing_mode: immediate
          ? 'prorated_immediately'
          : 'full_immediately',
        effective_at: immediate ? 'immediately' : 'next_billing_date',
        // A leftover schedule at Dodo (e.g. booked outside this app or not
        // mirrored locally) would otherwise 409 PendingPlanChangeExists.
        cancel_scheduled_change_plan: true,
        ...(immediate ? { on_payment_failure: 'prevent_change' as const } : {}),
      });
    } catch (error) {
      if (!immediate || !isPendingPlanChangeConflict(error)) throw error;
      return this.resolvePendingPlanChange(subscriptionId, productId, error);
    }
    const sub: any = await this.client.subscriptions.retrieve(subscriptionId);
    const info = this.buildSubscriptionInfo(sub);
    if (immediate) {
      return {
        status: sub.product_id === productId ? 'applied' : 'processing',
        subscriptionInfo: info,
        raw,
      };
    }
    return {
      status: 'scheduled',
      effectiveAt:
        info.scheduledChange?.effectiveAt || info.currentPeriodEnd || undefined,
      subscriptionInfo: info,
      raw,
    };
  }

  /**
   * 409 PendingPlanChangeExists: an earlier immediate change still waits for
   * its payment (prevent_change, e.g. our booking was cleared or never
   * written). The subscription carries no field for it, so:
   * product already switched → applied; the newest payment of the last day
   * failed or was cancelled → failed (Dodo releases the change shortly);
   * anything else → processing (the payment webhook applies it).
   */
  private async resolvePendingPlanChange(
    subscriptionId: string,
    productId: string,
    raw: unknown
  ): Promise<PlanChangeResult> {
    const sub: any = await this.client.subscriptions.retrieve(subscriptionId);
    const subscriptionInfo = this.buildSubscriptionInfo(sub);
    if (sub.product_id === productId) {
      return { status: 'applied', subscriptionInfo, raw };
    }
    let latest: any = null;
    let open = false;
    try {
      const page = await this.client.payments.list({
        subscription_id: subscriptionId,
        created_at_gte: new Date(Date.now() - 86400_000).toISOString(),
        page_size: 10,
      });
      for (const p of page.items || []) {
        if (!latest || Date.parse(p.created_at) > Date.parse(latest.created_at))
          latest = p;
        // A newer failed renewal must not hide an older payment that is still
        // open: the next attempt sends cancel_scheduled_change_plan and would
        // charge again while that payment can still capture.
        const status = p?.status;
        if (
          status !== 'failed' &&
          status !== 'cancelled' &&
          status !== 'succeeded'
        ) {
          open = true;
        }
      }
    } catch (error) {
      // Unknown → treat as still processing (blocks a double charge).
      console.error('[dodo] pending plan change payment lookup failed', error);
    }
    const failed =
      !open && (latest?.status === 'failed' || latest?.status === 'cancelled');
    return { status: failed ? 'failed' : 'processing', subscriptionInfo, raw };
  }

  async cancelScheduledPlanChange({
    subscriptionId,
  }: {
    subscriptionId: string;
    scheduleId?: string | null;
  }): Promise<void> {
    await this.client.subscriptions.cancelChangePlan(subscriptionId);
  }

  async getPaymentBilling({
    customerId,
    returnUrl,
  }: {
    customerId: string;
    returnUrl?: string;
  }): Promise<PaymentBilling> {
    const portal = await this.client.customers.customerPortal.create(
      customerId,
      {
        return_url: returnUrl || undefined,
      }
    );

    return {
      billingUrl: portal.link,
    };
  }

  private buildSubscriptionInfo(sub: any): SubscriptionInfo {
    let interval: PaymentInterval | undefined;
    const intervalStr = String(
      sub.payment_frequency_interval || sub.subscription_period_interval || ''
    ).toLowerCase();
    if (intervalStr === 'month') interval = PaymentInterval.MONTH;
    else if (intervalStr === 'year') interval = PaymentInterval.YEAR;
    else if (intervalStr === 'day') interval = PaymentInterval.DAY;
    else if (intervalStr === 'week') interval = PaymentInterval.WEEK;

    let status = SubscriptionStatus.ACTIVE;
    if (sub.status === 'cancelled') status = SubscriptionStatus.CANCELED;
    else if (sub.status === 'on_hold') status = SubscriptionStatus.PAUSED;
    else if (sub.status === 'past_due')
      status = SubscriptionStatus.PENDING_CANCEL;
    else if (sub.status === 'expired') status = SubscriptionStatus.EXPIRED;
    // Mandate / first charge failed: Dodo will never bill it.
    else if (sub.status === 'failed') status = SubscriptionStatus.EXPIRED;
    else if (sub.cancel_at_next_billing_date)
      status = SubscriptionStatus.PENDING_CANCEL;

    const intervalCount =
      sub.payment_frequency_count || sub.subscription_period_count || 1;
    const start = sub.previous_billing_date
      ? new Date(sub.previous_billing_date)
      : new Date(sub.created_at || Date.now());
    const end = resolvePeriodEnd({
      end: sub.next_billing_date ? new Date(sub.next_billing_date) : null,
      start,
      interval,
      intervalCount,
    });
    return {
      subscriptionId: sub.subscription_id,
      productId: sub.product_id,
      amount: sub.recurring_pre_tax_amount,
      currency: String(sub.currency || 'usd').toLowerCase(),
      interval,
      intervalCount,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      status,
      canceledAt: sub.cancel_at_next_billing_date ? new Date() : undefined,
      canceledEndAt: sub.cancel_at_next_billing_date ? end : undefined,
      scheduledChange:
        sub.scheduled_change === undefined
          ? undefined
          : sub.scheduled_change
            ? {
                productId: sub.scheduled_change.product_id,
                effectiveAt: sub.scheduled_change.effective_at
                  ? new Date(sub.scheduled_change.effective_at)
                  : undefined,
              }
            : null,
    };
  }
}

import {
  TaxCategory,
  verifyWebhook,
  WaffoPancake,
  WaffoPancakeError,
  WebhookEventType,
  type CashierLanguage,
  type WebhookEventData,
} from '@waffo/pancake-ts';

import { resolvePeriodEnd } from './period';
import { fetchWithTimeout } from './timeout';
import {
  CheckoutSession,
  PaymentConfigs,
  PaymentEvent,
  PaymentEventType,
  PaymentInterval,
  PaymentOrder,
  PaymentProvider,
  PaymentSession,
  PaymentStatus,
  PaymentType,
  PlanChangeParams,
  PlanChangeResult,
  PlanChangeStatusResult,
  ProviderPlanChange,
  SubscriptionCycleType,
  SubscriptionInfo,
  SubscriptionStatus,
  WebhookIgnoredError,
} from './types';

const WAFFO_LANGUAGES: Record<string, CashierLanguage> = {
  en: 'en',
  zh: 'zh-Hans',
};

const SUBSCRIPTION_RENEWED_EVENT = 'subscription.renewed';

/**
 * Plan-change events (not in SDK 0.16.1's WebhookEventType enum).
 * @docs https://docs.waffo.ai/api-reference/webhooks
 */
/**
 * Waffo hosts a magic-link consumer portal (payment method / invoices);
 * resume is in-app via issueSessionToken + reactivateSubscription.
 * There is no per-customer portal session (tinyship createWaffoCustomerPortal).
 */
export const WAFFO_CONSUMER_PORTAL_URL =
  'https://pancake.waffo.ai/consumer/portal/login';

export const WAFFO_PLAN_CHANGE_EVENTS = {
  scheduled: 'subscription.plan_change_scheduled',
  changed: 'subscription.plan_changed',
  failed: 'subscription.plan_change_failed',
} as const;

const CONFIRMED_PAYMENT_STATUSES = new Set([
  'succeeded',
  'authorized',
  'paid',
  'completed',
]);

export interface WaffoConfigs extends PaymentConfigs {
  merchantId: string;
  privateKey: string;
  /** 'test' appends ?test=true to plan-change confirmation links. */
  environment?: 'test' | 'prod';
}

const ISSUE_SESSION_TOKEN_PATH = '/v1/actions/auth/issue-session-token';

/**
 * SDK 0.18 derives a deterministic X-Idempotency-Key for a bare
 * auth.issueSessionToken() call (sha256(merchant + path + body), no window).
 * Waffo's gateway caches that key 24h and replays the FIRST token, which
 * expires after 15 min, so a second resume for the same buyer would get
 * 401 "Authentication failed". Minting a token has no side effect, so drop
 * the key for that path only (what SDK >= 0.23 does by default).
 * @docs https://docs.waffo.ai/api-reference/endpoints/auth/issue-session-token
 */
const freshSessionTokenFetch: typeof fetch = (input, init) => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  if (!url.endsWith(ISSUE_SESSION_TOKEN_PATH) || !init?.headers) {
    return globalThis.fetch(input, init);
  }
  const headers = new Headers(init.headers);
  headers.delete('X-Idempotency-Key');
  return globalThis.fetch(input, { ...init, headers });
};

/** Waffo 400s that mean "this order can never be reactivated". */
const WAFFO_NOT_REACTIVATABLE = [
  'Only canceling subscriptions can be reactivated',
  'Subscription with an unpaid balance cannot be reactivated',
  'Subscription with a confirmed plan change cannot be reactivated',
];

/**
 * A Waffo API failure with the gateway's status and errors[] kept in the
 * message, so logs show the real cause (WaffoPancakeError's stack alone
 * printed only "at unwrapAction ..."). Never carries the session token.
 */
export class WaffoApiError extends Error {
  readonly status?: number;
  readonly errors?: unknown;
  /** The order is not reactivatable (not canceling / unpaid / plan change). */
  readonly notReactivatable: boolean;

  constructor(action: string, cause: unknown) {
    const status =
      cause instanceof WaffoPancakeError ? cause.status : undefined;
    const errors =
      cause instanceof WaffoPancakeError ? cause.errors : undefined;
    const detail =
      errors !== undefined
        ? JSON.stringify(errors)
        : cause instanceof Error
          ? cause.message
          : String(cause);
    super(`Waffo ${action} failed (${status ?? 'n/a'}): ${detail}`);
    this.name = 'WaffoApiError';
    this.status = status;
    this.errors = errors;
    const first =
      cause instanceof WaffoPancakeError ? cause.errors[0]?.message || '' : '';
    this.notReactivatable =
      status === 400 && WAFFO_NOT_REACTIVATABLE.some((m) => first.includes(m));
  }
}

function isWaffoOrderNotFound(error: unknown): boolean {
  return (
    error instanceof WaffoPancakeError &&
    error.status === 404 &&
    /order not found/i.test(error.errors[0]?.message || '')
  );
}

type WaffoPaymentRow = {
  id: string;
  status: string;
  orderId: string;
  orderMerchantExternalId?: string;
  createdAt?: string;
  snapshotAmountDetails?: { currency?: string; total?: string };
  subscriptionOrder?: {
    id: string;
    status?: string;
    billingPeriod?: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    canceledAt?: string;
    subscriptionProduct?: { id: string; name?: string };
    priceSnapshot?: {
      currency?: string;
      regularPhase?: { total?: string };
    };
  } | null;
};

const PAYMENTS_BY_REF_QUERY = `query ($ref: String!) {
  payments(filter: { orderMerchantExternalId: { eq: $ref } }) {
    id status orderId orderMerchantExternalId createdAt
    snapshotAmountDetails { currency total }
    subscriptionOrder {
      id status billingPeriod currentPeriodStart currentPeriodEnd canceledAt
      subscriptionProduct { id name }
      priceSnapshot { currency regularPhase { total } }
    }
  }
}`;

/** Lookback before the ended period for the renewal charge (clock skew). */
const RENEWAL_LOOKUP_SKEW_MS = 12 * 60 * 60 * 1000;

export class WaffoProvider implements PaymentProvider {
  readonly name = 'waffo';
  configs: WaffoConfigs;

  private client: WaffoPancake;

  constructor(configs: WaffoConfigs) {
    this.configs = configs;
    this.client = new WaffoPancake({
      merchantId: configs.merchantId,
      privateKey: configs.privateKey,
      // Customer-session calls (reactivate) must send X-Environment; the SDK
      // takes it from here. Unset → resumeSubscription tries prod then test.
      ...(configs.environment ? { environment: configs.environment } : {}),
      // Plan-change confirm links wait on Waffo; fail clearly instead of hanging.
      fetch: fetchWithTimeout('Waffo', 15_000, freshSessionTokenFetch),
    });
  }

  async createPayment({
    order,
  }: {
    order: PaymentOrder;
  }): Promise<CheckoutSession> {
    if (!order.productId) throw new Error('productId is required');
    if (!order.price) throw new Error('price is required');
    if (!order.customer?.id) throw new Error('customer.id is required');

    const language = this.mapLocaleToWaffoLanguage(order.locale);
    const currency = order.price.currency.toUpperCase();
    // One-time: charge exactly order.price in order currency (e.g. CNY for zh
    // packs) instead of the dashboard price, so order.amount/currency equals
    // the paid amount. The Waffo product must have this currency enabled.
    // Subscriptions keep the recurring price configured in Waffo.
    const priceSnapshot =
      order.type === PaymentType.SUBSCRIPTION
        ? undefined
        : this.buildPriceSnapshot(order.price.amount, currency);
    const result = await this.client.checkout.authenticated.create({
      productId: order.productId,
      currency,
      ...(priceSnapshot ? { priceSnapshot } : {}),
      buyerIdentity: order.customer.id,
      buyerEmail: order.customer.email,
      successUrl: order.successUrl,
      metadata: order.metadata,
      orderMerchantExternalId: order.orderNo,
      withTrial: order.plan?.trialPeriodDays
        ? order.plan.trialPeriodDays > 0
        : undefined,
      ...(language ? { language } : {}),
    });

    return {
      provider: this.name,
      checkoutParams: order,
      checkoutInfo: {
        sessionId: result.sessionId,
        checkoutUrl: result.checkoutUrl,
      },
      checkoutResult: result,
      metadata: order.metadata || {},
    };
  }

  async getPaymentSession({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<PaymentSession> {
    const result = await this.client.graphql.query<{
      payments: WaffoPaymentRow[];
    }>({
      query: PAYMENTS_BY_REF_QUERY,
      variables: { ref: sessionId },
    });
    if (result.errors?.length) {
      throw new Error(result.errors.map((error) => error.message).join(', '));
    }

    const payment = result.data?.payments.find(
      (item) => item.orderMerchantExternalId === sessionId
    );
    if (!payment) {
      return { provider: this.name, paymentStatus: PaymentStatus.PROCESSING };
    }
    return this.sessionFromPayment(payment, sessionId);
  }

  /**
   * A renewal whose `subscription.payment_succeeded` webhook may be lost:
   * the newest succeeded payment of this subscription order created since
   * `after`, while the order is on that new period. Payments inherit the
   * checkout's orderMerchantExternalId (`orderRef`, our order no), so they
   * are listed by it and matched on orderId. Transaction id = Waffo payment
   * id, the same one the webhook carries, so a late webhook is the same
   * renewal. Null while Waffo has not charged the new period.
   */
  async getRenewalSession({
    subscriptionId,
    after,
    orderRef,
  }: {
    subscriptionId: string;
    after: Date;
    orderRef?: string;
  }): Promise<PaymentSession | null> {
    if (!orderRef) return null;
    const result = await this.client.graphql.query<{
      payments: WaffoPaymentRow[];
    }>({ query: PAYMENTS_BY_REF_QUERY, variables: { ref: orderRef } });
    if (result.errors?.length) {
      throw new Error(result.errors.map((error) => error.message).join(', '));
    }
    const since = after.getTime() - RENEWAL_LOOKUP_SKEW_MS;
    const payment = (result.data?.payments || [])
      .filter(
        (p) =>
          p.orderId === subscriptionId &&
          p.status === 'succeeded' &&
          (this.date(p.createdAt)?.getTime() ?? 0) >= since
      )
      .sort(
        (a, b) =>
          (this.date(b.createdAt)?.getTime() ?? 0) -
          (this.date(a.createdAt)?.getTime() ?? 0)
      )[0];
    const periodStart = this.date(
      payment?.subscriptionOrder?.currentPeriodStart
    );
    if (!payment || !periodStart || periodStart.getTime() < since) {
      return null;
    }
    const session = this.sessionFromPayment(payment, orderRef);
    if (session.paymentInfo) {
      session.paymentInfo.subscriptionCycleType = SubscriptionCycleType.RENEWAL;
    }
    return session;
  }

  private sessionFromPayment(
    payment: WaffoPaymentRow,
    sessionId: string
  ): PaymentSession {
    const amount = payment.snapshotAmountDetails;
    const paymentCurrency = amount?.currency || '';
    // undefined = not reported yet; a reported "0"/"0.00" (100% discount)
    // is a real amount and goes through verifyPaidAmount.
    const paymentAmount = this.optionalAmount(amount?.total, paymentCurrency);
    // Callback polling can see succeeded before amount fields are populated.
    let paymentStatus =
      payment.status === 'succeeded'
        ? PaymentStatus.SUCCESS
        : payment.status === 'failed'
          ? PaymentStatus.FAILED
          : payment.status === 'canceled'
            ? PaymentStatus.CANCELED
            : PaymentStatus.PROCESSING;
    if (
      paymentStatus === PaymentStatus.SUCCESS &&
      (!paymentCurrency || paymentAmount === undefined || paymentAmount < 0)
    ) {
      console.log(
        `Waffo payment ${payment.id} succeeded without amount details, keep processing`
      );
      paymentStatus = PaymentStatus.PROCESSING;
    }

    const session: PaymentSession = {
      provider: this.name,
      paymentStatus,
      paymentInfo: {
        transactionId: payment.id,
        paymentAmount,
        paymentCurrency,
        paidAt: this.date(payment.createdAt) || undefined,
        invoiceId: payment.id,
      },
      paymentResult: { ...payment, id: sessionId, orderNo: sessionId },
    };

    const subscription = payment.subscriptionOrder;
    if (subscription) {
      session.subscriptionId = subscription.id;
      session.subscriptionInfo = this.orderInfo(subscription, amount);
      session.subscriptionResult = subscription;
    }

    return session;
  }

  /**
   * Current subscription order (status, period, product) — lets billing see
   * an order Waffo ended when its `subscription.canceled` webhook was lost.
   */
  async getSubscription({
    subscriptionId,
  }: {
    subscriptionId: string;
  }): Promise<PaymentSession> {
    const result = await this.client.graphql.query<{
      subscriptionOrder?: WaffoPaymentRow['subscriptionOrder'];
    }>({
      query: `query ($id: String!) {
        subscriptionOrder(id: $id) {
          id status billingPeriod currentPeriodStart currentPeriodEnd canceledAt
          subscriptionProduct { id name }
          priceSnapshot { currency regularPhase { total } }
        }
      }`,
      variables: { id: subscriptionId },
    });
    if (result.errors?.length) {
      throw new Error(result.errors.map((error) => error.message).join(', '));
    }
    const subscription = result.data?.subscriptionOrder;
    if (!subscription) {
      throw new Error(`Waffo subscription order not found: ${subscriptionId}`);
    }
    return {
      provider: this.name,
      subscriptionId: subscription.id,
      subscriptionInfo: this.orderInfo(subscription),
      subscriptionResult: subscription,
    };
  }

  private orderInfo(
    subscription: NonNullable<WaffoPaymentRow['subscriptionOrder']>,
    amount?: WaffoPaymentRow['snapshotAmountDetails']
  ): SubscriptionInfo {
    const currency =
      subscription.priceSnapshot?.currency || amount?.currency || '';
    return {
      subscriptionId: subscription.id,
      productId: subscription.subscriptionProduct?.id,
      description: subscription.subscriptionProduct?.name,
      amount: this.amount(
        subscription.priceSnapshot?.regularPhase?.total || amount?.total,
        currency
      ),
      currency,
      interval: this.interval(subscription.billingPeriod),
      intervalCount: 1,
      currentPeriodStart:
        this.date(subscription.currentPeriodStart) || new Date(),
      currentPeriodEnd: resolvePeriodEnd({
        end: this.date(subscription.currentPeriodEnd),
        start: this.date(subscription.currentPeriodStart),
        interval: this.interval(subscription.billingPeriod),
      }),
      status: this.subscriptionStatus(subscription.status),
      canceledAt: this.date(subscription.canceledAt) || undefined,
    };
  }

  async getPaymentEvent({ req }: { req: Request }): Promise<PaymentEvent> {
    const payload = await req.text();
    const signature = req.headers.get('x-waffo-signature');
    if (!payload || !signature) throw new Error('Invalid webhook request');

    const event = verifyWebhook<WebhookEventData>(payload, signature, {
      environment: this.configs.environment,
      toleranceMs: 300_000,
    });
    if (this.configs.environment && event.mode !== this.configs.environment) {
      throw new WebhookIgnoredError(
        `Unexpected Waffo event mode: ${event.mode}`
      );
    }

    const planChange = this.buildPlanChangeEvent(event);
    if (planChange) return planChange;

    const paymentSession = this.buildPaymentSession(event);
    if (!paymentSession) {
      throw new WebhookIgnoredError(
        `No handler for Waffo event: ${event.eventType}`
      );
    }

    return {
      eventType: this.mapEventType(event.eventType),
      eventResult: event,
      paymentSession,
    };
  }

  async cancelSubscription({
    subscriptionId,
  }: {
    subscriptionId: string;
    immediate?: boolean;
  }): Promise<PaymentSession> {
    const result = await this.client.orders.cancelSubscription({
      orderId: subscriptionId,
    });
    const status =
      result.status === 'canceling'
        ? SubscriptionStatus.PENDING_CANCEL
        : SubscriptionStatus.CANCELED;

    return {
      provider: this.name,
      subscriptionId,
      subscriptionInfo: {
        subscriptionId,
        // Period dates are local; cancel must not overwrite them with "now".
        currentPeriodStart: undefined as unknown as Date,
        currentPeriodEnd: undefined as unknown as Date,
        status,
        canceledAt: new Date(),
        canceledEndAt: result.status === 'canceled' ? new Date() : undefined,
      },
      subscriptionResult: result,
    };
  }

  /**
   * Undo cancelSubscription (period end): issue a Session Token, then
   * reactivate the canceling order (status canceling → active). Period
   * dates are left unset so the service keeps the local period. The
   * `subscription.uncanceled` webhook is a fallback if local clear races.
   * @docs SDK customer.reactivateSubscription →
   *   POST /v1/actions/subscription-order/reactivate-order
   */
  async resumeSubscription({
    subscriptionId,
    buyerIdentity,
    productId,
  }: {
    subscriptionId: string;
    buyerIdentity?: string;
    productId?: string;
  }): Promise<PaymentSession> {
    if (!subscriptionId) throw new Error('subscriptionId is required');
    if (!buyerIdentity) throw new Error('buyerIdentity is required');
    if (!productId) throw new Error('productId is required');

    let token: string;
    try {
      ({ token } = await this.client.auth.issueSessionToken({
        productId,
        buyerIdentity,
      }));
    } catch (error) {
      throw new WaffoApiError('issue-session-token', error);
    }

    // The session token carries no environment; the customer call must send
    // X-Environment matching the order's environment (waffo_environment).
    // Unconfigured: try prod, then test when prod has no such order.
    const environments: Array<'test' | 'prod'> = this.configs?.environment
      ? [this.configs.environment]
      : ['prod', 'test'];
    let result: { orderId?: string; status?: string } | undefined;
    let lastError: unknown;
    for (const environment of environments) {
      try {
        result = await this.client
          .customer(token, { environment })
          .reactivateSubscription({ orderId: subscriptionId });
        break;
      } catch (error) {
        lastError = error;
        if (!isWaffoOrderNotFound(error)) break;
      }
    }
    if (!result) throw new WaffoApiError('reactivate-order', lastError);

    if (result.status !== 'active') {
      throw new Error(
        `Resume subscription failed: Waffo returned status ${result.status}`
      );
    }

    return {
      provider: this.name,
      subscriptionId,
      subscriptionInfo: {
        subscriptionId,
        // Reactivate returns only status; keep local period dates.
        currentPeriodStart: undefined as unknown as Date,
        currentPeriodEnd: undefined as unknown as Date,
        status: SubscriptionStatus.ACTIVE,
        resumed: true,
      },
      subscriptionResult: result,
    };
  }

  async changeSubscriptionPlan(
    params: PlanChangeParams
  ): Promise<PlanChangeResult> {
    const buyerIdentity = params.customer?.id;
    if (!buyerIdentity) throw new Error('customer.id is required');
    const language = this.mapLocaleToWaffoLanguage(params.locale);
    const sessionParams = {
      originOrderId: params.subscriptionId,
      productId: params.productId,
      currency: String(params.currency || 'USD').toUpperCase(),
      changeTiming: params.timing === 'immediate' ? 'immediate' : 'next_period',
      orderMerchantExternalId: params.orderNo,
      // Pre-fill the change page like a normal checkout; without it Waffo's
      // "your info" step starts blank (email empty, country reset).
      ...(params.customer?.email ? { buyerEmail: params.customer.email } : {}),
      successUrl: params.successUrl,
      metadata: params.metadata,
      ...(language ? { language } : {}),
    };
    const session = await this.client.checkout.authenticated.create({
      ...sessionParams,
      buyerIdentity,
    } as any);
    return {
      status: 'confirm_required',
      sessionId: session.sessionId,
      confirmUrl: this.confirmUrl(String(session.checkoutUrl)),
      raw: session,
    };
  }

  /**
   * Sandbox plan-change links need test=true. Waffo checkout URLs may already
   * carry a query (and always carry #token=…); a second ? would drop the
   * fragment the cashier uses to finish and redirect.
   */
  private confirmUrl(checkoutUrl: string): string {
    const hashAt = checkoutUrl.indexOf('#');
    const hash = hashAt >= 0 ? checkoutUrl.slice(hashAt) : '';
    const base = hashAt >= 0 ? checkoutUrl.slice(0, hashAt) : checkoutUrl;
    if (this.configs.environment !== 'test') return checkoutUrl;
    const url = new URL(base);
    url.searchParams.set('test', 'true');
    return `${url.toString()}${hash}`;
  }

  private buildPlanChangeEvent(event: {
    eventType: string;
    eventId: string;
    data: WebhookEventData;
  }): PaymentEvent | undefined {
    const data = event.data as WebhookEventData & {
      planChange?: { effectiveDate?: string | null } | null;
    };
    const meta = (data.orderMetadata || {}) as Record<string, unknown>;
    const metaString = (key: string) =>
      typeof meta[key] === 'string' && meta[key] ? (meta[key] as string) : '';
    const merchantOrderNo =
      data.orderMerchantExternalId || metaString('order_no') || undefined;
    const base = {
      providerOrderId: data.orderId,
      merchantOrderNo,
      buyerIdentity:
        data.merchantProvidedBuyerIdentity || metaString('userId') || undefined,
      effectiveAt:
        this.date(data.planChange?.effectiveDate || undefined) || undefined,
    };
    const planChangeSession = (
      state: ProviderPlanChange['state']
    ): PaymentEvent => ({
      eventType: PaymentEventType.PLAN_CHANGE,
      eventResult: event,
      paymentSession: {
        provider: this.name,
        subscriptionId: data.orderId,
        planChange: { state, ...base },
        metadata: data.orderMetadata,
      },
    });

    switch (event.eventType) {
      case WAFFO_PLAN_CHANGE_EVENTS.scheduled:
        return planChangeSession('scheduled');
      case WAFFO_PLAN_CHANGE_EVENTS.failed:
        return planChangeSession('failed');
      case WAFFO_PLAN_CHANGE_EVENTS.changed: {
        if (!merchantOrderNo) {
          throw new WebhookIgnoredError(
            'Waffo plan_changed without orderMerchantExternalId'
          );
        }
        const session = this.buildSubscriptionPaymentSession(
          data,
          {
            eventId: event.eventId,
            eventType: WebhookEventType.SubscriptionActivated,
          },
          merchantOrderNo
        );
        session.planChange = { state: 'applied', ...base };
        return {
          eventType: PaymentEventType.CHECKOUT_SUCCESS,
          eventResult: event,
          paymentSession: session,
        };
      }
      default:
        return undefined;
    }
  }

  async getPlanChangeStatus({
    orderNo,
    originOrderId,
  }: {
    orderNo: string;
    originOrderId?: string | null;
  }): Promise<PlanChangeStatusResult> {
    const debug: Record<string, unknown> = {};
    const gql = async <T>(
      key: string,
      query: string,
      variables: Record<string, unknown>
    ): Promise<T | null> => {
      try {
        const res = await this.client.graphql.query<T>({ query, variables });
        debug[key] = res.errors?.length
          ? { errors: res.errors.map((e: any) => e?.message) }
          : res.data;
        return res.errors?.length ? null : ((res.data as T) ?? null);
      } catch (error) {
        debug[key] = { error: (error as Error)?.message || String(error) };
        return null;
      }
    };

    type PaymentsData = {
      payments?: Array<{
        id: string;
        orderId?: string | null;
        status?: string;
      }>;
    };
    type OrderData = {
      subscriptionOrder?: { id: string; status?: string } | null;
    };
    const orderQuery = `query ($id: String!) {
      subscriptionOrder(id: $id) { id status }
    }`;

    const [payments, origin] = await Promise.all([
      gql<PaymentsData>(
        'payments',
        `query ($ref: String!) {
          payments(filter: { orderMerchantExternalId: { eq: $ref } }) {
            id orderId status
          }
        }`,
        { ref: orderNo }
      ),
      originOrderId
        ? gql<OrderData>('origin', orderQuery, { id: originOrderId })
        : Promise.resolve(null),
    ]);
    if (payments === null && (originOrderId ? origin === null : true)) {
      throw new Error(
        `Waffo plan change status unavailable: ${JSON.stringify(debug)}`
      );
    }
    const originStatus = origin?.subscriptionOrder?.status || undefined;

    const rows = payments?.payments || [];
    const confirmedPayment = rows.find(
      (p) =>
        p.orderId &&
        p.orderId !== originOrderId &&
        CONFIRMED_PAYMENT_STATUSES.has(String(p.status || '').toLowerCase())
    );
    const newOrderId =
      confirmedPayment?.orderId ||
      rows.find((p) => p.orderId && p.orderId !== originOrderId)?.orderId ||
      undefined;

    let newStatus = '';
    let newOrderLookupFailed = false;
    if (newOrderId) {
      const created = await gql<OrderData>('newOrder', orderQuery, {
        id: newOrderId,
      });
      newOrderLookupFailed = created === null;
      newStatus = String(created?.subscriptionOrder?.status || '');
    }
    const base = { originStatus, debug };

    if (newOrderId && ['active', 'canceling', 'past_due'].includes(newStatus)) {
      return { state: 'applied', providerOrderId: newOrderId, ...base };
    }
    if (newOrderId && confirmedPayment && newStatus === 'pending') {
      return { state: 'scheduled', providerOrderId: newOrderId, ...base };
    }
    if (newOrderId && confirmedPayment && newOrderLookupFailed) {
      return { state: 'scheduled', providerOrderId: newOrderId, ...base };
    }
    if (originStatus === 'canceling') {
      return { state: 'scheduled', providerOrderId: newOrderId, ...base };
    }
    if (
      newOrderId &&
      !confirmedPayment &&
      ['canceled', 'closed', 'expired'].includes(newStatus)
    ) {
      return { state: 'failed', providerOrderId: newOrderId, ...base };
    }
    return { state: 'none', providerOrderId: newOrderId, ...base };
  }

  private buildPaymentSession(event: {
    eventType: string;
    eventId: string;
    data: WebhookEventData;
  }): PaymentSession | undefined {
    const { data } = event;
    const orderNo = data.orderMerchantExternalId;
    if (!orderNo) {
      throw new Error('Waffo webhook is missing orderMerchantExternalId');
    }

    switch (event.eventType) {
      case WebhookEventType.OrderCompleted:
        return this.buildOneTimeSession(data, event, orderNo);
      case WebhookEventType.SubscriptionActivated:
        return this.buildSubscriptionPaymentSession(data, event, orderNo);
      case WebhookEventType.SubscriptionPaymentSucceeded:
      case SUBSCRIPTION_RENEWED_EVENT:
        return this.buildSubscriptionPaymentSession(data, event, orderNo);
      case WebhookEventType.RefundSucceeded:
        return this.buildRefundSession(data, event, orderNo);
      case WebhookEventType.SubscriptionUpdated:
      case WebhookEventType.SubscriptionCanceling:
      case WebhookEventType.SubscriptionUncanceled:
      case WebhookEventType.SubscriptionPastDue:
      case WebhookEventType.SubscriptionCanceled:
        return this.buildSubscriptionSession(data, event, orderNo);
      default:
        return undefined;
    }
  }

  /** Minor units → Waffo display-string price override. */
  private buildPriceSnapshot(amountMinor: number, currency: string) {
    if (!Number.isFinite(amountMinor) || amountMinor <= 0 || !currency) {
      return undefined;
    }
    const fractionDigits =
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).resolvedOptions().maximumFractionDigits ?? 2;
    return {
      amount: (amountMinor / 10 ** fractionDigits).toFixed(fractionDigits),
      taxCategory: TaxCategory.DigitalGoods,
    };
  }

  private mapLocaleToWaffoLanguage(
    locale?: string
  ): CashierLanguage | undefined {
    if (!locale) return undefined;
    return WAFFO_LANGUAGES[locale] ?? WAFFO_LANGUAGES[locale.split('-')[0]];
  }

  private buildOneTimeSession(
    data: WebhookEventData,
    event: { eventId: string },
    orderNo: string
  ): PaymentSession {
    return {
      provider: this.name,
      paymentStatus: PaymentStatus.SUCCESS,
      paymentInfo: this.paymentInfo(data, event.eventId),
      paymentResult: { id: orderNo, ...data, orderNo },
      metadata: data.orderMetadata,
    };
  }

  private buildSubscriptionPaymentSession(
    data: WebhookEventData,
    event: { eventId: string; eventType: string },
    orderNo: string
  ): PaymentSession {
    const session = this.buildSubscriptionSession(data, event, orderNo);
    session.paymentStatus = PaymentStatus.SUCCESS;
    session.paymentResult = { id: orderNo, ...data, orderNo };
    session.paymentInfo = {
      ...this.paymentInfo(data, event.eventId),
      subscriptionCycleType:
        event.eventType === WebhookEventType.SubscriptionActivated
          ? SubscriptionCycleType.CREATE
          : SubscriptionCycleType.RENEWAL,
    };
    return session;
  }

  private buildSubscriptionSession(
    data: WebhookEventData,
    event: { eventId: string; eventType?: string },
    orderNo: string
  ): PaymentSession {
    const subscriptionInfo = this.subscriptionInfo(data);
    // Resumed in the Waffo portal (tinyship handleSubscriptionUncanceled):
    // the only Waffo event that may lift a billing cancel.
    if (event.eventType === WebhookEventType.SubscriptionUncanceled) {
      subscriptionInfo.resumed = true;
      if (subscriptionInfo.status === SubscriptionStatus.PENDING_CANCEL) {
        subscriptionInfo.status = SubscriptionStatus.ACTIVE;
      }
    }
    return {
      provider: this.name,
      subscriptionId: data.orderId,
      subscriptionInfo,
      subscriptionResult: {
        id: orderNo,
        ...data,
        orderNo,
        eventId: event.eventId,
      },
      metadata: data.orderMetadata,
    };
  }

  private buildRefundSession(
    data: WebhookEventData,
    event: { eventId: string },
    orderNo: string
  ): PaymentSession {
    return {
      provider: this.name,
      paymentStatus: PaymentStatus.SUCCESS,
      paymentInfo: this.paymentInfo(data, event.eventId),
      paymentResult: { id: orderNo, ...data, orderNo },
      metadata: data.orderMetadata,
    };
  }

  private paymentInfo(data: WebhookEventData, eventId: string) {
    return {
      description: data.productDescription || data.productName,
      transactionId: data.paymentId || eventId,
      // Absent total/amount or currency → undefined (verification pending),
      // never 0; a reported "0" stays a real 0.
      paymentAmount: this.optionalAmount(
        this.firstPresent(data.total, data.amount),
        data.currency
      ),
      paymentCurrency: data.currency,
      paymentEmail: data.buyerEmail,
      paymentUserId: data.merchantProvidedBuyerIdentity,
      paidAt: this.date(data.paymentDate) || new Date(),
      invoiceId: data.paymentId || eventId,
    };
  }

  private subscriptionInfo(data: WebhookEventData): SubscriptionInfo {
    const interval = this.interval(data.billingPeriod);
    const start = this.date(data.currentPeriodStart) || new Date();
    return {
      subscriptionId: data.orderId,
      productId: data.productMetadata?.productId,
      description: data.productDescription || data.productName,
      amount: this.amount(data.total || data.amount, data.currency),
      currency: data.currency,
      interval,
      intervalCount: 1,
      currentPeriodStart: start,
      currentPeriodEnd: resolvePeriodEnd({
        end: this.date(data.currentPeriodEnd),
        start,
        interval,
      }),
      status: this.subscriptionStatus(data.orderStatus),
      canceledAt: this.date(data.canceledAt) || undefined,
      canceledEndAt:
        data.orderStatus === 'canceled'
          ? this.date(data.canceledAt) || new Date()
          : undefined,
    };
  }

  private mapEventType(eventType: string): PaymentEventType {
    switch (eventType) {
      case WebhookEventType.OrderCompleted:
      case WebhookEventType.SubscriptionActivated:
        return PaymentEventType.CHECKOUT_SUCCESS;
      case WebhookEventType.SubscriptionPaymentSucceeded:
      case SUBSCRIPTION_RENEWED_EVENT:
        return PaymentEventType.PAYMENT_SUCCESS;
      case WebhookEventType.RefundSucceeded:
        return PaymentEventType.PAYMENT_REFUNDED;
      case WebhookEventType.SubscriptionCanceled:
        return PaymentEventType.SUBSCRIBE_CANCELED;
      default:
        return PaymentEventType.SUBSCRIBE_UPDATED;
    }
  }

  private interval(value?: string): PaymentInterval {
    return value === 'yearly' ? PaymentInterval.YEAR : PaymentInterval.MONTH;
  }

  private subscriptionStatus(value?: string): SubscriptionStatus {
    switch (value) {
      case 'canceling':
        return SubscriptionStatus.PENDING_CANCEL;
      case 'canceled':
      case 'expired':
      case 'closed':
        return SubscriptionStatus.CANCELED;
      case 'past_due':
        return SubscriptionStatus.PAUSED;
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      default:
        return SubscriptionStatus.ACTIVE;
    }
  }

  private amount(value: string | undefined, currency: string): number {
    return this.optionalAmount(value, currency) ?? 0;
  }

  private firstPresent(
    ...values: Array<string | number | null | undefined>
  ): string | undefined {
    const found = values.find(
      (value) =>
        value !== undefined && value !== null && String(value).trim() !== ''
    );
    return found === undefined || found === null ? undefined : String(found);
  }

  /** Display-string amount → minor units; undefined when amount/currency missing. */
  private optionalAmount(
    value: string | number | null | undefined,
    currency: string | null | undefined
  ): number | undefined {
    if (value === undefined || value === null || String(value).trim() === '')
      return undefined;
    const amount = Number(value);
    if (!Number.isFinite(amount) || !currency) return undefined;
    const fractionDigits =
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).resolvedOptions().maximumFractionDigits ?? 2;
    return Math.round(amount * 10 ** fractionDigits);
  }

  private date(value?: string): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}

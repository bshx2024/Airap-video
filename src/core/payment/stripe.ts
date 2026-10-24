import Stripe from 'stripe';

import { resolvePeriodEnd } from './period';
import { PROVIDER_TIMEOUT_MS } from './timeout';
import {
  CheckoutSession,
  PaymentBilling,
  PaymentEventType,
  PaymentInterval,
  PaymentInvoice,
  PaymentStatus,
  PaymentType,
  PlanChangeParams,
  PlanChangeResult,
  SubscriptionCycleType,
  SubscriptionInfo,
  SubscriptionStatus,
  WebhookIgnoredError,
  type PaymentConfigs,
  type PaymentEvent,
  type PaymentOrder,
  type PaymentProvider,
  type PaymentSession,
} from './types';

/**
 * Stripe payment provider configs
 * @docs https://stripe.com/docs
 */
/**
 * Checkout Session amounts for payment verification, in the order's
 * (merchant / source) currency, minor units.
 *
 * With Adaptive Pricing, `currency` / `amount_*` / `total_details` are in the
 * customer's presentment currency and `currency_conversion` carries the
 * source-currency amounts — report those so they compare to order.amount.
 * Missing totals stay `undefined` (= not reported yet), never 0.
 */
export function stripeCheckoutSessionAmounts(
  session: Pick<
    Stripe.Checkout.Session,
    | 'amount_subtotal'
    | 'amount_total'
    | 'currency'
    | 'currency_conversion'
    | 'total_details'
  >
): {
  paymentAmount: number | undefined;
  paymentCurrency: string;
  subtotalAmount: number | undefined;
  discountAmount: number;
  discountCurrency: string;
} {
  const presentmentDiscount = session.total_details?.amount_discount || 0;
  const conversion = session.currency_conversion;
  if (conversion) {
    const total =
      typeof conversion.amount_total === 'number'
        ? conversion.amount_total
        : undefined;
    const subtotal =
      typeof conversion.amount_subtotal === 'number'
        ? conversion.amount_subtotal
        : undefined;
    const currency = conversion.source_currency || '';
    // Derive the discount in source currency from source amounts (converting
    // the presentment discount back could leave an fx-rounding shortfall).
    const discountAmount =
      presentmentDiscount > 0 && total !== undefined && subtotal !== undefined
        ? Math.max(0, subtotal - total)
        : 0;
    return {
      paymentAmount: total,
      paymentCurrency: currency,
      subtotalAmount: subtotal,
      discountAmount,
      discountCurrency: currency,
    };
  }
  return {
    paymentAmount:
      typeof session.amount_total === 'number'
        ? session.amount_total
        : undefined,
    paymentCurrency: session.currency || '',
    subtotalAmount:
      typeof session.amount_subtotal === 'number'
        ? session.amount_subtotal
        : undefined,
    discountAmount: presentmentDiscount,
    discountCurrency: session.currency || '',
  };
}

export interface StripeConfigs extends PaymentConfigs {
  secretKey: string;
  publishableKey: string;
  signingSecret?: string;
  apiVersion?: string;
  allowedPaymentMethods?: string[];
  allowPromotionCodes?: boolean;
}

/**
 * Stripe payment provider implementation
 * @website https://stripe.com/
 */
/** Provider period dates drift; a renewal may start a little before. */
const RENEWAL_LOOKUP_SKEW_MS = 12 * 60 * 60 * 1000;

export class StripeProvider implements PaymentProvider {
  readonly name = 'stripe';
  configs: StripeConfigs;

  private client: Stripe;

  constructor(configs: StripeConfigs) {
    this.configs = configs;
    this.client = new Stripe(configs.secretKey, {
      httpClient: Stripe.createFetchHttpClient(),
      // SDK default is 80s; a hung call would freeze plan changes/checkout.
      timeout: PROVIDER_TIMEOUT_MS,
    });
  }

  async createPayment({
    order,
  }: {
    order: PaymentOrder;
  }): Promise<CheckoutSession> {
    try {
      // check payment price
      if (!order.price) {
        throw new Error('price is required');
      }

      // create payment with dynamic product

      // build price data
      const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData =
        {
          currency: order.price.currency,
          unit_amount: order.price.amount, // unit: cents
          product_data: {
            name: order.description || '',
          },
        };

      if (order.type === PaymentType.SUBSCRIPTION) {
        // create subscription payment

        // check payment plan
        if (!order.plan) {
          throw new Error('plan is required');
        }

        // build recurring data
        priceData.recurring = {
          interval: order.plan
            .interval as Stripe.Checkout.SessionCreateParams.LineItem.PriceData.Recurring.Interval,
        };
      } else {
        // create one-time payment
      }

      // set or create customer
      let customerId = '';
      if (order.customer?.email) {
        const customers = await this.client.customers.list({
          email: order.customer.email,
          limit: 1,
        });

        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        } else {
          const customer = await this.client.customers.create({
            email: order.customer.email,
            name: order.customer.name,
            metadata: order.customer.metadata,
          });
          customerId = customer.id;
        }
      }

      // create payment session params
      // A fixed Price (stripe_price_ids_mapping) makes the subscription
      // switchable later (subscriptions.update / schedules need a Price id);
      // without a mapping keep the legacy inline price_data.
      const fixedPriceId =
        order.type === PaymentType.SUBSCRIPTION &&
        isStripePriceId(order.productId)
          ? order.productId
          : undefined;
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode:
          order.type === PaymentType.SUBSCRIPTION ? 'subscription' : 'payment',
        line_items: [
          fixedPriceId
            ? { price: fixedPriceId, quantity: 1 }
            : {
                price_data: priceData,
                quantity: 1,
              },
        ],
      };
      if (fixedPriceId && order.metadata) {
        // Lets webhooks of later plan changes find our user/order.
        sessionParams.subscription_data = {
          metadata: Object.fromEntries(
            Object.entries(order.metadata).map(([k, v]) => [k, String(v)])
          ),
        };
      }

      // pre-set promotion code
      if (order.discount && order.discount.code) {
        sessionParams.discounts = [
          {
            promotion_code: order.discount.code,
          },
        ];
      }

      // allow user input promotion code
      if (this.configs.allowPromotionCodes && !sessionParams.discounts) {
        sessionParams.allow_promotion_codes = true;
      }

      // If currency is CNY, enable WeChat Pay and Alipay (only for one-time payments)
      // Note: WeChat Pay and Alipay through Stripe only supports one-time payments, not subscriptions
      const currency = order.price.currency.toLowerCase();
      if (currency === 'cny' && order.type === PaymentType.ONE_TIME) {
        // Enable WeChat Pay and Alipay for CNY one-time payments
        sessionParams.payment_method_types = [];
        sessionParams.payment_method_options = {};

        // get allowed payment methods
        const allowedPaymentMethods = this.configs.allowedPaymentMethods || [];

        if (allowedPaymentMethods.includes('card')) {
          sessionParams.payment_method_types.push('card');
        }
        if (allowedPaymentMethods.includes('wechat_pay')) {
          sessionParams.payment_method_types.push('wechat_pay');
          sessionParams.payment_method_options.wechat_pay = {
            client: 'web',
          };
        }
        if (allowedPaymentMethods.includes('alipay')) {
          sessionParams.payment_method_types.push('alipay');
          sessionParams.payment_method_options.alipay = {};
        }

        if (allowedPaymentMethods.length === 0) {
          // not set allowed payment methods, use default payment methods
          sessionParams.payment_method_types = ['card'];
        }
      }

      if (order.type === PaymentType.ONE_TIME) {
        sessionParams.invoice_creation = {
          enabled: true,
        };
      }

      if (customerId) {
        sessionParams.customer = customerId;
      }

      if (order.orderNo) {
        sessionParams.client_reference_id = order.orderNo;
      }

      const orderMeta = {
        ...(order.metadata || {}),
        ...(order.orderNo ? { order_no: order.orderNo } : {}),
      };
      if (Object.keys(orderMeta).length > 0) {
        sessionParams.metadata = orderMeta;
        if (order.type === PaymentType.SUBSCRIPTION) {
          sessionParams.subscription_data = {
            ...(sessionParams.subscription_data || {}),
            metadata: orderMeta,
          };
        }
      }

      if (order.successUrl) {
        sessionParams.success_url = order.successUrl;
      }

      if (order.cancelUrl) {
        sessionParams.cancel_url = order.cancelUrl;
      }

      const session = await this.client.checkout.sessions.create(sessionParams);
      if (!session.id || !session.url) {
        throw new Error('create payment failed');
      }

      return {
        provider: this.name,
        checkoutParams: sessionParams,
        checkoutInfo: {
          sessionId: session.id,
          checkoutUrl: session.url,
        },
        checkoutResult: session,
        metadata: orderMeta,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get payment session by session id
   */
  async getPaymentSession({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<PaymentSession> {
    try {
      if (!sessionId) {
        throw new Error('sessionId is required');
      }

      const session = await this.client.checkout.sessions.retrieve(sessionId);

      return await this.buildPaymentSessionFromCheckoutSession(session);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get payment event from webhook notification
   */
  async getPaymentEvent({ req }: { req: Request }): Promise<PaymentEvent> {
    try {
      const rawBody = await req.text();
      const signature = req.headers.get('stripe-signature') as string;

      if (!rawBody || !signature) {
        throw new Error('Invalid webhook request');
      }

      if (!this.configs.signingSecret) {
        throw new Error('Signing Secret not configured');
      }

      // Async verification: on Cloudflare Workers the Stripe SDK uses
      // SubtleCrypto, which has no synchronous API — constructEvent() throws
      // "SubtleCryptoProvider cannot be used in a synchronous context" there.
      // constructEventAsync() is correct on Node too, so it's the only path.
      const event = await this.client.webhooks.constructEventAsync(
        rawBody,
        signature,
        this.configs.signingSecret
      );

      let paymentSession: PaymentSession | undefined = undefined;

      const eventType = this.mapStripeEventType(event.type);

      if (eventType === PaymentEventType.CHECKOUT_SUCCESS) {
        paymentSession = await this.buildPaymentSessionFromCheckoutSession(
          event.data.object as Stripe.Response<Stripe.Checkout.Session>
        );
      } else if (eventType === PaymentEventType.PAYMENT_SUCCESS) {
        paymentSession = await this.buildPaymentSessionFromInvoice(
          event.data.object as Stripe.Response<Stripe.Invoice>
        );
      } else if (eventType === PaymentEventType.SUBSCRIBE_UPDATED) {
        paymentSession = await this.buildPaymentSessionFromSubscription(
          event.data.object as Stripe.Response<Stripe.Subscription>
        );
      } else if (eventType === PaymentEventType.SUBSCRIBE_CANCELED) {
        paymentSession = await this.buildPaymentSessionFromSubscription(
          event.data.object as Stripe.Response<Stripe.Subscription>
        );
      } else if (eventType === PaymentEventType.PAYMENT_REFUNDED) {
        paymentSession = await this.buildPaymentSessionFromCharge(
          event.data.object as Stripe.Charge
        );
      }

      if (!paymentSession) {
        throw new WebhookIgnoredError(
          `No handler for Stripe event: ${event.type}`
        );
      }

      return {
        eventType: eventType,
        eventResult: event,
        paymentSession: paymentSession,
      };
    } catch (error) {
      throw error;
    }
  }

  async getPaymentInvoice({
    invoiceId,
  }: {
    invoiceId: string;
  }): Promise<PaymentInvoice> {
    try {
      const invoice = await this.client.invoices.retrieve(invoiceId);
      if (!invoice.id) {
        throw new Error('Invoice not found');
      }

      return {
        invoiceId: invoice.id,
        invoiceUrl: invoice.hosted_invoice_url || undefined,
        amount: invoice.amount_paid,
        currency: invoice.currency,
      };
    } catch (error) {
      throw error;
    }
  }

  async getPaymentBilling({
    customerId,
    returnUrl,
  }: {
    customerId: string;
    returnUrl?: string;
  }): Promise<PaymentBilling> {
    try {
      const billing = await this.client.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      if (!billing.url) {
        throw new Error('get billing url failed');
      }

      return {
        billingUrl: billing.url,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Default: cancel at period end (customer keeps the plan, no refund;
   * `customer.subscription.deleted` fires when the period ends).
   * `immediate` ends it now (plan replaced by a higher one).
   */
  async cancelSubscription({
    subscriptionId,
    immediate,
  }: {
    subscriptionId: string;
    immediate?: boolean;
  }): Promise<PaymentSession> {
    if (!subscriptionId) {
      throw new Error('subscriptionId is required');
    }

    if (immediate) {
      const subscription =
        await this.client.subscriptions.cancel(subscriptionId);
      if (!subscription.canceled_at) {
        throw new Error('Cancel subscription failed');
      }
      return await this.buildPaymentSessionFromSubscription(subscription);
    }

    // A schedule-managed subscription must not be edited directly (the next
    // phase would overwrite it): drop a pending downgrade first.
    const current = await this.client.subscriptions.retrieve(subscriptionId, {
      expand: ['schedule'],
    });
    if (current.schedule) {
      await this.releaseSchedule(current.schedule);
    }
    const subscription = await this.client.subscriptions.update(
      subscriptionId,
      { cancel_at_period_end: true }
    );
    if (!subscription.cancel_at_period_end && !subscription.cancel_at) {
      throw new Error('Cancel subscription failed');
    }
    return await this.buildPaymentSessionFromSubscription(subscription);
  }

  /**
   * Undo cancelSubscription (period end): cancel_at_period_end=false, the
   * subscription renews again; nothing is charged now.
   * @docs https://docs.stripe.com/billing/subscriptions/cancel#reactivating-canceled-subscriptions
   */
  async resumeSubscription({
    subscriptionId,
  }: {
    subscriptionId: string;
  }): Promise<PaymentSession> {
    if (!subscriptionId) throw new Error('subscriptionId is required');
    const subscription = await this.client.subscriptions.update(
      subscriptionId,
      { cancel_at_period_end: false }
    );
    if (subscription.cancel_at_period_end || subscription.cancel_at) {
      throw new Error('Resume subscription failed');
    }
    return await this.buildPaymentSessionFromSubscription(subscription);
  }

  /**
   * immediate  → subscriptions.update with the new Price, prorated and
   *              invoiced now; with pending_if_incomplete the switch only
   *              lands once that invoice is paid.
   * period_end → Subscription Schedule: phase 1 = rest of the current period
   *              on the current price, phase 2 = new price; released after.
   * @docs https://docs.stripe.com/billing/subscriptions/change-price
   * @docs https://docs.stripe.com/billing/subscriptions/subscription-schedules/use-cases
   */
  /**
   * Current subscription (price, status, pending_update) — lets billing
   * reconcile an upgrade whose customer.subscription.updated webhook is late.
   * @docs https://docs.stripe.com/api/subscriptions/retrieve
   */
  async getSubscription({
    subscriptionId,
  }: {
    subscriptionId: string;
  }): Promise<PaymentSession> {
    const subscription =
      await this.client.subscriptions.retrieve(subscriptionId);
    return this.buildPaymentSessionFromSubscription(subscription);
  }

  /**
   * A renewal whose `invoice.payment_succeeded` may be lost: the newest paid
   * `subscription_cycle` invoice created since `after`, built exactly like
   * that webhook (transaction id = invoice id, so a late webhook is the same
   * renewal). Null while Stripe has not renewed (or the subscription is not
   * on the new period yet).
   */
  async getRenewalSession({
    subscriptionId,
    after,
  }: {
    subscriptionId: string;
    after: Date;
  }): Promise<PaymentSession | null> {
    const since = after.getTime() - RENEWAL_LOOKUP_SKEW_MS;
    const invoices = await this.client.invoices.list({
      subscription: subscriptionId,
      status: 'paid',
      created: { gte: Math.floor(since / 1000) },
      limit: 10,
    });
    const invoice = invoices.data.find(
      (i) => i.billing_reason === 'subscription_cycle'
    );
    if (!invoice) return null;
    const session = await this.buildPaymentSessionFromInvoice(
      invoice as Stripe.Response<Stripe.Invoice>
    );
    const start = session.subscriptionInfo?.currentPeriodStart;
    if (!start || start.getTime() < since) return null;
    return session;
  }

  async changeSubscriptionPlan(
    params: PlanChangeParams
  ): Promise<PlanChangeResult> {
    const { subscriptionId, productId: newPriceId, timing } = params;
    if (!isStripePriceId(newPriceId)) {
      throw new Error('Plan change not configured for this provider');
    }
    // Expanding the schedule saves a serial schedules.retrieve below.
    const current = await this.client.subscriptions.retrieve(subscriptionId, {
      expand: ['schedule'],
    });
    const item = current.items.data[0];
    if (!item) throw new Error('Subscription has no items');

    if (timing === 'immediate') {
      if (current.schedule) await this.releaseSchedule(current.schedule);
      const updated = await this.client.subscriptions.update(subscriptionId, {
        items: [{ id: item.id, price: newPriceId }],
        proration_behavior: 'always_invoice',
        payment_behavior: 'pending_if_incomplete',
      });
      const switched =
        !updated.pending_update &&
        updated.items.data[0]?.price.id === newPriceId;
      return {
        status: switched ? 'applied' : 'processing',
        subscriptionInfo: await this.buildSubscriptionInfo(updated),
        raw: updated,
      };
    }

    // Reuse the attached schedule (expanded above) or create one; both
    // already carry the phases, so no extra retrieve round trip.
    const schedule: Stripe.SubscriptionSchedule = current.schedule
      ? typeof current.schedule === 'string'
        ? await this.client.subscriptionSchedules.retrieve(current.schedule)
        : current.schedule
      : await this.client.subscriptionSchedules.create({
          from_subscription: subscriptionId,
          expand: ['phases.items.price'],
        });
    const scheduleId = schedule.id;
    const now = Math.floor(Date.now() / 1000);
    const phase =
      schedule.phases.find((p) => p.start_date <= now && p.end_date > now) ||
      schedule.phases[0];
    if (!phase) throw new Error('Subscription schedule has no current phase');

    const currentItems = await Promise.all(
      phase.items.map(async (phaseItem) => ({
        ...(await this.schedulePriceParam(phaseItem.price)),
        quantity: phaseItem.quantity || 1,
      }))
    );
    const discounts = (phase.discounts || [])
      .map((d) => {
        const ref = (v: any) => (typeof v === 'string' ? v : v?.id);
        if (d.discount) return { discount: ref(d.discount) };
        if (d.coupon) return { coupon: ref(d.coupon) };
        if (d.promotion_code) return { promotion_code: ref(d.promotion_code) };
        return null;
      })
      .filter(
        Boolean
      ) as Stripe.SubscriptionScheduleUpdateParams.Phase.Discount[];

    const updated = await this.client.subscriptionSchedules.update(scheduleId, {
      end_behavior: 'release',
      proration_behavior: 'none',
      phases: [
        {
          items: currentItems as any,
          start_date: phase.start_date,
          end_date: phase.end_date,
          proration_behavior: 'none',
          // Rewriting the phases without trial_end would end a running trial.
          ...(phase.trial_end ? { trial_end: phase.trial_end } : {}),
          ...(discounts.length ? { discounts } : {}),
        },
        {
          items: [{ price: newPriceId, quantity: 1 }],
          iterations: 1,
          proration_behavior: 'none',
          ...(discounts.length ? { discounts } : {}),
        },
      ],
      metadata: { ...(params.metadata || {}) },
    });

    return {
      status: 'scheduled',
      scheduleId: updated.id,
      effectiveAt: new Date(phase.end_date * 1000),
      raw: updated,
    };
  }

  async cancelScheduledPlanChange({
    subscriptionId,
    scheduleId,
  }: {
    subscriptionId: string;
    scheduleId?: string | null;
  }): Promise<void> {
    let id = scheduleId || '';
    if (!id) {
      const current = await this.client.subscriptions.retrieve(subscriptionId);
      id = current.schedule
        ? typeof current.schedule === 'string'
          ? current.schedule
          : current.schedule.id
        : '';
    }
    if (!id) return;
    await this.releaseSchedule(id);
  }

  private async releaseSchedule(
    schedule: string | Stripe.SubscriptionSchedule
  ): Promise<void> {
    const id = typeof schedule === 'string' ? schedule : schedule.id;
    const current =
      typeof schedule === 'string'
        ? await this.client.subscriptionSchedules.retrieve(id)
        : schedule;
    // released/canceled/completed schedules no longer control the sub.
    if (current.status !== 'active' && current.status !== 'not_started') {
      return;
    }
    await this.client.subscriptionSchedules.release(id);
  }

  /**
   * A phase item may point at an inline (inactive, one-off) price from the
   * legacy price_data checkout. Re-create it as price_data on its product so
   * the schedule update is accepted.
   */
  private async schedulePriceParam(
    price: string | Stripe.Price | Stripe.DeletedPrice
  ): Promise<{ price: string } | { price_data: Record<string, any> }> {
    const full: Stripe.Price =
      typeof price === 'string' || (price as any).deleted
        ? await this.client.prices.retrieve(
            typeof price === 'string' ? price : price.id
          )
        : (price as Stripe.Price);
    if (full.active) return { price: full.id };
    return {
      price_data: {
        currency: full.currency,
        product:
          typeof full.product === 'string' ? full.product : full.product.id,
        unit_amount: full.unit_amount ?? 0,
        recurring: full.recurring
          ? {
              interval: full.recurring.interval,
              interval_count: full.recurring.interval_count,
            }
          : undefined,
      },
    };
  }

  private mapStripeEventType(eventType: string): PaymentEventType {
    switch (eventType) {
      case 'checkout.session.completed':
        return PaymentEventType.CHECKOUT_SUCCESS;
      case 'invoice.payment_succeeded':
        return PaymentEventType.PAYMENT_SUCCESS;
      case 'invoice.payment_failed':
        return PaymentEventType.PAYMENT_FAILED;
      case 'customer.subscription.updated':
        return PaymentEventType.SUBSCRIBE_UPDATED;
      case 'customer.subscription.deleted':
        return PaymentEventType.SUBSCRIBE_CANCELED;
      case 'charge.refunded':
        return PaymentEventType.PAYMENT_REFUNDED;
      default:
        throw new WebhookIgnoredError(
          `Unknown Stripe event type: ${eventType}`
        );
    }
  }

  private mapStripeStatus(
    session: Stripe.Response<Stripe.Checkout.Session>
  ): PaymentStatus {
    switch (session.status) {
      case 'complete':
        // session complete, check payment status
        switch (session.payment_status) {
          case 'paid':
            // payment success
            return PaymentStatus.SUCCESS;
          case 'unpaid':
            // payment failed
            return PaymentStatus.PROCESSING;
          case 'no_payment_required':
            // means payment not required, should be success
            return PaymentStatus.SUCCESS;
          default:
            throw new Error(
              `Unknown Stripe payment status: ${session.payment_status}`
            );
        }
      case 'expired':
        // payment canceled
        return PaymentStatus.CANCELED;
      case 'open':
        return PaymentStatus.PROCESSING;
      default:
        throw new Error(`Unknown Stripe status: ${session.status}`);
    }
  }

  /**
   * Human-readable discount code: promotion code text, else coupon name/id.
   * Verification never depends on this — only on reported amounts.
   */
  private async resolveDiscountCode(
    session: Stripe.Checkout.Session
  ): Promise<string> {
    const discount = session.discounts?.find(
      (d) => d.promotion_code || d.coupon
    );
    if (!discount) return '';
    const promo = discount.promotion_code;
    if (promo && typeof promo === 'object') {
      return 'code' in promo && typeof promo.code === 'string'
        ? promo.code
        : '';
    }
    if (typeof promo === 'string') {
      try {
        return (await this.client.promotionCodes.retrieve(promo)).code || promo;
      } catch {
        return promo;
      }
    }
    const coupon = discount.coupon;
    if (coupon && typeof coupon === 'object') {
      if ('deleted' in coupon && coupon.deleted) return '';
      return coupon.name || coupon.id || '';
    }
    if (typeof coupon === 'string') {
      try {
        const c = await this.client.coupons.retrieve(coupon);
        return c.name || c.id;
      } catch {
        return coupon;
      }
    }
    return '';
  }

  // build payment session from checkout session
  private async buildPaymentSessionFromCheckoutSession(
    session: Stripe.Response<Stripe.Checkout.Session>
  ): Promise<PaymentSession> {
    let subscription: Stripe.Response<Stripe.Subscription> | undefined =
      undefined;

    if (session.subscription) {
      subscription = await this.client.subscriptions.retrieve(
        session.subscription as string
      );
    }

    const result: PaymentSession = {
      provider: this.name,
      paymentStatus: this.mapStripeStatus(session),
      paymentInfo: {
        transactionId: session.id,
        discountCode: await this.resolveDiscountCode(session),
        ...stripeCheckoutSessionAmounts(session),
        paymentEmail:
          session.customer_email ||
          session.customer_details?.email ||
          undefined,
        paymentUserName: session.customer_details?.name || '',
        paymentUserId: session.customer
          ? (session.customer as string)
          : undefined,
        paidAt: session.created ? new Date(session.created * 1000) : undefined,
        invoiceId: session.invoice ? (session.invoice as string) : undefined,
        invoiceUrl: '',
      },
      paymentResult: session,
      metadata: session.metadata,
    };

    if (subscription) {
      result.subscriptionId = subscription.id;
      result.subscriptionInfo = await this.buildSubscriptionInfo(subscription);
      result.subscriptionResult = subscription;
    }

    return result;
  }

  /**
   * charge.refunded → the local order it paid (ported from tinyship
   * resolveRefundedOrder): a one-time Checkout order by the session paid with
   * this PaymentIntent (transactionId = cs_…), a renewal / proration by its
   * invoice (transactionId = in_…), the first subscription invoice by the
   * order_no we put on the subscription metadata. `amount_refunded` is the
   * charge's running total (passed as the cumulative amount); `refunded`
   * means fully refunded.
   * @docs https://docs.stripe.com/api/charges/object
   */
  private async buildPaymentSessionFromCharge(
    charge: Stripe.Charge
  ): Promise<PaymentSession> {
    const idOf = (value: unknown): string | undefined =>
      typeof value === 'string'
        ? value
        : (value as { id?: string } | null | undefined)?.id || undefined;
    const paymentIntentId = idOf(charge.payment_intent);
    let invoiceId = idOf((charge as any).invoice);
    let paymentIntent: any;
    if (paymentIntentId && !invoiceId) {
      try {
        paymentIntent =
          await this.client.paymentIntents.retrieve(paymentIntentId);
        invoiceId = idOf(paymentIntent?.invoice);
      } catch (error) {
        console.warn('Stripe refund payment_intent lookup failed', error);
      }
    }
    if (paymentIntentId && !invoiceId) {
      try {
        const payments = await (this.client as any).invoicePayments?.list({
          payment: { type: 'payment_intent', payment_intent: paymentIntentId },
          limit: 1,
        });
        invoiceId = idOf(payments?.data?.[0]?.invoice);
      } catch (error) {
        console.warn('Stripe refund invoice payment lookup failed', error);
      }
    }

    let transactionId: string | undefined;
    let subscriptionId: string | undefined;
    let metadata: Record<string, string> = {
      ...(paymentIntent?.metadata || {}),
      ...(charge.metadata || {}),
    };
    if (invoiceId) {
      try {
        const invoice: any = await this.client.invoices.retrieve(invoiceId);
        subscriptionId =
          idOf(invoice.parent?.subscription_details?.subscription) ||
          idOf(invoice.subscription);
        metadata = {
          ...(invoice.parent?.subscription_details?.metadata || {}),
          ...(invoice.metadata || {}),
          ...metadata,
        };
        // The first invoice is booked on the Checkout order (cs_…), every
        // later one (renewal / proration) under its own invoice id.
        transactionId =
          invoice.billing_reason === 'subscription_create'
            ? undefined
            : invoiceId;
      } catch (error) {
        console.warn('Stripe refund invoice lookup failed', error);
        transactionId = invoiceId;
      }
    } else if (paymentIntentId) {
      try {
        const sessions = await this.client.checkout.sessions.list({
          payment_intent: paymentIntentId,
          limit: 1,
        });
        const session = sessions.data[0];
        if (session) {
          transactionId = session.id;
          metadata = { ...(session.metadata || {}), ...metadata };
          if (session.client_reference_id && !metadata.order_no) {
            metadata.order_no = session.client_reference_id;
          }
        }
      } catch (error) {
        console.warn('Stripe refund checkout session lookup failed', error);
      }
    }

    const refundedTotal = Number(charge.amount_refunded || 0);
    const refundKey = `${charge.id}:${refundedTotal}`;
    return {
      provider: this.name,
      paymentStatus: PaymentStatus.SUCCESS,
      subscriptionId,
      paymentInfo: {
        transactionId,
        paymentAmount: refundedTotal,
        paymentCurrency: String(charge.currency || '').toLowerCase(),
        invoiceId: refundKey,
      },
      paymentResult: {
        id: charge.id,
        refund_id: refundKey,
        is_partial: !charge.refunded,
        refunded_total: refundedTotal,
      },
      metadata,
    };
  }

  // build payment session from invoice
  private async buildPaymentSessionFromInvoice(
    invoice: Stripe.Response<Stripe.Invoice>
  ): Promise<PaymentSession> {
    let subscription: Stripe.Response<Stripe.Subscription> | undefined =
      undefined;

    if (invoice.lines.data.length > 0) {
      const data = invoice.lines.data[0];
      let subscriptionId = '';

      // get subscription id from invoice line data
      if (data.subscription) {
        subscriptionId = data.subscription as string;
      } else if (
        data.parent &&
        data.parent.subscription_item_details &&
        data.parent.subscription_item_details.subscription
      ) {
        subscriptionId = data.parent.subscription_item_details
          .subscription as string;
      }

      if (subscriptionId) {
        subscription = await this.client.subscriptions.retrieve(subscriptionId);
      }
    }

    const result: PaymentSession = {
      provider: this.name,

      paymentStatus: PaymentStatus.SUCCESS,
      paymentInfo: {
        transactionId: invoice.id,
        discountCode: '',
        discountAmount:
          invoice.total_discount_amounts &&
          invoice.total_discount_amounts.length > 0
            ? invoice.total_discount_amounts[0].amount
            : 0,
        discountCurrency: invoice.currency || '',
        paymentAmount: invoice.amount_paid,
        paymentCurrency: invoice.currency,
        paymentEmail: invoice.customer_email || '',
        paymentUserName: invoice.customer_name || '',
        paymentUserId: invoice.customer
          ? (invoice.customer as string)
          : undefined,
        paidAt: invoice.created ? new Date(invoice.created * 1000) : undefined,
        invoiceId: invoice.id,
        invoiceUrl: invoice.hosted_invoice_url || '',
        subscriptionCycleType:
          invoice.billing_reason === 'subscription_create'
            ? SubscriptionCycleType.CREATE
            : invoice.billing_reason === 'subscription_cycle'
              ? SubscriptionCycleType.RENEWAL
              : undefined,
      },
      paymentResult: invoice,
      metadata: {
        ...(invoice.metadata || {}),
        ...(subscription?.metadata || {}),
      },
    };

    if (subscription) {
      result.subscriptionId = subscription.id;
      result.subscriptionInfo = await this.buildSubscriptionInfo(subscription);
      result.subscriptionResult = subscription;
    }

    return result;
  }

  // build payment session from invoice
  private async buildPaymentSessionFromSubscription(
    subscription: Stripe.Response<Stripe.Subscription>
  ): Promise<PaymentSession> {
    const result: PaymentSession = {
      provider: this.name,
    };

    if (subscription) {
      result.subscriptionId = subscription.id;
      result.subscriptionInfo = await this.buildSubscriptionInfo(subscription);
      result.subscriptionResult = subscription;
    }

    return result;
  }

  // build subscription info from subscription
  private async buildSubscriptionInfo(
    subscription: Stripe.Response<Stripe.Subscription>
  ): Promise<SubscriptionInfo> {
    // subscription data
    const data = subscription.items.data[0];

    const interval = data.plan.interval as PaymentInterval;
    const intervalCount = data.plan.interval_count || 1;
    const startRaw =
      typeof data.current_period_start === 'number'
        ? new Date(data.current_period_start * 1000)
        : null;
    const endRaw =
      typeof data.current_period_end === 'number'
        ? new Date(data.current_period_end * 1000)
        : null;
    const start =
      startRaw && !Number.isNaN(startRaw.getTime()) ? startRaw : new Date();
    const end = resolvePeriodEnd({
      end: endRaw && !Number.isNaN(endRaw.getTime()) ? endRaw : null,
      start,
      interval,
      intervalCount,
    });
    const subscriptionInfo: SubscriptionInfo = {
      subscriptionId: subscription.id,
      productId: data.price.product as string,
      planId: data.price.id,
      description: '',
      amount: data.price.unit_amount || 0,
      currency: data.price.currency,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      interval,
      intervalCount,
      metadata: subscription.metadata,
      // No schedule → nothing pending. With one we can't tell the target
      // without another request; the service keeps its own pending record.
      scheduledChange: subscription.schedule ? undefined : null,
    };

    if (
      subscription.status === 'active' ||
      subscription.status === 'trialing' ||
      // Dunning: Stripe keeps retrying the renewal; access stays until it
      // ends as canceled/unpaid (was an exception → endless webhook retries).
      subscription.status === 'past_due'
    ) {
      const pendingCancel =
        subscription.cancel_at || subscription.cancel_at_period_end;
      if (pendingCancel) {
        subscriptionInfo.status = SubscriptionStatus.PENDING_CANCEL;
        // cancel apply at
        subscriptionInfo.canceledAt = subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : new Date();
        // cancel end date
        subscriptionInfo.canceledEndAt = subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000)
          : subscriptionInfo.currentPeriodEnd;
        subscriptionInfo.canceledReason =
          subscription.cancellation_details?.comment || '';
        subscriptionInfo.canceledReasonType =
          subscription.cancellation_details?.feedback || '';
      } else {
        subscriptionInfo.status =
          subscription.status === 'trialing'
            ? SubscriptionStatus.TRIALING
            : SubscriptionStatus.ACTIVE;
      }
    } else if (subscription.status === 'canceled') {
      // subscription canceled
      subscriptionInfo.status = SubscriptionStatus.CANCELED;
      subscriptionInfo.canceledAt = new Date(
        (subscription.canceled_at || 0) * 1000
      );
      subscriptionInfo.canceledReason =
        subscription.cancellation_details?.comment || '';
      subscriptionInfo.canceledReasonType =
        subscription.cancellation_details?.feedback || '';
    } else if (subscription.status === 'incomplete_expired') {
      subscriptionInfo.status = SubscriptionStatus.CANCELED;
      subscriptionInfo.canceledAt = new Date();
    } else {
      // unpaid / paused / incomplete: no service until paid.
      subscriptionInfo.status = SubscriptionStatus.PAUSED;
    }

    return subscriptionInfo;
  }
}

/** Fixed Stripe Price id (from stripe_price_ids_mapping). */
export function isStripePriceId(value?: string | null): value is string {
  return typeof value === 'string' && /^price_[A-Za-z0-9]+$/.test(value);
}

/**
 * Create Stripe provider with configs
 */
export function createStripeProvider(configs: StripeConfigs): StripeProvider {
  return new StripeProvider(configs);
}

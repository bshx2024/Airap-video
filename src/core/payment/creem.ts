import { timingSafeEqual } from 'crypto';

import { resolvePeriodEnd } from './period';
import { fetchWithTimeout } from './timeout';
import {
  CheckoutSession,
  PaymentBilling,
  PaymentConfigs,
  PaymentCustomField,
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

/**
 * Creem payment provider configs
 * @docs https://docs.creem.io/
 */
export interface CreemConfigs extends PaymentConfigs {
  apiKey: string;
  signingSecret?: string;
  environment?: 'sandbox' | 'production';
}

/**
 * Creem payment provider implementation
 * @website https://creem.io/
 */
export class CreemProvider implements PaymentProvider {
  readonly name = 'creem';
  configs: CreemConfigs;

  private baseUrl: string;

  constructor(configs: CreemConfigs) {
    this.configs = configs;
    this.baseUrl =
      configs.environment === 'production'
        ? 'https://api.creem.io'
        : 'https://test-api.creem.io';
  }

  // create payment
  async createPayment({
    order,
  }: {
    order: PaymentOrder;
  }): Promise<CheckoutSession> {
    try {
      if (!order.productId) {
        throw new Error('productId is required');
      }

      // build payment payload
      const payload: any = {
        product_id: order.productId,
        request_id: order.requestId || order.orderNo || undefined,
        units: 1,
        discount_code: order.discount
          ? {
              code: order.discount.code,
            }
          : undefined,
        customer: order.customer
          ? {
              id: order.customer.id,
              email: order.customer.email,
            }
          : undefined,
        custom_fields: order.customFields
          ? order.customFields.map((customField: PaymentCustomField) => ({
              type: customField.type,
              key: customField.name,
              label: customField.label,
              optional: !customField.isRequired as boolean,
              text: customField.metadata,
            }))
          : undefined,
        success_url: order.successUrl,
        metadata: {
          ...(order.metadata || {}),
          ...(order.orderNo ? { order_no: order.orderNo } : {}),
        },
      };

      const result = await this.makeRequest('/v1/checkouts', 'POST', payload);

      // create payment failed
      if (result.error) {
        throw new Error(result.error.message || 'create payment failed');
      }

      // create payment success
      return {
        provider: this.name,
        checkoutParams: payload,
        checkoutInfo: {
          sessionId: result.id,
          checkoutUrl: result.checkout_url,
        },
        checkoutResult: result,
        metadata: order.metadata || {},
      };
    } catch (error) {
      throw error;
    }
  }

  // get payment by session id
  // @docs https://docs.creem.io/api-reference/endpoint/get-checkout
  async getPaymentSession({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<PaymentSession> {
    try {
      // retrieve payment
      const session = await this.makeRequest(
        `/v1/checkouts?checkout_id=${sessionId}`,
        'GET'
      );

      if (!session.id || !session.order) {
        throw new Error(session.error || 'get payment failed');
      }

      return await this.buildPaymentSessionFromCheckoutSession(session);
    } catch (error) {
      throw error;
    }
  }

  async getPaymentEvent({ req }: { req: Request }): Promise<PaymentEvent> {
    try {
      const rawBody = await req.text();
      const signature = req.headers.get('creem-signature') as string;

      if (!rawBody || !signature) {
        throw new Error('Invalid webhook request');
      }

      if (!this.configs.signingSecret) {
        throw new Error('Signing Secret not configured');
      }

      const computedSignature = await this.generateSignature(
        rawBody,
        this.configs.signingSecret
      );

      let sigOk = false;
      try {
        const expected = Buffer.from(computedSignature, 'hex');
        const provided = Buffer.from(signature, 'hex');
        sigOk =
          expected.length === provided.length &&
          timingSafeEqual(expected, provided);
      } catch {
        sigOk = false;
      }
      if (!sigOk) {
        throw new Error('Invalid webhook signature');
      }

      // parse the webhook payload
      const event = JSON.parse(rawBody);

      if (!event || !event.eventType) {
        throw new Error('Invalid webhook payload');
      }

      let paymentSession: PaymentSession | undefined = undefined;

      const eventType = this.mapCreemEventType(event.eventType);

      if (eventType === PaymentEventType.CHECKOUT_SUCCESS) {
        paymentSession = await this.buildPaymentSessionFromCheckoutSession(
          event.object as any
        );
      } else if (eventType === PaymentEventType.PAYMENT_SUCCESS) {
        paymentSession = await this.buildPaymentSessionFromInvoice(
          event.object as any
        );
      } else if (eventType === PaymentEventType.SUBSCRIBE_UPDATED) {
        paymentSession = await this.buildPaymentSessionFromSubscription(
          event.object as any
        );
      } else if (eventType === PaymentEventType.SUBSCRIBE_CANCELED) {
        paymentSession = await this.buildPaymentSessionFromSubscription(
          event.object as any
        );
      } else if (eventType === PaymentEventType.PAYMENT_REFUNDED) {
        paymentSession = await this.buildPaymentSessionFromRefund(
          event.object as any
        );
      }

      if (!paymentSession) {
        throw new WebhookIgnoredError(
          `No handler for creem event: ${event.eventType}`
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

  async getPaymentBilling({
    customerId,
  }: {
    customerId: string;
    returnUrl?: string;
  }): Promise<PaymentBilling> {
    try {
      const billing = await this.makeRequest('/v1/customers/billing', 'POST', {
        customer_id: customerId,
      });

      if (!billing.customer_portal_link) {
        throw new Error('get billing url failed');
      }

      return {
        billingUrl: billing.customer_portal_link,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Explicit mode — without a body Creem falls back to the store's billing
   * setting, which may be "immediate". Default: scheduled cancel at period
   * end (onExecute: cancel); `immediate` only when a higher plan replaces it.
   * @docs https://docs.creem.io/api-reference/endpoint/cancel-subscription
   */
  async cancelSubscription({
    subscriptionId,
    immediate,
  }: {
    subscriptionId: string;
    immediate?: boolean;
  }): Promise<PaymentSession> {
    const result = await this.makeRequest(
      `/v1/subscriptions/${subscriptionId}/cancel`,
      'POST',
      immediate
        ? { mode: 'immediate' }
        : { mode: 'scheduled', onExecute: 'cancel' }
    );

    if (
      !result?.canceled_at &&
      result?.status !== 'scheduled_cancel' &&
      result?.status !== 'canceled'
    ) {
      throw new Error('cancel subscription failed');
    }

    return await this.buildPaymentSessionFromSubscription(result);
  }

  /**
   * Undo a scheduled cancel (status scheduled_cancel → active).
   * @docs https://docs.creem.io/api-reference/endpoint/resume-subscription
   */
  async resumeSubscription({
    subscriptionId,
  }: {
    subscriptionId: string;
  }): Promise<PaymentSession> {
    const result = await this.makeRequest(
      `/v1/subscriptions/${encodeURIComponent(subscriptionId)}/resume`,
      'POST'
    );
    if (
      result?.status === 'scheduled_cancel' ||
      result?.status === 'canceled'
    ) {
      throw new Error('Resume subscription failed');
    }
    return await this.buildPaymentSessionFromSubscription(result);
  }

  /**
   * Creem switches plans immediately only (no "next period" option), so
   * this is used for upgrades; downgrades go through a scheduled cancel.
   * @docs https://docs.creem.io/api-reference/endpoint/upgrade-subscription
   */
  async changeSubscriptionPlan(
    params: PlanChangeParams
  ): Promise<PlanChangeResult> {
    if (params.timing !== 'immediate') {
      throw new Error('Plan change at period end is not supported by Creem');
    }
    const result = await this.makeRequest(
      `/v1/subscriptions/${params.subscriptionId}/upgrade`,
      'POST',
      {
        product_id: params.productId,
        update_behavior: 'proration-charge-immediately',
      }
    );
    const session = await this.buildPaymentSessionFromSubscription(result);
    const productId =
      typeof result?.product === 'string'
        ? result.product
        : result?.product?.id;
    return {
      status: productId === params.productId ? 'applied' : 'processing',
      subscriptionInfo: session.subscriptionInfo,
      raw: result,
    };
  }

  /**
   * Current subscription (product, status, period) — lets billing reconcile
   * an upgrade whose subscription.update webhook never arrived.
   * @docs https://docs.creem.io/api-reference/endpoint/get-subscription
   */
  async getSubscription({
    subscriptionId,
  }: {
    subscriptionId: string;
  }): Promise<PaymentSession> {
    const result = await this.makeRequest(
      `/v1/subscriptions?subscription_id=${encodeURIComponent(subscriptionId)}`,
      'GET'
    );
    return this.buildPaymentSessionFromSubscription(result);
  }

  private async generateSignature(
    payload: string,
    secret: string
  ): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret);
      const messageData = encoder.encode(payload);

      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signature = await crypto.subtle.sign('HMAC', key, messageData);

      const signatureArray = new Uint8Array(signature);
      return Array.from(signatureArray)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (error: any) {
      throw new Error(`Failed to generate signature: ${error.message}`);
    }
  }

  private async makeRequest(endpoint: string, method: string, data?: any) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'x-api-key': this.configs.apiKey,
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      method,
      headers,
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    const response = await fetchWithTimeout('Creem')(url, config);
    if (!response.ok) {
      throw new Error(
        `request creem api failed with status: ${response.status}`
      );
    }

    return await response.json();
  }

  private mapCreemEventType(eventType: string): PaymentEventType {
    switch (eventType) {
      case 'checkout.completed':
        return PaymentEventType.CHECKOUT_SUCCESS;
      case 'subscription.paid':
        return PaymentEventType.PAYMENT_SUCCESS;
      case 'subscription.update':
        return PaymentEventType.SUBSCRIBE_UPDATED;
      case 'subscription.scheduled_cancel':
        return PaymentEventType.SUBSCRIBE_UPDATED;
      case 'subscription.past_due':
        return PaymentEventType.SUBSCRIBE_UPDATED;
      case 'subscription.paused':
        return PaymentEventType.SUBSCRIBE_UPDATED;
      case 'subscription.active':
        return PaymentEventType.SUBSCRIBE_UPDATED;
      case 'subscription.canceled':
        return PaymentEventType.SUBSCRIBE_CANCELED;
      case 'refund.created':
        return PaymentEventType.PAYMENT_REFUNDED;
      default:
        // not handle other event type
        // subscription.expired
        // subscription.trialing
        // dispute.created
        throw new WebhookIgnoredError(
          `Not handle creem event type: ${eventType}`
        );
    }
  }

  private mapCreemStatus(session: any): PaymentStatus {
    const status = String(session.status || '').toLowerCase();
    const order = session.order || session.last_transaction;
    const orderStatus = String(order?.status || '').toLowerCase();

    if (
      orderStatus === 'paid' ||
      status === 'paid' ||
      status === 'completed' ||
      status === 'complete'
    ) {
      return PaymentStatus.SUCCESS;
    }
    if (
      orderStatus === 'pending' ||
      status === 'pending' ||
      status === 'processing' ||
      status === 'open'
    ) {
      return PaymentStatus.PROCESSING;
    }
    if (orderStatus === 'failed' || status === 'failed') {
      return PaymentStatus.FAILED;
    }
    if (
      orderStatus === 'canceled' ||
      status === 'canceled' ||
      status === 'cancelled'
    ) {
      return PaymentStatus.CANCELED;
    }
    throw new Error(`Unknown Creem session status: ${status}/${orderStatus}`);
  }

  // build payment session from checkout session
  private async buildPaymentSessionFromCheckoutSession(
    session: any
  ): Promise<PaymentSession> {
    let subscription: any | undefined = undefined;

    if (session.subscription) {
      subscription = session.subscription;
    }

    const order = session.order;

    const result: PaymentSession = {
      provider: this.name,
      paymentStatus: this.mapCreemStatus(session),
      paymentInfo: {
        transactionId: order?.transaction || order?.id,
        amount: order?.amount || 0,
        currency: order?.currency || '',
        discountCode: await this.resolveDiscountCode(order?.discount),
        discountAmount: order?.discount_amount || 0,
        discountCurrency: order?.currency || '',
        subtotalAmount: this.subtotalOf(order),
        paymentAmount: this.paidAmountOf(order),
        paymentCurrency: order?.currency || '',
        paymentEmail: session.customer?.email,
        paymentUserName: session.customer?.name,
        paymentUserId: session.customer?.id,
        paidAt: order?.created_at ? new Date(order.created_at) : undefined,
        invoiceId: '', // todo: invoice id
        invoiceUrl: '',
      },
      paymentResult: session,
      metadata: session.metadata,
    };

    if (subscription) {
      result.subscriptionId = subscription.id;
      result.subscriptionInfo = await this.buildSubscriptionInfo(
        subscription,
        session.product
      );
      result.subscriptionResult = subscription;
    }

    return result;
  }

  // Absent amount_paid = not reported (undefined → verification pending);
  // a reported 0 (e.g. 100% discount) is kept as a real amount.
  private paidAmountOf(order: any): number | undefined {
    const raw = order?.amount_paid;
    if (raw === undefined || raw === null || raw === '') return undefined;
    const paid = Number(raw);
    return Number.isFinite(paid) ? paid : undefined;
  }

  private subtotalOf(order: any): number | undefined {
    const pre = Number(order?.amount);
    if (Number.isFinite(pre) && pre > 0) return pre;
    const sub = Number(order?.sub_total);
    return Number.isFinite(sub) && sub > 0 ? sub : undefined;
  }

  private async resolveDiscountCode(discount: any): Promise<string> {
    if (!discount) return '';
    if (typeof discount === 'object') {
      return String(discount.code || discount.name || discount.id || '');
    }
    try {
      const found = await this.makeRequest(
        `/v1/discounts?discount_id=${encodeURIComponent(String(discount))}`,
        'GET'
      );
      return String(found?.code || found?.name || discount);
    } catch {
      return String(discount);
    }
  }

  private async buildPaymentSessionFromRefund(
    refund: any
  ): Promise<PaymentSession> {
    const order = refund.order || refund.transaction || refund;
    const requestId =
      order?.request_id || refund.request_id || order?.id || refund.id || '';
    return {
      provider: this.name,
      paymentStatus: PaymentStatus.SUCCESS,
      paymentInfo: {
        transactionId:
          order?.transaction || order?.id || refund.transaction || refund.id,
        // refund_amount: this refund (cents); else the paid total.
        paymentAmount:
          refund.refund_amount ??
          (order?.amount_paid || order?.amount || refund.amount || 0),
        paymentCurrency: String(
          refund.refund_currency || order?.currency || refund.currency || ''
        ).toLowerCase(),
        invoiceId: refund.id || order?.id,
        paidAt: refund.created_at ? new Date(refund.created_at) : new Date(),
      },
      paymentResult: {
        ...refund,
        id: requestId || refund.id,
        orderNo: requestId,
      },
      metadata: {
        ...(refund.metadata || {}),
        ...(order?.request_id ? { order_no: order.request_id } : {}),
        ...(refund.request_id ? { order_no: refund.request_id } : {}),
      },
    };
  }

  // build payment session from subscription session
  private async buildPaymentSessionFromInvoice(
    invoice: any
  ): Promise<PaymentSession> {
    const order = invoice.order || invoice.last_transaction;

    const subscription = invoice.subscription || invoice;

    const subscriptionCreatedAt = new Date(subscription.created_at);
    const currentPeriodStartAt = new Date(
      subscription.current_period_start_date
    );
    const timeDiff =
      currentPeriodStartAt.getTime() - subscriptionCreatedAt.getTime();

    // Creem often delivers the first `subscription.paid` minutes after
    // `created_at`. A 5s window mislabels that first invoice as a renewal.
    // Prefer CREATE within the first day; service-layer still guards via
    // whether the original checkout order is already paid.
    const cycleType =
      !Number.isFinite(timeDiff) || timeDiff < 24 * 60 * 60 * 1000
        ? SubscriptionCycleType.CREATE
        : SubscriptionCycleType.RENEWAL;

    const result: PaymentSession = {
      provider: this.name,
      paymentStatus: this.mapCreemStatus(invoice),
      paymentInfo: {
        description: order?.description,
        amount: order?.amount || 0,
        currency: order?.currency || '',
        transactionId: order?.transaction || order?.id,
        discountCode: await this.resolveDiscountCode(order?.discount),
        discountAmount: order?.discount_amount || 0,
        discountCurrency: order?.currency || '',
        subtotalAmount: this.subtotalOf(order),
        paymentAmount: this.paidAmountOf(order),
        paymentCurrency: order?.currency || '',
        paymentEmail: invoice.customer?.email,
        paymentUserName: invoice.customer?.name,
        paymentUserId: invoice.customer?.id,
        paidAt: order?.created_at ? new Date(order.created_at) : undefined,
        invoiceId: '', // todo: invoice id
        invoiceUrl: '',
        subscriptionCycleType: cycleType,
      },
      paymentResult: invoice,
      metadata: {
        ...(invoice.metadata || {}),
        ...(subscription?.metadata || {}),
        ...(order?.request_id ? { order_no: order.request_id } : {}),
        ...(invoice.request_id ? { order_no: invoice.request_id } : {}),
      },
    };

    if (subscription) {
      result.subscriptionId = subscription.id;
      result.subscriptionInfo = await this.buildSubscriptionInfo(
        subscription,
        subscription.product
      );
      result.subscriptionResult = subscription;
    }

    return result;
  }

  // build payment session from subscription
  private async buildPaymentSessionFromSubscription(
    subscription: any
  ): Promise<PaymentSession> {
    const result: PaymentSession = {
      provider: this.name,
    };

    if (subscription) {
      result.subscriptionId = subscription.id;
      result.subscriptionInfo = await this.buildSubscriptionInfo(
        subscription,
        subscription.product
      );
      result.subscriptionResult = subscription;
    }

    return result;
  }

  // build subscription info from subscription
  private async buildSubscriptionInfo(
    subscription: any,
    product?: any
  ): Promise<SubscriptionInfo> {
    // Cancel/upgrade responses may carry the product as a bare id string.
    const productObj = product && typeof product === 'object' ? product : null;
    const { interval, count: intervalCount } = productObj?.billing_period
      ? this.mapCreemInterval(productObj)
      : { interval: undefined, count: undefined };
    product = productObj || { id: typeof product === 'string' ? product : '' };

    const startRaw = subscription.current_period_start_date
      ? new Date(subscription.current_period_start_date)
      : null;
    const endRaw = subscription.current_period_end_date
      ? new Date(subscription.current_period_end_date)
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
      productId: product?.id || undefined,
      planId: '',
      description: product?.description,
      amount: product?.price,
      currency: product?.currency,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      interval: interval,
      intervalCount: intervalCount,
      metadata: subscription.metadata,
    };

    if (subscription.status === 'scheduled_cancel') {
      subscriptionInfo.status = SubscriptionStatus.PENDING_CANCEL;
      subscriptionInfo.canceledAt = subscription.canceled_at
        ? new Date(subscription.canceled_at)
        : new Date();
      subscriptionInfo.canceledEndAt = subscriptionInfo.currentPeriodEnd;
    } else if (subscription.status === 'past_due') {
      subscriptionInfo.status = SubscriptionStatus.PAUSED;
    } else if (subscription.status === 'active') {
      if (subscription.cancel_at) {
        subscriptionInfo.status = SubscriptionStatus.PENDING_CANCEL;
        // cancel apply at
        subscriptionInfo.canceledAt = new Date(subscription.canceled_at);
        subscriptionInfo.canceledEndAt = new Date(subscription.cancel_at);
      } else {
        subscriptionInfo.status = SubscriptionStatus.ACTIVE;
      }
    } else if (subscription.status === 'canceled') {
      // subscription canceled
      subscriptionInfo.status = SubscriptionStatus.CANCELED;
      subscriptionInfo.canceledAt = new Date(subscription.canceled_at);
    } else if (subscription.status === 'trialing') {
      subscriptionInfo.status = SubscriptionStatus.TRIALING;
    } else if (subscription.status === 'paused') {
      subscriptionInfo.status = SubscriptionStatus.PAUSED;
    } else {
      throw new Error(
        `Unknown Creem subscription status: ${subscription.status}`
      );
    }

    return subscriptionInfo;
  }

  private mapCreemInterval(product: any): {
    interval: PaymentInterval;
    count: number;
  } {
    if (!product || !product.billing_period) {
      throw new Error('Invalid product');
    }

    switch (product.billing_period) {
      case 'every-month':
        return {
          interval: PaymentInterval.MONTH,
          count: 1,
        };
      case 'every-three-months':
        return {
          interval: PaymentInterval.MONTH,
          count: 3,
        };
      case 'every-six-months':
        return {
          interval: PaymentInterval.MONTH,
          count: 6,
        };
      case 'every-year':
        return {
          interval: PaymentInterval.YEAR,
          count: 1,
        };
      case 'once':
        return {
          interval: PaymentInterval.ONE_TIME,
          count: 1,
        };
      default:
        throw new Error(
          `Unknown Creem product billing period: ${product.billing_period}`
        );
    }
  }
}

/**
 * Create Creem provider with configs
 */
export function createCreemProvider(configs: CreemConfigs): CreemProvider {
  return new CreemProvider(configs);
}

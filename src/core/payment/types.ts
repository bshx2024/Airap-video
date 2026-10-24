/**
 * Payment price interface
 */
export interface PaymentPrice {
  amount: number;
  currency: string;
}

/**
 * Payment discount interface
 */
export interface PaymentDiscount {
  code: string;
}

/**
 * Payment customer interface
 */
export interface PaymentCustomer {
  id?: string;
  email?: string;
  name?: string;
  metadata?: Record<string, any>;
}

export interface PaymentCustomField {
  type: string;
  name: string;
  label: string;
  isRequired?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Payment product interface
 */
export interface PaymentProduct {
  id: string;
  name?: string;
  description?: string;
  price: PaymentPrice;
  metadata?: Record<string, any>;
}

export enum PaymentType {
  ONE_TIME = 'one-time',
  SUBSCRIPTION = 'subscription',
  RENEW = 'renew',
}

export enum PaymentInterval {
  ONE_TIME = 'one-time',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export enum PaymentStatus {
  PROCESSING = 'processing', // processing means waiting for payment
  // final status
  SUCCESS = 'paid', // paid means payment success
  FAILED = 'failed', // failed means payment failed
  CANCELED = 'canceled', // canceled means payment canceled
}

/**
 * Payment subscription plan interface
 */
export interface PaymentPlan {
  id?: string;
  name: string;
  description?: string;
  interval: PaymentInterval;
  intervalCount?: number;
  trialPeriodDays?: number;
  metadata?: Record<string, any>;
}

/**
 * Payment order interface for create payment
 */
export interface PaymentOrder {
  type?: PaymentType; // optional
  orderNo?: string; // order no
  productId?: string; // create product first
  requestId?: string; // request id
  price?: PaymentPrice; // required if productId is not provided
  discount?: PaymentDiscount; // discount code
  quantity?: number; // quantity
  customer?: PaymentCustomer;
  description?: string; // checkout description
  successUrl?: string;
  cancelUrl?: string;
  locale?: string;
  metadata?: Record<string, any>;
  plan?: PaymentPlan; // required for subscription
  // false = hide the provider's promotion-code field for this checkout.
  // Default: allowed (provider-validated discounts are verified against the
  // reported subtotal in verifyPaidAmount).
  allowPromotionCodes?: boolean;
  customFields?: PaymentCustomField[]; // optional for custom fields
}

/**
 * Checkout info interface
 */
export interface CheckoutInfo {
  sessionId: string;
  checkoutUrl: string;
}

export enum SubscriptionCycleType {
  CREATE = 'create',
  RENEWAL = 'renew',
}

/**
 * Payment info interface
 */
export interface PaymentInfo {
  description?: string;
  transactionId?: string;
  amount?: number;
  currency?: string;
  discountCode?: string;
  discountAmount?: number;
  discountCurrency?: string;
  // Pre-discount amount the provider priced the order at (minor units).
  // When present (Stripe/Creem/PayPal), verifyPaidAmount uses subtotal rules.
  subtotalAmount?: number;
  // Amount actually paid (minor units). `undefined` = provider did not report
  // it (verifyPaidAmount treats that as pending); 0 is a real amount.
  paymentAmount: number | undefined;
  paymentCurrency: string;
  paymentEmail?: string;
  paymentUserName?: string;
  paymentUserId?: string;
  paidAt?: Date;
  invoiceId?: string;
  invoiceUrl?: string;
  subscriptionCycleType?: SubscriptionCycleType;
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PENDING_CANCEL = 'pending_cancel',
  CANCELED = 'canceled',
  TRIALING = 'trialing',
  EXPIRED = 'expired',
  PAUSED = 'paused',
}

export interface SubscriptionInfo {
  subscriptionId: string;
  planId?: string;
  productId?: string;
  description?: string;
  amount?: number;
  currency?: string;
  interval?: PaymentInterval;
  intervalCount?: number;
  trialPeriodDays?: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  billingUrl?: string;
  metadata?: Record<string, any>;
  status?: SubscriptionStatus;
  canceledAt?: Date; // cancel apply at
  canceledReason?: string; // cancel reason
  canceledReasonType?: string; // cancel reason type
  canceledEndAt?: Date; // cancel end at
  /**
   * The provider reports the customer resumed a scheduled cancel (Waffo
   * `subscription.uncanceled`, e.g. from its customer portal).
   */
  resumed?: boolean;
  /**
   * Plan change the provider has scheduled for a later date.
   * `null` = provider reports none; `undefined` = provider did not say.
   * `productId` is the provider's product/price id (not the catalog id).
   */
  scheduledChange?: { productId?: string; effectiveAt?: Date } | null;
}

/** When a plan change takes effect. */
export type PlanChangeTiming = 'immediate' | 'period_end';

export interface PlanChangeParams {
  /** Provider subscription id (subscription.subscriptionId). */
  subscriptionId: string;
  /** Provider product id (Creem/Dodo/Waffo) or Stripe Price id. */
  productId: string;
  timing: PlanChangeTiming;
  /** Our order number, for providers that open a new order (Waffo). */
  orderNo?: string;
  customer?: PaymentCustomer;
  currency?: string;
  locale?: string;
  successUrl?: string;
  metadata?: Record<string, string>;
}

export interface PlanChangeResult {
  /**
   * applied          — already switched at the provider (immediate upgrade)
   * processing       — accepted, switch lands with a webhook (payment pending)
   * scheduled        — switch booked for `effectiveAt` (end of period)
   * confirm_required — customer must confirm on `confirmUrl` (Waffo)
   * failed           — an earlier change's payment failed; nothing changed
   *                    (Dodo 409 PendingPlanChangeExists being released)
   */
  status:
    | 'applied'
    | 'processing'
    | 'scheduled'
    | 'confirm_required'
    | 'failed';
  effectiveAt?: Date;
  /** Stripe subscription schedule id (needed to undo). */
  scheduleId?: string;
  confirmUrl?: string;
  sessionId?: string;
  subscriptionInfo?: SubscriptionInfo;
  raw?: any;
}

/**
 * Checkout session interface
 */
export interface CheckoutSession {
  provider: string;

  checkoutParams: any; // checkout request params
  checkoutInfo: CheckoutInfo; // checkout info after checkout success
  checkoutResult: any; // provider checkout result

  metadata: any;
}

/**
 * Payment session interface
 */
export interface PaymentSession {
  provider: string;

  // payment info
  paymentStatus?: PaymentStatus; // payment status
  paymentInfo?: PaymentInfo; // payment info after payment success
  paymentResult?: any; // provider payment result

  // subscription info
  subscriptionId?: string;
  subscriptionInfo?: SubscriptionInfo; // subscription info after subscription success
  subscriptionResult?: any; // provider subscription result

  metadata?: any;

  /** Hosted plan-change outcome (Waffo plan_change_* webhooks). */
  planChange?: ProviderPlanChange;
}

/**
 * Outcome of a plan change the customer confirmed on the provider's page.
 * scheduled — confirmed, switches at `effectiveAt` (next period)
 * applied   — the new plan is live
 * failed    — did not complete; the current plan stays
 */
export interface ProviderPlanChange {
  state: 'scheduled' | 'applied' | 'failed';
  /** Provider order id of the NEW subscription (Waffo ORD_xxx). */
  providerOrderId: string;
  /** Our order number carried through checkout (orderMerchantExternalId). */
  merchantOrderNo?: string;
  /** Our user id (buyerIdentity / merchantProvidedBuyerIdentity). */
  buyerIdentity?: string;
  effectiveAt?: Date;
}

/** Result of actively asking the provider about a plan-change session. */
export interface PlanChangeStatusResult {
  /** none = not confirmed (yet); others as ProviderPlanChange.state */
  state: 'none' | 'scheduled' | 'applied' | 'failed';
  /** New subscription order, when the provider exposed it. */
  providerOrderId?: string;
  effectiveAt?: Date;
  /** Provider status of the origin subscription (Waffo: canceling). */
  originStatus?: string;
  /** Raw provider answers (no secrets), for troubleshooting. */
  debug?: Record<string, unknown>;
}

export enum PaymentEventType {
  CHECKOUT_SUCCESS = 'checkout.success', // checkout success
  PAYMENT_SUCCESS = 'payment.success', // payment success
  PAYMENT_FAILED = 'payment.failed', // payment failed
  PAYMENT_REFUNDED = 'payment.refunded', // payment refunded
  SUBSCRIBE_UPDATED = 'subscribe.updated', // subscription updated
  SUBSCRIBE_CANCELED = 'subscribe.canceled', // subscription canceled
  PLAN_CHANGE = 'plan.change', // hosted plan change scheduled / failed
}

export interface EventInfo {}

/**
 * Thrown when a webhook is authentic but carries an event this app does not
 * process (unknown event type, or one with no handler). The webhook route acks
 * these with 2xx so the provider stops redelivering them; every other error is
 * a real failure and must return a non-2xx so the provider retries.
 */
export class WebhookIgnoredError extends Error {
  // Duck-typed marker: `instanceof` is unreliable when the class is duplicated
  // across bundle chunks (Workers builds), so isWebhookIgnored checks this too.
  readonly webhookIgnored = true;

  constructor(message: string) {
    super(message);
    this.name = 'WebhookIgnoredError';
  }
}

export function isWebhookIgnored(error: unknown): boolean {
  return (
    error instanceof WebhookIgnoredError ||
    (typeof error === 'object' &&
      error !== null &&
      (error as { webhookIgnored?: boolean }).webhookIgnored === true)
  );
}

/**
 * Payment event interface
 */
export interface PaymentEvent {
  eventType: PaymentEventType;
  eventResult: any; // provider event result

  paymentSession?: PaymentSession;
}

export interface PaymentInvoice {
  invoiceId: string;
  invoiceUrl?: string;
  amount?: number;
  currency?: string;
}

export interface PaymentBilling {
  billingUrl?: string;
}

/**
 * Payment configs interface
 */
export interface PaymentConfigs {
  [key: string]: any;
}

/**
 * Payment provider interface
 */
export interface PaymentProvider {
  // provider name
  readonly name: string;

  // provider configs
  configs: PaymentConfigs;

  // create payment
  createPayment({ order }: { order: PaymentOrder }): Promise<CheckoutSession>;

  // get payment session
  getPaymentSession({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<PaymentSession>;

  // get payment event from webhook notification
  getPaymentEvent({ req }: { req: Request }): Promise<PaymentEvent>;

  // get payment invoice
  getPaymentInvoice?({
    invoiceId,
  }: {
    invoiceId: string;
  }): Promise<PaymentInvoice>;

  // get payment billing
  getPaymentBilling?({
    customerId,
    returnUrl,
  }: {
    customerId: string;
    returnUrl?: string;
  }): Promise<PaymentBilling>;

  // cancel subscription. Default: at the end of the current period (the
  // customer keeps the plan until then, no refund). `immediate: true` ends it
  // now — only used when a newer, higher plan replaces it.
  cancelSubscription?({
    subscriptionId,
    immediate,
  }: {
    subscriptionId: string;
    immediate?: boolean;
  }): Promise<PaymentSession>;

  // undo a scheduled (period-end) cancel: the subscription renews again
  resumeSubscription?({
    subscriptionId,
    buyerIdentity,
    productId,
  }: {
    subscriptionId: string;
    /** Waffo: our user id for issueSessionToken (buyerIdentity). */
    buyerIdentity?: string;
    /** Waffo: PROD_xxx for issueSessionToken (store derived from product). */
    productId?: string;
  }): Promise<PaymentSession>;

  // switch plan in place (upgrade now / downgrade at period end)
  changeSubscriptionPlan?(params: PlanChangeParams): Promise<PlanChangeResult>;

  // undo a plan change scheduled with changeSubscriptionPlan(period_end)
  cancelScheduledPlanChange?(params: {
    subscriptionId: string;
    scheduleId?: string | null;
  }): Promise<void>;

  // ask the provider whether a hosted plan change (our order number) was
  // confirmed — reconciliation when the webhook is late or missing
  getPlanChangeStatus?(params: {
    orderNo: string;
    /** provider id of the subscription being changed */
    originOrderId?: string | null;
  }): Promise<PlanChangeStatusResult>;

  // current state of a subscription at the provider — reconciliation when
  // its update webhook is late or missing (e.g. a processing upgrade)
  getSubscription?(params: { subscriptionId: string }): Promise<PaymentSession>;

  // a paid renewal starting at/after `after`, as the renewal webhook would
  // report it (same transaction / dedupe key) — reconciliation when that
  // webhook is lost; null while the subscription has not renewed
  getRenewalSession?(params: {
    subscriptionId: string;
    after: Date;
    /** Our order no that started the subscription (Waffo lists payments by it). */
    orderRef?: string;
  }): Promise<PaymentSession | null>;
}

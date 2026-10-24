import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  like,
  ne,
  or,
} from 'drizzle-orm';

import { db } from '@/core/db';
import {
  AlipayProvider,
  CreemProvider,
  DodoProvider,
  PaymentManager,
  StripeProvider,
  WaffoProvider,
  WechatPayProvider,
} from '@/core/payment';
import { isStalePeriodEnd, resolvePeriodEnd } from '@/core/payment/period';
import {
  PaymentEventType,
  PaymentStatus,
  PaymentType,
  SubscriptionCycleType,
  type CheckoutSession,
  type PaymentEvent,
  type PaymentOrder,
} from '@/core/payment/types';
import { credit, order, subscription } from '@/config/db/schema';
import {
  getPricingProduct,
  getSubscriptionTier,
  parseProductIdsMapping,
  resolveCatalogIdFromProviderProductId,
  resolveMappedProviderProductId,
  resolvePricingPlanAction,
  upgradeCreditsDelta,
} from '@/config/pricing';
import { getAllConfigs } from '@/modules/config/service';
import {
  calculateCreditExpirationTime,
  reclaimCreditsForOrder,
} from '@/modules/credits/service';
import { notifyPaymentSuccess } from '@/modules/notify/service';
import {
  findByProviderSubscriptionId,
  findBySubscriptionNo,
  SubscriptionStatus,
  updateBySubscriptionNo,
} from '@/modules/subscriptions/service';
import { getSnowId, getUniSeq, getUuid, md5 } from '@/lib/hash';
import { baseLocale, locales, localizeUrl } from '@/paraglide/runtime.js';

import { checkoutFieldsForStorage } from './checkout-storage';
import {
  grantOrderCreditsOnce,
  insertIgnoringConflict,
  paymentAffectedRows,
} from './order-credits';
import {
  CLEARED_PENDING_CHANGE,
  CYCLE_RESET_MIN_MS,
  isBillingCycleReset,
  isConfirmedWaffoScheduleId,
  isPendingChangeDue,
  isRenewalCoveredByScheduledChange,
  isReplacedByPlanChange,
  isStaleProcessingUpgrade,
  isUpgradeInProgress,
  isWaffoOrderId,
  parseWaffoPlanChangeMarker,
  PendingChangeType,
  pickConfirmedWaffoPlanChange,
  planFieldsFor,
  proratedCycleResetCredits,
  proratedSameCycleCredits,
  recentWaffoPlanChangeOrders,
  RENEWAL_SKEW_MS,
  REPLACEABLE_SUBSCRIPTION_STATUSES,
  replacedSubscriptionAction,
  resolveRenewalProductId,
  resumeMode,
  shouldKeepUserCancel,
  shouldPreservePlanChangeCancel,
  UPGRADE_IN_PROGRESS_CANCEL_ERROR,
  WAFFO_CONFIRMED_PREFIX,
} from './plan-change';
import { planRefund, shouldPreserveRefundCancel } from './refund';
import {
  listRecentWaffoPlanChangeOrders,
  markWaffoPlanChangeOrdersSuperseded,
  updateWaffoPlanChangeMarker,
} from './waffo-plan-change';
import { applyWaffoPlanChangeOutcome } from './waffo-plan-change-outcome';

export { paymentAffectedRows };

// --- Order types ---

enum OrderStatus {
  PENDING = 'pending',
  CREATED = 'created',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REFUNDED = 'refunded',
  // Provider reported success but paid amount/currency does not cover the order.
  ABNORMAL = 'abnormal',
}

/** Statuses that may still transition to paid (soft-decline then succeed). */
const FULFILLABLE_ORDER_STATUSES = [
  OrderStatus.CREATED,
  OrderStatus.PENDING,
  OrderStatus.FAILED,
  OrderStatus.CANCELED,
] as const;

/**
 * Provider says "paid" but amount/currency still unknown after one re-query.
 * Webhook → non-2xx so provider redelivers; callback → keeps polling.
 */
export class PaymentAmountPendingError extends Error {
  constructor(orderNo: string) {
    super(`payment amount pending for order ${orderNo}`);
    this.name = 'PaymentAmountPendingError';
  }
}

export function isPaymentAmountPendingError(
  error: unknown
): error is PaymentAmountPendingError {
  return (
    error instanceof PaymentAmountPendingError ||
    (error instanceof Error && error.name === 'PaymentAmountPendingError')
  );
}

type AmountVerdict = {
  ok: boolean;
  reason?:
    | 'amount_short'
    | 'subtotal_short'
    | 'discount_mismatch'
    | 'currency_mismatch'
    | 'amount_unknown';
  expected: number;
  expectedCurrency: string;
  paid: number | null;
  paidCurrency: string;
  subtotal?: number | null;
  discount?: number;
  info?: any;
};

function pickAmount(v: any): number | null {
  return v === undefined ||
    v === null ||
    v === '' ||
    !Number.isFinite(Number(v))
    ? null
    : Number(v);
}

function reportedPaid(provider: string, info: any) {
  const platformCoupon = provider === 'alipay' || provider === 'wechat';
  const amount = platformCoupon
    ? (pickAmount(info?.amount) ?? pickAmount(info?.paymentAmount))
    : pickAmount(info?.paymentAmount);
  const currency = String(info?.paymentCurrency || info?.currency || '')
    .trim()
    .toLowerCase();
  return { amount, currency };
}

async function verifyPaidAmount(
  existingOrder: any,
  session: any,
  provider: string
): Promise<AmountVerdict> {
  const expected = Number(existingOrder.amount || 0);
  const expectedCurrency = String(existingOrder.currency || '')
    .trim()
    .toLowerCase();
  const base = { expected, expectedCurrency };
  if (
    existingOrder.paymentType === PaymentType.SUBSCRIPTION ||
    existingOrder.paymentType === 'subscription' ||
    expected <= 0
  ) {
    return { ok: true, ...base, paid: null, paidCurrency: '' };
  }

  let { amount, currency } = reportedPaid(provider, session.paymentInfo);
  let info = session.paymentInfo;
  // 0 is a real paid amount (e.g. 100% promo). Only null/missing triggers re-query.
  if (amount === null || !currency) {
    try {
      const pm = await getPaymentManager();
      const p = pm.getProvider(existingOrder.paymentProvider || provider);
      const sessionId =
        p?.name === 'waffo'
          ? existingOrder.orderNo
          : existingOrder.paymentSessionId || existingOrder.orderNo;
      const fresh = p ? await p.getPaymentSession({ sessionId }) : null;
      if (fresh?.paymentStatus === PaymentStatus.SUCCESS && fresh.paymentInfo) {
        const r = reportedPaid(provider, fresh.paymentInfo);
        if (r.amount !== null) amount = r.amount;
        if (r.currency) currency = r.currency;
        info = fresh.paymentInfo;
      }
    } catch (error) {
      console.error('[payment] amount re-query failed', {
        orderNo: existingOrder.orderNo,
        provider,
        error: (error as any)?.message || String(error),
      });
    }
  }

  if (amount === null || !currency) {
    return {
      ok: false,
      reason: 'amount_unknown',
      ...base,
      paid: amount,
      paidCurrency: currency,
    };
  }

  const discount = Math.max(0, pickAmount(info?.discountAmount) ?? 0);
  const discountCurrency = String(info?.discountCurrency || '')
    .trim()
    .toLowerCase();
  const subtotal = pickAmount(info?.subtotalAmount);
  const detail = {
    ...base,
    paid: amount,
    paidCurrency: currency,
    subtotal,
    discount,
    info,
  };
  if (
    (expectedCurrency && currency !== expectedCurrency) ||
    (discount > 0 && discountCurrency && discountCurrency !== currency)
  ) {
    return { ok: false, reason: 'currency_mismatch', ...detail };
  }
  if (subtotal !== null && subtotal > 0) {
    if (subtotal < expected) {
      return { ok: false, reason: 'subtotal_short', ...detail };
    }
    if (amount + discount < subtotal) {
      return { ok: false, reason: 'discount_mismatch', ...detail };
    }
    return { ok: true, ...detail };
  }
  if (amount < expected) {
    return { ok: false, reason: 'amount_short', ...detail };
  }
  return { ok: true, ...detail };
}

async function markAmountMismatch(
  existingOrder: any,
  session: any,
  verdict: AmountVerdict
) {
  let prior: any = {};
  try {
    prior =
      typeof session.paymentResult === 'object' && session.paymentResult
        ? session.paymentResult
        : {};
  } catch {
    prior = {};
  }
  const result = await db()
    .update(order)
    .set({
      status: OrderStatus.ABNORMAL,
      paymentAmount: verdict.paid ?? null,
      paymentCurrency: verdict.paidCurrency || null,
      transactionId: session.paymentInfo?.transactionId || null,
      discountCode: verdict.info?.discountCode || null,
      discountAmount: verdict.info?.discountAmount ?? null,
      paymentResult: JSON.stringify({
        ...prior,
        amount_mismatch: {
          reason: verdict.reason,
          expected: verdict.expected,
          expectedCurrency: verdict.expectedCurrency,
          paid: verdict.paid,
          paidCurrency: verdict.paidCurrency,
          subtotal: verdict.subtotal ?? null,
          discount: verdict.discount ?? 0,
          discountCode: verdict.info?.discountCode || null,
          at: new Date().toISOString(),
        },
      }),
    })
    .where(
      and(
        eq(order.id, existingOrder.id),
        inArray(order.status, [OrderStatus.CREATED, OrderStatus.PENDING])
      )
    );
  console.error('[payment] amount mismatch, order not fulfilled', {
    orderNo: existingOrder.orderNo,
    provider: existingOrder.paymentProvider,
    reason: verdict.reason,
    expected: verdict.expected,
    expectedCurrency: verdict.expectedCurrency,
    paid: verdict.paid,
    paidCurrency: verdict.paidCurrency,
    subtotal: verdict.subtotal ?? null,
    discount: verdict.discount ?? 0,
    marked: paymentAffectedRows(result) === 1,
  });
}

// --- Payment Manager ---

let manager: PaymentManager | null = null;
let managerConfigHash = '';

export async function getPaymentManager(
  preloaded?: Record<string, string>
): Promise<PaymentManager> {
  const configs = preloaded ?? (await getAllConfigs());
  const c = (key: string) => configs[key] || '';

  // Rebuild manager if provider configs changed
  const hash = JSON.stringify([
    c('stripe_secret_key') || c('stripe_api_key'),
    c('creem_enabled'),
    c('creem_api_key'),
    c('waffo_enabled'),
    c('waffo_merchant_id'),
    c('waffo_private_key'),
    c('waffo_environment'),
    c('dodo_enabled'),
    c('dodo_api_key'),
    c('dodo_webhook_key'),
    c('dodo_environment'),
    c('alipay_app_id'),
    c('wechat_mch_id'),
    c('default_payment_provider'),
  ]);
  if (manager && hash === managerConfigHash) return manager;

  manager = new PaymentManager();
  managerConfigHash = hash;

  const stripeKey = c('stripe_secret_key') || c('stripe_api_key');
  if (stripeKey) {
    const isDefault =
      !c('default_payment_provider') ||
      c('default_payment_provider') === 'stripe';
    manager.addProvider(
      new StripeProvider({
        secretKey: stripeKey,
        publishableKey: c('stripe_publishable_key'),
        signingSecret:
          c('stripe_signing_secret') || c('stripe_webhook_secret') || undefined,
        allowPromotionCodes: true,
        allowedPaymentMethods: ['card', 'wechat_pay', 'alipay'],
      }),
      isDefault
    );
  }

  if (c('creem_enabled') === 'true' && c('creem_api_key')) {
    const isDefault = c('default_payment_provider') === 'creem';
    manager.addProvider(
      new CreemProvider({
        apiKey: c('creem_api_key'),
        signingSecret: c('creem_signing_secret') || undefined,
        environment:
          c('creem_environment') === 'production' ? 'production' : 'sandbox',
      }),
      isDefault
    );
  }

  if (
    c('waffo_enabled') === 'true' &&
    c('waffo_merchant_id') &&
    c('waffo_private_key')
  ) {
    const isDefault = c('default_payment_provider') === 'waffo';
    manager.addProvider(
      new WaffoProvider({
        merchantId: c('waffo_merchant_id'),
        privateKey: c('waffo_private_key'),
        environment:
          c('waffo_environment') === 'prod'
            ? 'prod'
            : c('waffo_environment') === 'test'
              ? 'test'
              : undefined,
      }),
      isDefault
    );
  }

  if (c('dodo_enabled') === 'true' && c('dodo_api_key')) {
    const isDefault = c('default_payment_provider') === 'dodo';
    manager.addProvider(
      new DodoProvider({
        apiKey: c('dodo_api_key'),
        webhookKey: c('dodo_webhook_key') || undefined,
        environment:
          c('dodo_environment') === 'live_mode' ? 'live_mode' : 'test_mode',
      }),
      isDefault
    );
  }

  if (c('alipay_app_id') && c('alipay_private_key')) {
    const isDefault = c('default_payment_provider') === 'alipay';
    manager.addProvider(
      new AlipayProvider({
        appId: c('alipay_app_id'),
        privateKey: c('alipay_private_key'),
        alipayPublicKey: c('alipay_public_key'),
        notifyUrl: c('alipay_notify_url') || undefined,
      }),
      isDefault
    );
  }

  if (c('wechat_mch_id') && c('wechat_private_key')) {
    const isDefault = c('default_payment_provider') === 'wechat';
    manager.addProvider(
      new WechatPayProvider({
        appId: c('wechat_app_id'),
        mchId: c('wechat_mch_id'),
        apiV3Key: c('wechat_api_v3_key'),
        privateKey: c('wechat_private_key'),
        serialNo: c('wechat_serial_no'),
        notifyUrl: c('wechat_notify_url') || undefined,
        platformCert: c('wechat_platform_cert') || undefined,
      }),
      isDefault
    );
  }

  return manager;
}

// --- Checkout ---

/**
 * Providers whose checkout needs a provider product id from
 * `<provider>_product_ids_mapping`.
 */
const MAPPED_PRODUCT_PROVIDERS = ['creem', 'waffo', 'dodo'];

export function requiresMappedProviderProduct(provider?: string | null) {
  return Boolean(provider && MAPPED_PRODUCT_PROVIDERS.includes(provider));
}

/**
 * Provider name createCheckout will actually use: the requested one, else
 * the payment manager default — which is `default_payment_provider` when that
 * provider is configured, otherwise the first configured provider.
 */
export async function resolveCheckoutProviderName(
  requested?: string | null
): Promise<string | undefined> {
  if (requested) return requested;
  const pm = await getPaymentManager();
  return pm.getDefaultProvider()?.name;
}

export async function createCheckout(params: {
  userId: string;
  userEmail?: string;
  paymentOrder: PaymentOrder;
  provider?: string;
  productName?: string;
  planName?: string;
  credits?: number;
  creditsValidDays?: number;
}): Promise<CheckoutSession> {
  const {
    userId,
    userEmail,
    paymentOrder,
    provider,
    productName,
    planName,
    credits,
    creditsValidDays,
  } = params;
  const pm = await getPaymentManager();
  const orderNo = getUniSeq('ORD');
  const configs = await getAllConfigs();
  const appUrl = configs.app_url || 'http://localhost:3000';

  // Resolve provider-specific product ID (Creem / Waffo / Dodo product_ids_mapping)
  const resolvedProvider = provider || pm.getDefaultProvider()?.name;
  let resolvedProductId = paymentOrder.productId;
  if (
    requiresMappedProviderProduct(resolvedProvider) &&
    paymentOrder.productId
  ) {
    const mapping = configs[`${resolvedProvider}_product_ids_mapping`];
    let mappedProductId = '';
    if (mapping) {
      try {
        const map = JSON.parse(mapping) as Record<string, string>;
        const raw = map[paymentOrder.productId];
        mappedProductId = typeof raw === 'string' ? raw.trim() : '';
        if (mappedProductId) {
          resolvedProductId = mappedProductId;
        }
      } catch {
        // invalid JSON — treat as unmapped
      }
    }
    // Never send catalog ids to Creem/Waffo/Dodo (providers reject them raw).
    if (!mappedProductId || resolvedProductId === paymentOrder.productId) {
      throw new Error('Payment product mapping not configured');
    }
  } else if (
    resolvedProvider === 'stripe' &&
    paymentOrder.productId &&
    paymentOrder.type === PaymentType.SUBSCRIPTION
  ) {
    const priceId = resolveMappedProviderProductId(
      parseProductIdsMapping(configs.stripe_price_ids_mapping),
      paymentOrder.productId
    );
    if (priceId) resolvedProductId = priceId;
  }

  const returnLocale = (
    typeof paymentOrder.locale === 'string' &&
    locales.includes(paymentOrder.locale as (typeof locales)[number])
      ? paymentOrder.locale
      : baseLocale
  ) as typeof baseLocale;
  const localizedReturn = localizeUrl(
    `${appUrl}${
      paymentOrder.type === PaymentType.SUBSCRIPTION
        ? '/settings/billing'
        : '/settings/credits'
    }`,
    { locale: returnLocale }
  ).href;
  let destinationUrl = paymentOrder.successUrl || localizedReturn;
  try {
    const parsed = new URL(destinationUrl, appUrl);
    if (parsed.pathname.includes('/api/payment/callback')) {
      destinationUrl = parsed.searchParams.get('redirect') || localizedReturn;
    }
  } catch {
    // keep destinationUrl as-is
  }
  const callbackSuccessUrl = `${appUrl}/api/payment/callback?order_no=${orderNo}&redirect=${encodeURIComponent(destinationUrl)}`;

  const session = await pm.createPayment({
    order: {
      ...paymentOrder,
      productId: resolvedProductId,
      orderNo,
      requestId: paymentOrder.requestId || orderNo,
      successUrl: callbackSuccessUrl,
      cancelUrl:
        paymentOrder.cancelUrl || `${appUrl}/settings/billing?canceled=1`,
      metadata: {
        ...paymentOrder.metadata,
        order_no: orderNo,
        userId,
      },
    },
    provider,
  });

  await db()
    .insert(order)
    .values({
      id: getUuid(),
      orderNo,
      userId,
      userEmail: userEmail || '',
      status: OrderStatus.CREATED,
      amount: paymentOrder.price?.amount || 0,
      currency: paymentOrder.price?.currency || 'usd',
      productId: paymentOrder.productId || '',
      productName: productName || null,
      planName: planName || null,
      creditsAmount: credits ?? null,
      creditsValidDays: creditsValidDays ?? null,
      paymentType: paymentOrder.type || 'one-time',
      paymentProvider: session.provider,
      paymentSessionId: session.checkoutInfo.sessionId,
      // Waffo: no customer token (#token=…) in the stored URL/result; the
      // live URL is only returned to the browser for this redirect.
      ...checkoutFieldsForStorage(
        session.provider,
        session.checkoutInfo,
        session.checkoutResult
      ),
      description: paymentOrder.description || '',
    });

  return session;
}

// --- Payment callback (return_url) ---

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ask the provider about one order and fulfill it like its webhook would
 * (idempotent). `attempts`: polls while the payment is still processing —
 * the return_url callback waits; a background recheck asks once.
 */
export async function handlePaymentCallback(
  orderNo: string,
  { attempts = 5 }: { attempts?: number } = {}
) {
  const [existingOrder] = await db()
    .select()
    .from(order)
    .where(eq(order.orderNo, orderNo))
    .limit(1);

  if (!existingOrder) return;

  const pm = await getPaymentManager();
  const provider = pm.getProvider(existingOrder.paymentProvider);
  if (!provider) return;

  const sessionId =
    provider.name === 'waffo'
      ? existingOrder.orderNo
      : existingOrder.paymentSessionId || existingOrder.orderNo;

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const session = await provider.getPaymentSession({ sessionId });
      if (session.paymentStatus === PaymentStatus.PROCESSING) {
        throw new PaymentAmountPendingError(orderNo);
      }
      // Providers sometimes omit a stable id on failed checkouts; bind to our
      // order so handleCheckoutSuccess can still mark failed/canceled.
      const result =
        session.paymentResult && typeof session.paymentResult === 'object'
          ? session.paymentResult
          : {};
      session.paymentResult = {
        ...result,
        id: result.id || existingOrder.orderNo || sessionId,
        orderNo: result.orderNo || existingOrder.orderNo,
      };
      // Idempotent: also backfills subscription/credits if an earlier callback
      // marked the order paid before the provider subscription payload arrived.
      await handleCheckoutSuccess(session, existingOrder.paymentProvider);
      return;
    } catch (error) {
      lastError = error;
      if (isPaymentAmountPendingError(error) && attempt < attempts) {
        await sleep(attempt * 600);
        continue;
      }
      if (isPaymentAmountPendingError(error)) {
        console.warn(
          `payment amount still pending after callback polls for ${orderNo}`
        );
        return;
      }
      if (attempt < attempts) await sleep(attempt * 600);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError || 'payment callback failed'));
}

export async function handlePaymentCallbackBySessionId(sessionId: string) {
  if (!sessionId) return;
  const [existingOrder] = await db()
    .select()
    .from(order)
    .where(and(eq(order.paymentSessionId, sessionId), isNull(order.deletedAt)))
    .limit(1);
  if (!existingOrder) return;
  await handlePaymentCallback(existingOrder.orderNo);
}

async function cancelReplacedSubscriptions(params: {
  userId: string;
  keepSubscriptionNo: string;
}) {
  const [keep] = await db()
    .select()
    .from(subscription)
    .where(
      and(
        eq(subscription.subscriptionNo, params.keepSubscriptionNo),
        eq(subscription.userId, params.userId),
        isNull(subscription.deletedAt)
      )
    )
    .limit(1);
  if (!keep?.productId) return;

  const pm = await getPaymentManager();
  const others = await db()
    .select()
    .from(subscription)
    .where(
      and(
        eq(subscription.userId, params.userId),
        ne(subscription.subscriptionNo, params.keepSubscriptionNo),
        inArray(subscription.status, [...REPLACEABLE_SUBSCRIPTION_STATUSES]),
        isNull(subscription.deletedAt)
      )
    );

  const keepCreatedAt = keep.createdAt ? new Date(keep.createdAt).getTime() : 0;
  for (const sub of others) {
    const otherCreatedAt = sub.createdAt
      ? new Date(sub.createdAt).getTime()
      : 0;
    if (otherCreatedAt > keepCreatedAt) continue;

    const action = replacedSubscriptionAction(keep.productId, sub.productId);
    if (action === 'cancel_at_period_end') {
      console.warn('[payment] lower plan paid while a higher one is active', {
        userId: params.userId,
        keep: params.keepSubscriptionNo,
        keepProductId: keep.productId,
        other: sub.subscriptionNo,
        otherProductId: sub.productId,
      });
    }

    let cancelInfo: any = null;
    if (sub.subscriptionId) {
      const provider = pm.getProvider(sub.paymentProvider);
      if (provider?.cancelSubscription) {
        try {
          const canceled = await provider.cancelSubscription({
            subscriptionId: sub.subscriptionId,
            immediate: action === 'cancel_now',
          });
          cancelInfo = canceled?.subscriptionInfo || null;
        } catch (error) {
          console.error(
            `Failed to cancel previous subscription ${sub.subscriptionNo} at provider:`,
            error
          );
        }
      }
    }

    try {
      await updateBySubscriptionNo(
        sub.subscriptionNo,
        action === 'cancel_now'
          ? {
              status: SubscriptionStatus.CANCELED,
              canceledAt: new Date(),
              canceledReason: 'Replaced by plan change',
              canceledReasonType: 'plan_change',
              ...CLEARED_PENDING_CHANGE,
            }
          : {
              status: SubscriptionStatus.PENDING_CANCEL,
              canceledAt: new Date(),
              canceledEndAt: resolvePeriodEnd({
                end: cancelInfo?.canceledEndAt || sub.currentPeriodEnd,
                start: sub.currentPeriodStart,
                interval: sub.interval,
                intervalCount: sub.intervalCount,
              }),
              canceledReason: 'Replaced by a lower plan',
              canceledReasonType: 'plan_change',
              ...CLEARED_PENDING_CHANGE,
            }
      );
    } catch (error) {
      console.error(
        `Failed to mark previous subscription ${sub.subscriptionNo} canceled:`,
        error
      );
    }
  }
}

// --- Webhook handling ---

export async function handleWebhook(params: {
  req: Request;
  provider: string;
}): Promise<PaymentEvent> {
  const pm = await getPaymentManager();
  const event = await pm.getPaymentEvent({
    req: params.req,
    provider: params.provider,
  });
  const session = event.paymentSession;
  if (!session) return event;

  const eventType = event.eventType;

  // Route event to appropriate handler
  if (eventType === PaymentEventType.CHECKOUT_SUCCESS) {
    await handleCheckoutSuccess(session, params.provider);
  } else if (eventType === PaymentEventType.PAYMENT_SUCCESS) {
    if (
      session.paymentInfo?.subscriptionCycleType ===
      SubscriptionCycleType.RENEWAL
    ) {
      // First payment can be mislabeled as renewal (Waffo/Creem). Prefer
      // checkout fulfillment until the original non-renew order is paid.
      const existingSub = session.subscriptionId
        ? await findByProviderSubscriptionId({
            provider: params.provider,
            subscriptionId: session.subscriptionId,
          })
        : null;
      if (existingSub) {
        const [paidOriginal] = await db()
          .select({ id: order.id })
          .from(order)
          .where(
            and(
              eq(order.subscriptionNo, existingSub.subscriptionNo),
              ne(order.paymentType, 'renew'),
              eq(order.status, OrderStatus.PAID),
              isNull(order.deletedAt)
            )
          )
          .limit(1);
        if (paidOriginal) {
          await handleSubscriptionRenewal(session, params.provider);
        } else {
          await handleCheckoutSuccess(session, params.provider);
        }
      } else {
        await handleCheckoutSuccess(session, params.provider);
      }
    } else {
      await handleCheckoutSuccess(session, params.provider);
    }
  } else if (eventType === PaymentEventType.PAYMENT_FAILED) {
    // A prorated upgrade that did not land (Dodo prevent_change / Stripe
    // pending_if_incomplete) must not keep the billing "changes on {date}" row.
    await clearRejectedUpgradeBooking(session, params.provider);
    // Same path as callback: mark CREATED/PENDING orders failed (no fulfill).
    await handleCheckoutSuccess(session, params.provider);
  } else if (eventType === PaymentEventType.PAYMENT_REFUNDED) {
    await handlePaymentRefunded(session, params.provider);
  } else if (eventType === PaymentEventType.SUBSCRIBE_UPDATED) {
    await handleSubscriptionUpdated(session, params.provider);
  } else if (eventType === PaymentEventType.SUBSCRIBE_CANCELED) {
    await handleSubscriptionCanceled(session, params.provider);
  } else if (eventType === PaymentEventType.PLAN_CHANGE) {
    await handleProviderPlanChange(session, params.provider);
  }

  return event;
}

function collectOrderLookupIds(session: any): string[] {
  const result = session.paymentResult || {};
  const meta = {
    ...(session.metadata || {}),
    ...(result.metadata || {}),
    ...(result.object?.metadata || {}),
  };
  const ids = [
    result.id,
    result.object?.id,
    result.out_trade_no,
    result.outTradeNo,
    result.orderNo,
    result.order_no,
    result.orderMerchantExternalId,
    result.request_id,
    result.requestId,
    result.client_reference_id,
    result.object?.client_reference_id,
    meta.order_no,
    meta.orderNo,
    session.subscriptionResult?.orderNo,
    session.subscriptionResult?.order_no,
  ];
  return [
    ...new Set(
      ids.filter((v): v is string => typeof v === 'string' && v.length > 0)
    ),
  ];
}

async function findOrderForPaymentSession(session: any) {
  const ids = collectOrderLookupIds(session);
  for (const sessionId of ids) {
    const [existingOrder] = await db()
      .select()
      .from(order)
      .where(
        and(
          or(
            eq(order.paymentSessionId, sessionId),
            eq(order.orderNo, sessionId)
          ),
          isNull(order.deletedAt),
          // Never attach checkout fulfillment to a renewal row
          or(isNull(order.paymentType), ne(order.paymentType, 'renew'))
        )
      )
      .orderBy(asc(order.createdAt))
      .limit(1);
    if (existingOrder) return existingOrder;
  }

  // Fallback: original checkout order linked to this provider subscription
  if (session.subscriptionId) {
    const [bySub] = await db()
      .select()
      .from(order)
      .where(
        and(
          eq(order.subscriptionId, session.subscriptionId),
          isNull(order.deletedAt),
          or(isNull(order.paymentType), ne(order.paymentType, 'renew'))
        )
      )
      .orderBy(asc(order.createdAt))
      .limit(1);
    if (bySub) return bySub;
  }

  // Refunds often key off the provider transaction / invoice id.
  const txnId =
    session.paymentInfo?.transactionId || session.paymentInfo?.invoiceId;
  if (txnId) {
    const [byTxn] = await db()
      .select()
      .from(order)
      .where(and(eq(order.transactionId, txnId), isNull(order.deletedAt)))
      .limit(1);
    if (byTxn) return byTxn;
  }

  return null;
}

/** Refund as the provider reported it (amount in minor units). */
function refundInputFrom(session: any) {
  const result = session.paymentResult || {};
  const info = session.paymentInfo || {};
  const transactionId = info.transactionId || null;
  const rawAmount = Number(info.paymentAmount);
  const amount = Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : null;
  const id = String(
    result.refund_id ||
      result.refundId ||
      result.refundRequestId ||
      (info.invoiceId && info.invoiceId !== transactionId
        ? info.invoiceId
        : '') ||
      `${transactionId || result.id || 'refund'}:${amount ?? 'full'}`
  );
  return {
    id,
    amount,
    currency: info.paymentCurrency || null,
    isPartial: result.is_partial === true,
    refundedTotal: Number(result.refunded_total) || null,
    transactionId,
  };
}

/**
 * The order a refund belongs to: the one paid by the refunded payment
 * (renewals included), else the checkout order it references.
 */
async function findOrderForRefund(session: any) {
  const txnId = session.paymentInfo?.transactionId;
  if (txnId) {
    const [byTxn] = await db()
      .select()
      .from(order)
      .where(and(eq(order.transactionId, txnId), isNull(order.deletedAt)))
      .limit(1);
    if (byTxn) return { order: byTxn, matchedByReference: false };
  }
  const found = await findOrderForPaymentSession(session);
  return found ? { order: found, matchedByReference: true } : null;
}

function parsePaymentResult(value: unknown): Record<string, any> {
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Policy: see ./refund.ts. */
export async function handlePaymentRefunded(session: any, provider: string) {
  const match = await findOrderForRefund(session);
  if (!match) {
    console.error(
      `refund webhook [${provider}]: order not found`,
      session.paymentInfo?.transactionId || session.paymentResult?.id
    );
    return;
  }
  const existingOrder = match.order;
  const refund = refundInputFrom(session);
  const plan = planRefund({
    order: existingOrder,
    refund,
    matchedByReference: match.matchedByReference,
  });

  if (plan.action === 'skip') {
    if (plan.reason !== 'already_refunded' && plan.reason !== 'duplicate') {
      console.error(
        `refund webhook [${provider}]: order ${existingOrder.orderNo} skipped (${plan.reason})`,
        refund.transactionId
      );
    }
    return;
  }

  const previousResult = parsePaymentResult(existingOrder.paymentResult);
  const raw = session.paymentResult || session.eventResult || session;

  if (plan.action === 'partial') {
    // Keep the order paid; record the refund once (CAS on the row we read).
    await db()
      .update(order)
      .set({
        paymentResult: JSON.stringify({
          ...previousResult,
          refunds: plan.refunds,
          lastRefund: raw,
        }),
      })
      .where(
        and(eq(order.id, existingOrder.id), eq(order.status, OrderStatus.PAID))
      );
    console.log(
      `partial refund recorded [${provider}] order=${existingOrder.orderNo} refunded=${plan.refundedTotal}/${existingOrder.amount}`
    );
    return;
  }

  let claimed = false;
  let reclaimed = 0;
  await db().transaction(async (tx: any) => {
    const claimResult = await tx
      .update(order)
      .set({
        status: OrderStatus.REFUNDED,
        paymentResult: JSON.stringify({
          ...previousResult,
          refunds: plan.refunds,
          refund: raw,
        }),
      })
      .where(
        and(eq(order.id, existingOrder.id), eq(order.status, OrderStatus.PAID))
      );
    if (paymentAffectedRows(claimResult) !== 1) return;
    claimed = true;
    reclaimed = await reclaimCreditsForOrder(existingOrder.orderNo, tx);
  });
  if (!claimed) return;

  console.log(
    `refund processed [${provider}] order=${existingOrder.orderNo} reclaimed=${reclaimed}`
  );
  await endSubscriptionForRefund(existingOrder, provider);
}

/**
 * Full refund of the subscription's current-period payment: end it now and
 * stop the provider from charging again (best effort). An older period's
 * refund only reclaims that period's credits.
 */
async function endSubscriptionForRefund(refundedOrder: any, provider: string) {
  if (!refundedOrder.subscriptionNo) return;
  const sub = await findBySubscriptionNo(refundedOrder.subscriptionNo);
  if (!sub) return;
  if (
    sub.status === SubscriptionStatus.CANCELED ||
    sub.status === SubscriptionStatus.EXPIRED
  ) {
    return;
  }

  const [latest] = await db()
    .select()
    .from(order)
    .where(
      and(
        eq(order.subscriptionNo, refundedOrder.subscriptionNo),
        inArray(order.status, [OrderStatus.PAID, OrderStatus.REFUNDED]),
        isNull(order.deletedAt)
      )
    )
    .orderBy(desc(order.paidAt), desc(order.createdAt))
    .limit(1);
  if (latest && latest.id !== refundedOrder.id) return;

  const now = new Date();
  await updateBySubscriptionNo(sub.subscriptionNo, {
    status: SubscriptionStatus.CANCELED,
    canceledAt: now,
    canceledEndAt: now,
    canceledReason: `Refunded order ${refundedOrder.orderNo}`,
    canceledReasonType: 'refund',
    ...CLEARED_PENDING_CHANGE,
  });
  console.log(
    `subscription ended on refund [${provider}] sub=${sub.subscriptionNo} order=${refundedOrder.orderNo}`
  );

  try {
    const pm = await getPaymentManager();
    const p = pm.getProvider(sub.paymentProvider);
    // getProvider falls back to the default provider for unknown names.
    if (p && p.name === sub.paymentProvider && p.cancelSubscription) {
      await p.cancelSubscription({
        subscriptionId: sub.subscriptionId,
        immediate: true,
      });
    }
  } catch (error) {
    console.error(
      `refund: provider cancel failed [${provider}] sub=${sub.subscriptionNo}`,
      error
    );
  }
}

function resolveOrderCredits(existingOrder: {
  creditsAmount?: number | null;
  productId?: string | null;
}): number {
  if (existingOrder.creditsAmount && existingOrder.creditsAmount > 0) {
    return existingOrder.creditsAmount;
  }
  const productId = existingOrder.productId || '';
  if (!productId) return 0;
  return getPricingProduct(productId)?.credits || 0;
}

function renewalGrantTxnNo(params: {
  transactionId?: string | null;
  subscriptionNo: string;
  periodEnd: Date;
}) {
  if (params.transactionId) return `renew_${params.transactionId}`;
  return `renew_${params.subscriptionNo}_${params.periodEnd.getTime()}`;
}

// --- Checkout Success: update order + create subscription + grant credits ---

function isSubscriptionOrder(ord: any): boolean {
  return (
    ord?.paymentType === 'subscription' ||
    ord?.paymentType === PaymentType.SUBSCRIPTION
  );
}

/**
 * Attach the provider subscription to an order exactly once: claim the
 * order's empty subscription_no slot with a conditional UPDATE; only the
 * claimer inserts the subscription row (or links an existing one with the
 * same provider subscription id). Losers read back the winner's number.
 * Preserves video-lite credit/catalog fallbacks via resolveOrderCredits.
 */
async function attachOrderSubscription(
  tx: any,
  params: { ord: any; session: any; provider: string; paymentInfo: any }
): Promise<{ subscriptionNo: string; created: boolean }> {
  const { ord, session, provider, paymentInfo } = params;
  const subscriptionInfo = session.subscriptionInfo;

  const [existingSub] = await tx
    .select({ subscriptionNo: subscription.subscriptionNo })
    .from(subscription)
    .where(
      and(
        eq(subscription.paymentProvider, provider),
        eq(subscription.subscriptionId, session.subscriptionId),
        isNull(subscription.deletedAt)
      )
    )
    .limit(1);
  const subscriptionNo: string = existingSub?.subscriptionNo || getSnowId();

  const claim = await tx
    .update(order)
    .set({
      subscriptionNo,
      subscriptionId: session.subscriptionId,
      subscriptionResult: JSON.stringify(session.subscriptionResult),
    })
    .where(
      and(
        eq(order.id, ord.id),
        or(isNull(order.subscriptionNo), eq(order.subscriptionNo, ''))
      )
    );
  if (paymentAffectedRows(claim) !== 1) {
    const [current] = await tx
      .select({ subscriptionNo: order.subscriptionNo })
      .from(order)
      .where(eq(order.id, ord.id))
      .limit(1);
    return { subscriptionNo: current?.subscriptionNo || '', created: false };
  }
  if (existingSub) return { subscriptionNo, created: false };

  const creditsAmount =
    ord.creditsAmount && ord.creditsAmount > 0
      ? ord.creditsAmount
      : resolveOrderCredits(ord);
  const newSub: any = {
    id: getUuid(),
    subscriptionNo,
    userId: ord.userId,
    userEmail: ord.userEmail || ord.paymentEmail || '',
    status: subscriptionInfo.status || SubscriptionStatus.ACTIVE,
    paymentProvider: provider,
    subscriptionId: session.subscriptionId,
    subscriptionResult: JSON.stringify(session.subscriptionResult),
    productId: ord.productId,
    description: subscriptionInfo.description || 'Subscription Created',
    amount: subscriptionInfo.amount ?? ord.amount,
    currency: subscriptionInfo.currency || ord.currency,
    interval: subscriptionInfo.interval,
    intervalCount: subscriptionInfo.intervalCount,
    trialPeriodDays: subscriptionInfo.trialPeriodDays,
    currentPeriodStart: subscriptionInfo.currentPeriodStart,
    currentPeriodEnd: subscriptionInfo.currentPeriodEnd,
    billingUrl: subscriptionInfo.billingUrl,
    planName: ord.planName || ord.productName,
    productName: ord.productName,
    creditsAmount: creditsAmount || ord.creditsAmount,
    creditsValidDays:
      ord.creditsValidDays ||
      getPricingProduct(ord.productId || '')?.creditsValidDays ||
      null,
    paymentProductId: ord.paymentProductId,
    paymentUserId: paymentInfo?.paymentUserId,
  };
  await tx.insert(subscription).values(newSub);
  return { subscriptionNo, created: true };
}

/**
 * Idempotent repair for an order that is already paid: attach a missing
 * subscription and grant missing credits. Never re-fulfills.
 */
async function backfillPaidOrder(
  existingOrder: any,
  session: any,
  provider: string
) {
  const subscriptionInfo = session.subscriptionInfo;
  let createdSubscriptionNo: string | null = null;

  await db().transaction(async (tx: any) => {
    let subscriptionNo: string = existingOrder.subscriptionNo || '';
    if (
      !subscriptionNo &&
      isSubscriptionOrder(existingOrder) &&
      subscriptionInfo &&
      session.subscriptionId
    ) {
      const attached = await attachOrderSubscription(tx, {
        ord: existingOrder,
        session,
        provider,
        paymentInfo: session.paymentInfo,
      });
      subscriptionNo = attached.subscriptionNo;
      if (attached.created) createdSubscriptionNo = attached.subscriptionNo;
    }

    const credits = resolveOrderCredits(existingOrder);
    const granted = await grantOrderCreditsOnce(tx, {
      orderNo: existingOrder.orderNo,
      userId: existingOrder.userId,
      userEmail: existingOrder.userEmail,
      subscriptionNo,
      credits,
      transactionScene: isSubscriptionOrder(existingOrder)
        ? 'subscription'
        : 'payment',
      description: 'Grant credit',
      expiresAt: calculateCreditExpirationTime({
        creditsValidDays:
          existingOrder.creditsValidDays ||
          getPricingProduct(existingOrder.productId || '')?.creditsValidDays ||
          0,
        currentPeriodEnd: subscriptionInfo?.currentPeriodEnd,
      }),
    });
    if (
      granted &&
      (!existingOrder.creditsAmount || existingOrder.creditsAmount <= 0) &&
      credits > 0
    ) {
      await tx
        .update(order)
        .set({ creditsAmount: credits })
        .where(eq(order.id, existingOrder.id));
    }
    if (granted || createdSubscriptionNo) {
      console.warn('[payment] backfilled paid order', {
        orderNo: existingOrder.orderNo,
        provider,
        granted,
        subscriptionNo: createdSubscriptionNo,
      });
    }
  });

  if (createdSubscriptionNo) {
    await cancelReplacedSubscriptions({
      userId: existingOrder.userId,
      keepSubscriptionNo: createdSubscriptionNo,
    });
  }
}

// Idempotent: if the order is already paid but subscription/credits were missed
// (common when callback finalizes before provider subscription payload arrives),
// later webhooks still backfill the missing pieces.

// --- Payment notifications ---

/** Upper bound for the bot pushes so a slow channel can't stall a webhook. */
const PAYMENT_NOTIFY_TIMEOUT_MS = 8_000;

/**
 * Announce a newly paid order (first confirmation or renewal). Callers only
 * reach this from the request that claimed the order as paid, so duplicate
 * webhooks / callbacks never notify twice. Awaited (a floating promise is
 * dropped on Workers once the response is sent) but bounded, and it never
 * throws: a notification problem must not fail payment processing.
 */
async function notifyPaidOrder(orderNo: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      notifyPaymentSuccess(orderNo),
      new Promise<void>((resolve) => {
        timer = setTimeout(() => {
          console.warn(`[notify] payment notification timed out: ${orderNo}`);
          resolve();
        }, PAYMENT_NOTIFY_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    console.error(`[notify] payment notification failed: ${orderNo}`, error);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function handleCheckoutSuccess(session: any, provider: string) {
  // Defense: renewal payloads must never create/grant against the original order
  if (
    session.paymentInfo?.subscriptionCycleType ===
      SubscriptionCycleType.RENEWAL &&
    session.subscriptionId
  ) {
    const existingSub = await findByProviderSubscriptionId({
      provider,
      subscriptionId: session.subscriptionId,
    });
    if (existingSub) {
      await handleSubscriptionRenewal(session, provider);
      return;
    }
  }

  const existingOrder = await findOrderForPaymentSession(session);
  if (!existingOrder) return;

  // Already paid (earlier callback/webhook, or admin release): don't fulfill
  // again, only backfill what that fulfillment missed.
  if (existingOrder.status === OrderStatus.PAID) {
    if (session.paymentStatus === PaymentStatus.SUCCESS) {
      await backfillPaidOrder(existingOrder, session, provider);
    }
    return;
  }
  // Allow FAILED/CANCELED → PAID when a later payment.succeeded arrives for
  // the same order (soft decline / retry). Do not reopen refunded/abnormal.
  if (
    !FULFILLABLE_ORDER_STATUSES.includes(
      existingOrder.status as (typeof FULFILLABLE_ORDER_STATUSES)[number]
    )
  ) {
    return;
  }

  let verifiedInfo: any = null;
  if (session.paymentStatus === PaymentStatus.SUCCESS) {
    const verdict = await verifyPaidAmount(existingOrder, session, provider);
    verifiedInfo = verdict.info ?? null;
    if (!verdict.ok && verdict.reason === 'amount_unknown') {
      console.warn(
        '[payment] success without amount/currency, order left open',
        {
          orderNo: existingOrder.orderNo,
          provider,
          paid: verdict.paid,
          paidCurrency: verdict.paidCurrency,
        }
      );
      throw new PaymentAmountPendingError(existingOrder.orderNo);
    }
    if (!verdict.ok) {
      await markAmountMismatch(existingOrder, session, verdict);
      return;
    }
  }

  const paymentInfo =
    verifiedInfo && verifiedInfo !== session.paymentInfo
      ? { ...(session.paymentInfo || {}), ...verifiedInfo }
      : session.paymentInfo;
  const subscriptionInfo = session.subscriptionInfo;

  if (session.paymentStatus === PaymentStatus.SUCCESS) {
    const orderUpdate: Record<string, any> = {
      status: OrderStatus.PAID,
      paymentResult: JSON.stringify(session.paymentResult),
      // ?? keeps a verified real 0 (e.g. 100% promo); only absent → null.
      paymentAmount: paymentInfo?.paymentAmount ?? null,
      paymentCurrency: paymentInfo?.paymentCurrency || null,
      paymentEmail: paymentInfo?.paymentEmail || null,
      paidAt: paymentInfo?.paidAt || new Date(),
      transactionId: paymentInfo?.transactionId || null,
      invoiceId: paymentInfo?.invoiceId || null,
      invoiceUrl: paymentInfo?.invoiceUrl || null,
      paymentUserName: paymentInfo?.paymentUserName || null,
      paymentUserId: paymentInfo?.paymentUserId || null,
      discountCode: paymentInfo?.discountCode || null,
      discountAmount: paymentInfo?.discountAmount || null,
    };

    let fulfilledSubscriptionNo: string | null = null;

    // Claim-first: only the request whose conditional UPDATE moves the order
    // created/pending → paid fulfills it; concurrent callers see 0 rows and
    // return. D1 runs transaction(fn) as fn(db) and SQLite has no row locks,
    // so the guarded UPDATE is the real mutex.
    let paidClaimed = false;
    await db().transaction(async (tx: any) => {
      const claim = await tx
        .update(order)
        .set(orderUpdate)
        .where(
          and(
            eq(order.id, existingOrder.id),
            inArray(order.status, [...FULFILLABLE_ORDER_STATUSES])
          )
        );
      if (paymentAffectedRows(claim) !== 1) return;
      paidClaimed = true;

      // 1. Create / link subscription (guarded by the order's empty slot)
      let subscriptionNo = '';
      if (subscriptionInfo && session.subscriptionId) {
        const attached = await attachOrderSubscription(tx, {
          ord: existingOrder,
          session,
          provider,
          paymentInfo,
        });
        subscriptionNo = attached.subscriptionNo;
        if (attached.created) fulfilledSubscriptionNo = attached.subscriptionNo;
      }

      // 2. Grant credits (at most once per order); catalog fallback preserved
      const credits = resolveOrderCredits(existingOrder);
      const granted = await grantOrderCreditsOnce(tx, {
        orderNo: existingOrder.orderNo,
        userId: existingOrder.userId,
        userEmail: existingOrder.userEmail,
        subscriptionNo,
        credits,
        transactionScene: isSubscriptionOrder(existingOrder)
          ? 'subscription'
          : 'payment',
        description: 'Grant credit',
        expiresAt: calculateCreditExpirationTime({
          creditsValidDays:
            existingOrder.creditsValidDays ||
            getPricingProduct(existingOrder.productId || '')
              ?.creditsValidDays ||
            0,
          currentPeriodEnd: subscriptionInfo?.currentPeriodEnd,
        }),
      });
      if (
        granted &&
        (!existingOrder.creditsAmount || existingOrder.creditsAmount <= 0) &&
        credits > 0
      ) {
        await tx
          .update(order)
          .set({ creditsAmount: credits })
          .where(eq(order.id, existingOrder.id));
      }
    });
    if (paidClaimed) await notifyPaidOrder(existingOrder.orderNo);

    if (fulfilledSubscriptionNo && isSubscriptionOrder(existingOrder)) {
      await cancelReplacedSubscriptions({
        userId: existingOrder.userId,
        keepSubscriptionNo: fulfilledSubscriptionNo,
      });
    }
  } else if (
    session.paymentStatus === PaymentStatus.FAILED ||
    session.paymentStatus === PaymentStatus.CANCELED
  ) {
    const terminalStatus =
      session.paymentStatus === PaymentStatus.CANCELED
        ? OrderStatus.CANCELED
        : OrderStatus.FAILED;
    await db()
      .update(order)
      .set({
        status: terminalStatus,
        paymentResult: JSON.stringify(session.paymentResult),
      })
      .where(
        and(
          eq(order.id, existingOrder.id),
          inArray(order.status, [OrderStatus.CREATED, OrderStatus.PENDING])
        )
      );
  }
}

// --- Subscription Renewal ---

/**
 * Providers that report one renewal through two webhooks with different ids:
 * Dodo sends `subscription.renewed` (no payment id) and, for a retried
 * charge, also `payment.succeeded` (payment_id). Their renewals are keyed by
 * subscription + period start so both claim the same renewal order.
 */
export const PERIOD_KEYED_RENEWAL_PROVIDERS: readonly string[] = ['dodo'];

/**
 * Idempotency key for a renewal order. Prefer the provider transaction id;
 * without one (or for PERIOD_KEYED_RENEWAL_PROVIDERS), a subscription is
 * renewed at most once per billing period, so subscription + period start
 * identifies the renewal across redeliveries.
 */
export function renewalOrderIdFor(input: {
  provider: string;
  transactionId?: string | null;
  subscriptionNo: string;
  currentPeriodStart: Date | string | number;
}): string {
  if (
    input.transactionId &&
    !PERIOD_KEYED_RENEWAL_PROVIDERS.includes(input.provider)
  ) {
    return `renew-${md5(`${input.provider}:${input.transactionId}`)}`;
  }
  const periodStart = new Date(input.currentPeriodStart).getTime();
  if (!Number.isFinite(periodStart)) {
    throw new Error('renewal without transaction id needs a period start');
  }
  return `renew-${md5(
    `${input.provider}:period:${input.subscriptionNo}:${periodStart}`
  )}`;
}

export async function handleSubscriptionRenewal(
  session: any,
  provider: string
) {
  if (!session.subscriptionId || !session.subscriptionInfo) return;
  if (session.paymentStatus !== PaymentStatus.SUCCESS) return;

  const existingSub = await findByProviderSubscriptionId({
    provider,
    subscriptionId: session.subscriptionId,
  });
  if (!existingSub) return;

  const subscriptionInfo = session.subscriptionInfo;
  if (
    !subscriptionInfo.currentPeriodStart ||
    !subscriptionInfo.currentPeriodEnd
  )
    return;

  const paymentInfo = session.paymentInfo;
  const amount =
    existingSub.amount ||
    subscriptionInfo.amount ||
    paymentInfo?.paymentAmount ||
    0;
  const currency =
    existingSub.currency ||
    subscriptionInfo.currency ||
    paymentInfo?.paymentCurrency ||
    '';
  if (!currency) return;

  const creditsAmount =
    (existingSub.creditsAmount && existingSub.creditsAmount > 0
      ? existingSub.creditsAmount
      : null) ||
    resolveOrderCredits({
      creditsAmount: existingSub.creditsAmount,
      productId: existingSub.productId,
    });

  const grantTxnNo = renewalGrantTxnNo({
    transactionId: paymentInfo?.transactionId,
    subscriptionNo: existingSub.subscriptionNo,
    periodEnd: subscriptionInfo.currentPeriodEnd,
  });

  // First billing period is fulfilled at checkout — ignore provider "renewal"
  // events that still carry the initial period (Waffo payment_succeeded,
  // Creem/Stripe when the first invoice is labeled a renewal). The window
  // covers a delayed webhook; monthly/yearly renewals start much later.
  const subCreatedAt = existingSub.createdAt
    ? new Date(existingSub.createdAt).getTime()
    : 0;
  const periodStartAt = subscriptionInfo.currentPeriodStart.getTime();
  if (
    subCreatedAt > 0 &&
    Math.abs(periodStartAt - subCreatedAt) < RENEWAL_SKEW_MS
  ) {
    await db()
      .update(subscription)
      .set({
        currentPeriodStart: subscriptionInfo.currentPeriodStart,
        currentPeriodEnd: subscriptionInfo.currentPeriodEnd,
      })
      .where(eq(subscription.subscriptionNo, existingSub.subscriptionNo));
    return;
  }

  // Idempotency: same provider payment
  if (paymentInfo?.transactionId) {
    const [dupOrder] = await db()
      .select({ id: order.id })
      .from(order)
      .where(
        and(
          eq(order.transactionId, paymentInfo.transactionId),
          eq(order.paymentProvider, provider)
        )
      )
      .limit(1);
    if (dupOrder) return;
  }

  // A booked period-end change that becomes a new provider order (Waffo)
  // owns this period: apply it like `subscription.plan_changed` instead of
  // granting another period of the old plan. Only a change the provider
  // reports failed lets the old plan renew.
  if (
    isRenewalCoveredByScheduledChange(
      existingSub,
      subscriptionInfo.currentPeriodStart
    )
  ) {
    const { syncScheduledPlanChange } =
      await import('./processing-upgrade-sync');
    const { state, detail } = await syncScheduledPlanChange(existingSub, {
      force: true,
    });
    if (state === 'unavailable' && !detail) {
      // Waffo lookup failed (network / API error): fail so the webhook is
      // delivered again. A booking we cannot trace locally is not retried.
      throw new Error(
        `renewal of ${existingSub.subscriptionNo} waits on its scheduled plan change`
      );
    }
    if (state !== 'failed') {
      console.warn(
        '[payment] skip renewal covered by a scheduled plan change',
        {
          subscriptionNo: existingSub.subscriptionNo,
          provider,
          state,
          detail,
        }
      );
      return;
    }
  }

  const configs = await getAllConfigs();
  const reportedCatalogId = reportedCatalogIdFor(
    provider,
    subscriptionInfo,
    configs
  );

  const renewalOrderNo = getSnowId();
  const renewalOrderId = renewalOrderIdFor({
    provider,
    transactionId: paymentInfo?.transactionId,
    subscriptionNo: existingSub.subscriptionNo,
    currentPeriodStart: subscriptionInfo.currentPeriodStart,
  });

  let renewalClaimed = false;
  await db().transaction(async (tx: any) => {
    const [lockedSub] = await tx
      .select()
      .from(subscription)
      .where(eq(subscription.subscriptionNo, existingSub.subscriptionNo))
      .limit(1)
      .for('update');
    if (!lockedSub) return;

    // Replaced by a newer checkout (or already canceled locally). Provider
    // cancel is best-effort — a late renewal must not grant another period.
    if (isReplacedByPlanChange(lockedSub)) {
      console.warn(
        '[payment] skip renewal for replaced/canceled subscription',
        {
          subscriptionNo: lockedSub.subscriptionNo,
          status: lockedSub.status,
          canceledReasonType: lockedSub.canceledReasonType,
          provider,
        }
      );
      return;
    }

    // Plan for this period: what the provider reports, else a booked
    // downgrade that is due — independent of webhook order.
    const renewal = resolveRenewalProductId({
      sub: lockedSub,
      reportedCatalogId,
      periodStart: subscriptionInfo.currentPeriodStart,
    });
    const plan =
      renewal.changed && renewal.productId
        ? planFieldsFor(renewal.productId)
        : null;
    const billed = plan
      ? { ...lockedSub, ...plan }
      : (lockedSub as typeof existingSub);
    // Provider kept the old plan although the booked change was due: the
    // booking is gone (undone at the provider) — stop showing it.
    const stalePending =
      !renewal.changed &&
      !!reportedCatalogId &&
      isPendingChangeDue(lockedSub, subscriptionInfo.currentPeriodStart);
    // Same billing period (upgrade proration, not a renewal). A new period
    // starts later than the stored one. Granting here would add a full
    // period on top of applySubscriptionPlan's prorated difference.
    // Creem applies the plan first (subscription.update) and then sends
    // subscription.paid for that same period; the upgrade grant is the signal.
    const localStartMs = new Date(lockedSub.currentPeriodStart || 0).getTime();
    const localEndMs = new Date(lockedSub.currentPeriodEnd || 0).getTime();
    const incomingStartMs = new Date(
      subscriptionInfo.currentPeriodStart
    ).getTime();
    const incomingEndMs = new Date(subscriptionInfo.currentPeriodEnd).getTime();
    const sameCycle =
      localStartMs > 0 &&
      localEndMs > localStartMs &&
      Math.abs(incomingStartMs - localStartMs) <= CYCLE_RESET_MIN_MS &&
      Math.abs(incomingEndMs - localEndMs) <= CYCLE_RESET_MIN_MS;
    if (sameCycle && renewal.changed) return;
    if (sameCycle && provider === 'creem') {
      const [upgradeGrant] = await tx
        .select({ id: credit.id })
        .from(credit)
        .where(
          and(
            eq(credit.subscriptionNo, lockedSub.subscriptionNo),
            eq(credit.transactionType, 'grant'),
            like(credit.orderNo, 'UPG%'),
            gte(credit.createdAt, new Date(localStartMs)),
            isNull(credit.deletedAt)
          )
        )
        .limit(1);
      if (upgradeGrant) return;
    }

    const renewalCredits = (plan ? billed.creditsAmount : creditsAmount) || 0;
    const renewalCreditsValidDays =
      billed.creditsValidDays ||
      getPricingProduct(billed.productId || '')?.creditsValidDays ||
      0;

    if (paymentInfo?.transactionId) {
      const [dup] = await tx
        .select({ id: order.id })
        .from(order)
        .where(
          and(
            eq(order.transactionId, paymentInfo.transactionId),
            eq(order.paymentProvider, provider)
          )
        )
        .limit(1);
      if (dup) return;
    }

    // Dodo used to key the renewal by payment id. A subscription.renewed
    // that arrives after that order exists (deploy window, webhook retry)
    // now uses the period key and would grant the same period again.
    if (PERIOD_KEYED_RENEWAL_PROVIDERS.includes(provider)) {
      const periodStartMs = new Date(
        subscriptionInfo.currentPeriodStart
      ).getTime();
      const [priorRenewal] = await tx
        .select({ id: order.id })
        .from(order)
        .where(
          and(
            eq(order.subscriptionNo, existingSub.subscriptionNo),
            eq(order.paymentProvider, provider),
            eq(order.paymentType, 'renew'),
            eq(order.status, OrderStatus.PAID),
            gte(order.createdAt, new Date(periodStartMs - RENEWAL_SKEW_MS)),
            isNull(order.deletedAt)
          )
        )
        .limit(1);
      if (priorRenewal && priorRenewal.id !== renewalOrderId) return;
    }

    // 1. Create renewal order (claim: 0 rows = already recorded)
    const inserted = await insertIgnoringConflict(tx, order, {
      id: renewalOrderId,
      orderNo: renewalOrderNo,
      userId: existingSub.userId,
      userEmail: existingSub.userEmail || '',
      status: OrderStatus.PAID,
      amount: plan ? (billed.amount ?? amount) : amount,
      currency: plan ? billed.currency || currency : currency,
      productId: billed.productId || '',
      paymentType: 'renew',
      paymentInterval: billed.interval || '',
      paymentProvider: provider,
      checkoutInfo: '',
      description: 'Subscription Renewal',
      productName: billed.productName || '',
      planName: billed.planName || '',
      creditsAmount: renewalCredits || billed.creditsAmount,
      creditsValidDays: renewalCreditsValidDays || billed.creditsValidDays,
      paymentProductId: existingSub.paymentProductId || '',
      paymentResult: JSON.stringify(session.paymentResult),
      paymentAmount: paymentInfo?.paymentAmount,
      paymentCurrency: paymentInfo?.paymentCurrency,
      paymentEmail: paymentInfo?.paymentEmail,
      paidAt: paymentInfo?.paidAt || new Date(),
      invoiceId: paymentInfo?.invoiceId,
      invoiceUrl: paymentInfo?.invoiceUrl,
      subscriptionNo: existingSub.subscriptionNo,
      subscriptionId: session.subscriptionId,
      transactionId: paymentInfo?.transactionId || grantTxnNo,
      paymentUserName: paymentInfo?.paymentUserName,
      paymentUserId: paymentInfo?.paymentUserId,
    });
    if (inserted !== 1) {
      // Same renewal already recorded by the other webhook without the
      // payment id (Dodo subscription.renewed, synthetic `renew_…` id):
      // keep the real id so a refund of that payment finds the order.
      if (
        paymentInfo?.transactionId &&
        PERIOD_KEYED_RENEWAL_PROVIDERS.includes(provider)
      ) {
        await tx
          .update(order)
          .set({ transactionId: paymentInfo.transactionId })
          .where(
            and(
              eq(order.id, renewalOrderId),
              like(order.transactionId, 'renew_%')
            )
          );
      }
      return;
    }
    renewalClaimed = true;

    // 2. Update subscription period (+ plan when the change applies now)
    await tx
      .update(subscription)
      .set({
        currentPeriodStart: subscriptionInfo.currentPeriodStart,
        currentPeriodEnd: subscriptionInfo.currentPeriodEnd,
        ...(plan || {}),
        ...(!plan &&
        creditsAmount > 0 &&
        (!lockedSub.creditsAmount || lockedSub.creditsAmount <= 0)
          ? { creditsAmount }
          : {}),
        ...(renewal.clearPending || stalePending ? CLEARED_PENDING_CHANGE : {}),
      })
      .where(eq(subscription.subscriptionNo, existingSub.subscriptionNo));

    // 3. Grant credits for renewal (at most once per renewal order; the
    // order insert above already claimed this renewal). A plan change that
    // restarted the cycle already granted this period's credits; a provider
    // that also reports that charge as a renewal must not grant them twice.
    const coveredByReset = await hasCycleResetGrant(
      tx,
      existingSub.subscriptionNo,
      subscriptionInfo.currentPeriodStart
    );
    if (coveredByReset) {
      console.warn('[payment] renewal credits already granted by plan change', {
        subscriptionNo: existingSub.subscriptionNo,
        provider,
      });
    }
    if (!coveredByReset)
      await grantOrderCreditsOnce(tx, {
        orderNo: renewalOrderNo,
        userId: existingSub.userId,
        userEmail: existingSub.userEmail,
        subscriptionNo: existingSub.subscriptionNo,
        credits: renewalCredits,
        transactionScene: 'renewal',
        description: 'Grant credit',
        expiresAt: calculateCreditExpirationTime({
          creditsValidDays: renewalCreditsValidDays,
          currentPeriodEnd: subscriptionInfo.currentPeriodEnd,
        }),
      });
  });
  if (renewalClaimed) await notifyPaidOrder(renewalOrderNo);
}

/**
 * Drop a local "upgrade waiting on payment" booking when that payment failed
 * and the provider is still on the old plan. Period-end downgrades are left
 * alone. Stripe renewal failures are not this invoice.
 */
async function clearRejectedUpgradeBooking(session: any, provider: string) {
  if (!session?.subscriptionId || !session.subscriptionInfo) return;
  if (
    provider === 'stripe' &&
    session.paymentResult?.billing_reason &&
    session.paymentResult.billing_reason !== 'subscription_update'
  ) {
    return;
  }
  const existingSub = await findByProviderSubscriptionId({
    provider,
    subscriptionId: session.subscriptionId,
  });
  if (
    !existingSub?.pendingProductId ||
    existingSub.pendingChangeType !== PendingChangeType.UPGRADE
  ) {
    return;
  }
  const catalogId = reportedCatalogIdFor(
    provider,
    session.subscriptionInfo,
    await getAllConfigs()
  );
  if (!catalogId || catalogId !== existingSub.productId) return;
  await updateBySubscriptionNo(
    existingSub.subscriptionNo,
    CLEARED_PENDING_CHANGE
  );
}

// --- Subscription Updated ---

/** Also used to reconcile from a provider lookup (getSubscription). */
export async function handleSubscriptionUpdated(
  session: any,
  provider: string
) {
  if (!session.subscriptionId || !session.subscriptionInfo) return;

  const existingSub = await findByProviderSubscriptionId({
    provider,
    subscriptionId: session.subscriptionId,
  });
  if (!existingSub) return;

  const info = session.subscriptionInfo;
  if (shouldPreserveRefundCancel(existingSub, info.status)) {
    console.warn('[payment] ignore provider update for refund-ended sub', {
      subscriptionNo: existingSub.subscriptionNo,
      providerStatus: info.status,
      provider,
    });
    return;
  }
  if (shouldPreservePlanChangeCancel(existingSub, info.status)) {
    console.warn(
      '[payment] ignore live provider update for plan_change-canceled sub',
      {
        subscriptionNo: existingSub.subscriptionNo,
        localStatus: existingSub.status,
        providerStatus: info.status,
        provider,
      }
    );
    return;
  }

  const configs = await getAllConfigs();
  const catalogId = reportedCatalogIdFor(provider, info, configs);
  const planChanged = !!catalogId && catalogId !== existingSub.productId;
  const keepUserCancel = shouldKeepUserCancel(
    existingSub,
    provider,
    info.status,
    { resumed: info.resumed === true }
  );
  // Billing cancel already ended this subscription. Waffo still reporting
  // it live (or a `canceling` event with no local reason) must not clear
  // that, or the dropped plan change is booked again.
  if (
    keepUserCancel &&
    (info.status === SubscriptionStatus.ACTIVE ||
      info.status === SubscriptionStatus.TRIALING ||
      info.status === SubscriptionStatus.PAUSED)
  ) {
    return;
  }

  await updateBySubscriptionNo(existingSub.subscriptionNo, {
    status: info.status,
    // Plan change: applySubscriptionPlan writes the period together with the
    // plan so it can tell a billing-cycle restart from a same-cycle change.
    ...(planChanged
      ? {}
      : {
          currentPeriodStart: info.currentPeriodStart,
          currentPeriodEnd: info.currentPeriodEnd,
        }),
    canceledAt: keepUserCancel
      ? existingSub.canceledAt || info.canceledAt || null
      : info.canceledAt || null,
    canceledEndAt: keepUserCancel
      ? existingSub.canceledEndAt || info.canceledEndAt || null
      : info.canceledEndAt || null,
    canceledReason: keepUserCancel
      ? existingSub.canceledReason || info.canceledReason || ''
      : info.canceledReason || '',
    canceledReasonType: keepUserCancel
      ? 'user_request'
      : info.canceledReasonType || '',
  });

  if (planChanged && catalogId) {
    await applySubscriptionPlan({
      subscriptionNo: existingSub.subscriptionNo,
      productId: catalogId,
      currentPeriodStart: info.currentPeriodStart,
      currentPeriodEnd: info.currentPeriodEnd,
      previousPeriodStart: existingSub.currentPeriodStart,
      previousPeriodEnd: existingSub.currentPeriodEnd,
    });
    // Already applied (e.g. by the sync change path): still keep dates fresh.
    await updateBySubscriptionNo(existingSub.subscriptionNo, {
      currentPeriodStart: info.currentPeriodStart,
      currentPeriodEnd: info.currentPeriodEnd,
    });
  } else if (
    catalogId === existingSub.productId &&
    ((existingSub.pendingChangeType === PendingChangeType.DOWNGRADE &&
      existingSub.pendingEffectiveAt &&
      new Date(existingSub.pendingEffectiveAt).getTime() + RENEWAL_SKEW_MS <
        Date.now()) ||
      // Upgrade unpaid past its deadline and the provider holds no pending
      // update for it (Stripe expired/voided it): it will not land.
      (isStaleProcessingUpgrade(existingSub) &&
        !session.subscriptionResult?.pending_update))
  ) {
    await updateBySubscriptionNo(
      existingSub.subscriptionNo,
      CLEARED_PENDING_CHANGE
    );
  }

  if (
    provider === 'waffo' &&
    info.status === SubscriptionStatus.PENDING_CANCEL &&
    !keepUserCancel
  ) {
    await recordConfirmedWaffoPlanChange(existingSub, info);
  }
}

// --- Subscription Canceled ---

/** Also used when a provider lookup reports the subscription ended. */
export async function handleSubscriptionCanceled(
  session: any,
  provider: string
) {
  if (!session.subscriptionId || !session.subscriptionInfo) return;

  const existingSub = await findByProviderSubscriptionId({
    provider,
    subscriptionId: session.subscriptionId,
  });
  if (!existingSub) return;

  const info = session.subscriptionInfo;
  if (
    provider === 'paypal' &&
    existingSub.status === SubscriptionStatus.PENDING_CANCEL &&
    existingSub.canceledEndAt &&
    new Date(existingSub.canceledEndAt).getTime() > Date.now()
  ) {
    return;
  }
  await updateBySubscriptionNo(existingSub.subscriptionNo, {
    status: SubscriptionStatus.CANCELED,
    canceledAt: info.canceledAt,
    canceledEndAt: info.canceledEndAt,
    canceledReason: info.canceledReason,
    canceledReasonType: info.canceledReasonType,
    ...(existingSub.pendingChangeType === PendingChangeType.RESUBSCRIBE
      ? {}
      : CLEARED_PENDING_CHANGE),
  });
}

// --- Cancel subscription (user-initiated) ---

/** Confirmed Waffo change orders must not be healed back after a cancel. */
async function retireWaffoPlanChangeOrders(sub: {
  userId: string;
  subscriptionNo: string;
}) {
  const orders = await listRecentWaffoPlanChangeOrders(sub.userId);
  const open = recentWaffoPlanChangeOrders(orders, sub.subscriptionNo).filter(
    (o) => o.status === 'created'
  );
  await Promise.all(
    open.map((o) =>
      updateWaffoPlanChangeMarker(o, { failed: true }, 'canceled')
    )
  );
}

export const RESUME_UNAVAILABLE_ERROR = 'This subscription cannot be resumed.';

/**
 * 「恢复订阅」 in billing: undo a scheduled cancel through the provider API
 * (Stripe / Dodo / Creem / Waffo; mirrors cancelUserSubscription) and clear
 * the local cancel right away. Idempotent: an already-live subscription is
 * returned as is. The provider's later update webhook sees no billing cancel
 * (canceledReasonType cleared), so it only refreshes the row. Waffo's
 * `subscription.uncanceled` remains a webhook fallback.
 */
export async function resumeUserSubscription(params: {
  userId: string;
  subscriptionNo: string;
}) {
  const { userId, subscriptionNo } = params;
  const sub = await findBySubscriptionNo(subscriptionNo);
  if (!sub) throw new Error('Subscription not found');
  if (sub.userId !== userId) throw new Error('Forbidden');

  if (
    sub.status === SubscriptionStatus.ACTIVE ||
    sub.status === SubscriptionStatus.TRIALING
  ) {
    return sub;
  }
  if (resumeMode(sub) !== 'in_app') {
    throw new Error(RESUME_UNAVAILABLE_ERROR);
  }

  const pm = await getPaymentManager();
  const provider = pm.getProvider(sub.paymentProvider);
  // getProvider falls back to the default provider for unknown names.
  if (
    !provider ||
    provider.name !== sub.paymentProvider ||
    !provider.resumeSubscription
  ) {
    throw new Error(RESUME_UNAVAILABLE_ERROR);
  }

  // Waffo reactivate needs a Session Token (buyerIdentity + PROD_xxx).
  let buyerIdentity: string | undefined;
  let productId: string | undefined;
  if (sub.paymentProvider === 'waffo') {
    const configs = await getAllConfigs();
    const mapped = resolveMappedProviderProductId(
      parseProductIdsMapping(configs.waffo_product_ids_mapping),
      sub.productId || ''
    );
    if (!mapped) {
      throw new Error(RESUME_UNAVAILABLE_ERROR);
    }
    buyerIdentity = sub.userId;
    productId = mapped;
  }

  let session: Awaited<ReturnType<typeof provider.resumeSubscription>>;
  try {
    session = await provider.resumeSubscription({
      subscriptionId: sub.subscriptionId,
      ...(buyerIdentity ? { buyerIdentity } : {}),
      ...(productId ? { productId } : {}),
    });
  } catch (error: any) {
    // Waffo refuses for good (not canceling / unpaid / confirmed plan
    // change): log the provider cause, show the localized "cannot resume".
    if (error?.notReactivatable === true) {
      console.error(
        `resume subscription ${subscriptionNo} refused by ${sub.paymentProvider}:`,
        error.message
      );
      throw new Error(RESUME_UNAVAILABLE_ERROR);
    }
    throw error;
  }
  const info = session.subscriptionInfo;
  // Only a live provider status may clear the local cancel. A cancelled /
  // still-ending payload (or none) must not grant access again.
  if (
    info?.status !== SubscriptionStatus.ACTIVE &&
    info?.status !== SubscriptionStatus.TRIALING
  ) {
    throw new Error('Resume failed');
  }
  return updateBySubscriptionNo(subscriptionNo, {
    status: info.status,
    ...(info?.currentPeriodStart && info?.currentPeriodEnd
      ? {
          currentPeriodStart: info.currentPeriodStart,
          currentPeriodEnd: info.currentPeriodEnd,
        }
      : {}),
    canceledAt: null,
    canceledEndAt: null,
    canceledReason: '',
    canceledReasonType: '',
  });
}

/** Period-end cancel: keep access until a future end (never "now"). */
function resolveCancelEndsAt(sub: {
  currentPeriodEnd?: Date | string | null;
  currentPeriodStart?: Date | string | null;
  interval?: string | null;
  intervalCount?: number | null;
}): Date {
  return resolvePeriodEnd({
    end: sub.currentPeriodEnd,
    start: sub.currentPeriodStart,
    interval: sub.interval,
    intervalCount: sub.intervalCount,
  });
}

export async function cancelUserSubscription(params: {
  userId: string;
  subscriptionNo: string;
}) {
  const { userId, subscriptionNo } = params;

  const pmPromise = getPaymentManager();
  pmPromise.catch(() => {});
  const sub = await findBySubscriptionNo(subscriptionNo);
  if (!sub) throw new Error('Subscription not found');
  if (sub.userId !== userId) throw new Error('Forbidden');

  if (
    sub.status === SubscriptionStatus.CANCELED ||
    sub.status === SubscriptionStatus.EXPIRED
  ) {
    return sub;
  }
  if (isUpgradeInProgress(sub)) {
    throw new Error(UPGRADE_IN_PROGRESS_CANCEL_ERROR);
  }

  const pm = await pmPromise;
  const provider = pm.getProvider(sub.paymentProvider);
  if (!provider || !provider.cancelSubscription) {
    throw new Error('Cancellation not supported for this provider');
  }

  if (
    sub.pendingChangeType === PendingChangeType.DOWNGRADE &&
    sub.paymentProvider === 'dodo' &&
    provider.cancelScheduledPlanChange
  ) {
    try {
      await provider.cancelScheduledPlanChange({
        subscriptionId: sub.subscriptionId,
        scheduleId: sub.providerScheduleId,
      });
    } catch (error) {
      console.error('[payment] drop scheduled plan change failed', error);
    }
  }

  if (
    sub.paymentProvider === 'waffo' &&
    sub.pendingChangeType === PendingChangeType.DOWNGRADE &&
    isConfirmedWaffoScheduleId(sub.providerScheduleId)
  ) {
    let newOrderId = isWaffoOrderId(sub.providerScheduleId)
      ? sub.providerScheduleId
      : null;
    if (!newOrderId && provider.getPlanChangeStatus) {
      const orderNo = String(sub.providerScheduleId).slice(
        WAFFO_CONFIRMED_PREFIX.length
      );
      try {
        newOrderId =
          (
            await provider.getPlanChangeStatus({
              orderNo,
              originOrderId: sub.subscriptionId,
            })
          ).providerOrderId || null;
      } catch (error) {
        console.error('[payment] waffo plan change lookup failed', error);
      }
    }
    if (!newOrderId) throw new Error('Cancellation failed');
    await provider.cancelSubscription({ subscriptionId: newOrderId });
    await retireWaffoPlanChangeOrders(sub);
    const endsAt = resolveCancelEndsAt(sub);
    const periodHeal = isStalePeriodEnd({
      end: sub.currentPeriodEnd,
      start: sub.currentPeriodStart,
    })
      ? { currentPeriodEnd: endsAt }
      : {};
    return updateBySubscriptionNo(subscriptionNo, {
      status: SubscriptionStatus.PENDING_CANCEL,
      canceledAt: new Date(),
      canceledEndAt: endsAt,
      canceledReason: 'Canceled by user',
      canceledReasonType: 'user_request',
      ...periodHeal,
      ...CLEARED_PENDING_CHANGE,
    });
  }

  // End of period by default: the customer keeps the plan until then.
  const session = await provider.cancelSubscription({
    subscriptionId: sub.subscriptionId,
  });
  if (sub.paymentProvider === 'waffo') {
    await retireWaffoPlanChangeOrders(sub);
  }

  const info = session.subscriptionInfo;
  const status = info?.status || SubscriptionStatus.CANCELED;
  const endsAt =
    status === SubscriptionStatus.PENDING_CANCEL
      ? resolvePeriodEnd({
          end: info?.canceledEndAt || sub.currentPeriodEnd,
          start: sub.currentPeriodStart,
          interval: sub.interval,
          intervalCount: sub.intervalCount,
        })
      : info?.canceledEndAt || null;
  const periodHeal =
    status === SubscriptionStatus.PENDING_CANCEL &&
    isStalePeriodEnd({
      end: sub.currentPeriodEnd,
      start: sub.currentPeriodStart,
    })
      ? { currentPeriodEnd: endsAt }
      : {};
  const updated = await updateBySubscriptionNo(subscriptionNo, {
    status,
    canceledAt: info?.canceledAt || new Date(),
    canceledEndAt: endsAt,
    canceledReason: info?.canceledReason || 'Canceled by user',
    canceledReasonType: info?.canceledReasonType || 'user_request',
    ...periodHeal,
    ...CLEARED_PENDING_CHANGE,
  });

  return updated;
}

export function reportedCatalogIdFor(
  provider: string,
  info: { productId?: string; planId?: string } | null | undefined,
  configs: Record<string, string>
): string | null {
  if (!info) return null;
  const map = parseProductIdsMapping(
    provider === 'stripe'
      ? configs.stripe_price_ids_mapping
      : configs[`${provider}_product_ids_mapping`]
  );
  const candidates =
    provider === 'stripe' ? [info.planId, info.productId] : [info.productId];
  for (const candidate of candidates) {
    const id = resolveCatalogIdFromProviderProductId(map, candidate);
    const product = id ? getPricingProduct(id) : null;
    if (product && product.type === PaymentType.SUBSCRIPTION) {
      return product.productId;
    }
  }
  return null;
}

/**
 * Order number of the full-period grant made when a plan change restarted the
 * billing cycle. Keyed by subscription + new period start (minute precision:
 * the API response and webhooks report the same provider timestamp), so the
 * sync path, webhooks and the renewal handler all resolve to one grant.
 */
export function cycleResetGrantOrderNo(
  subscriptionNo: string,
  periodStart: Date | string | number
): string {
  const minute = Math.floor(new Date(periodStart).getTime() / 60000);
  return `RST${md5(`${subscriptionNo}:${minute}`).slice(0, 24)}`;
}

export async function hasCycleResetGrant(
  database: any,
  subscriptionNo: string,
  periodStart: Date | string | number | null | undefined
): Promise<boolean> {
  if (!periodStart) return false;
  const [row] = await database
    .select({ id: credit.id })
    .from(credit)
    .where(
      and(
        eq(credit.orderNo, cycleResetGrantOrderNo(subscriptionNo, periodStart)),
        eq(credit.transactionType, 'grant'),
        isNull(credit.deletedAt)
      )
    )
    .limit(1);
  return !!row;
}

/**
 * Switch the local subscription to `productId` (claim-first, once) and grant
 * credits for the change:
 * - billing cycle restarted (provider period start moved before the old
 *   period end): the NEW plan's full per-period credits, expiring with the
 *   new period; remaining credits of the cut-short period are capped to the
 *   new period end (never extended, never wiped immediately).
 * - same cycle (prorated, no reset): only the per-period difference.
 * `previousPeriod*` are the row's dates BEFORE the provider change; the new
 * dates are written in the same claim so a racing webhook cannot hide the
 * reset by updating the period first.
 */
export async function applySubscriptionPlan(params: {
  subscriptionNo: string;
  productId: string;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  previousPeriodStart?: Date | string | null;
  previousPeriodEnd?: Date | string | null;
}) {
  const plan = planFieldsFor(params.productId);
  if (!plan) return;
  await db().transaction(async (tx: any) => {
    const [locked] = await tx
      .select()
      .from(subscription)
      .where(eq(subscription.subscriptionNo, params.subscriptionNo))
      .limit(1)
      .for('update');
    if (!locked || locked.productId === plan.productId) return;

    const fromProductId = locked.productId;
    const target = getPricingProduct(plan.productId);
    const action =
      target && fromProductId
        ? resolvePricingPlanAction(target, fromProductId)
        : 'subscribe';
    const previousPeriodStart =
      params.previousPeriodStart ?? locked.currentPeriodStart ?? null;
    const previousPeriodEnd =
      params.previousPeriodEnd ?? locked.currentPeriodEnd ?? null;
    // A booked period-end change lands on a natural renewal (its credits come
    // from the renewal), so only a provider-side cycle restart counts here —
    // in either direction (an immediate downgrade can restart it too). An
    // upgrade booked while its payment confirms is not period-end: it still
    // gets the cycle-restart grant.
    const cycleReset =
      (action === 'upgrade' || action === 'switch' || action === 'downgrade') &&
      !(
        locked.pendingProductId === plan.productId &&
        locked.pendingChangeType !== PendingChangeType.UPGRADE
      ) &&
      isBillingCycleReset({
        previousPeriodStart,
        previousPeriodEnd,
        periodStart: params.currentPeriodStart,
      });
    const claim = await tx
      .update(subscription)
      .set({
        ...plan,
        ...(params.currentPeriodStart && params.currentPeriodEnd
          ? {
              currentPeriodStart: params.currentPeriodStart,
              currentPeriodEnd: params.currentPeriodEnd,
            }
          : {}),
        ...(locked.pendingProductId === plan.productId ||
        action === 'upgrade' ||
        action === 'switch'
          ? CLEARED_PENDING_CHANGE
          : {}),
      })
      .where(
        and(
          eq(subscription.subscriptionNo, params.subscriptionNo),
          fromProductId
            ? eq(subscription.productId, fromProductId)
            : isNull(subscription.productId)
        )
      );
    if (paymentAffectedRows(claim) !== 1) return;

    const periodEnd =
      params.currentPeriodEnd ||
      (locked.currentPeriodEnd ? new Date(locked.currentPeriodEnd) : undefined);

    if (cycleReset && params.currentPeriodStart) {
      const expiresAt = calculateCreditExpirationTime({
        creditsValidDays: plan.creditsValidDays || 0,
        currentPeriodEnd: periodEnd,
      });
      await grantOrderCreditsOnce(tx, {
        orderNo: cycleResetGrantOrderNo(
          params.subscriptionNo,
          params.currentPeriodStart
        ),
        userId: locked.userId,
        userEmail: locked.userEmail,
        subscriptionNo: params.subscriptionNo,
        // Prorated like the charge; 0 grants nothing (never claws back).
        credits: proratedCycleResetCredits({
          newCredits: plan.creditsAmount,
          oldCredits:
            locked.creditsAmount ??
            (fromProductId ? getPricingProduct(fromProductId)?.credits : 0),
          previousPeriodStart,
          previousPeriodEnd,
          periodStart: params.currentPeriodStart,
        }),
        transactionScene: 'subscription',
        description: 'Plan change credit (new billing cycle)',
        expiresAt,
      });
      // Old period was cut short: its unused credits may not outlive the new
      // cycle (the provider already credited the unused time in money).
      if (periodEnd) {
        await tx
          .update(credit)
          .set({ expiresAt: periodEnd })
          .where(
            and(
              eq(credit.subscriptionNo, params.subscriptionNo),
              eq(credit.transactionType, 'grant'),
              eq(credit.status, 'active'),
              gt(credit.remainingCredits, 0),
              gt(credit.expiresAt, periodEnd),
              ne(
                credit.orderNo,
                cycleResetGrantOrderNo(
                  params.subscriptionNo,
                  params.currentPeriodStart
                )
              ),
              isNull(credit.deletedAt)
            )
          );
      }
      return;
    }

    if (action === 'upgrade' || action === 'switch') {
      const periodKey = previousPeriodStart
        ? new Date(previousPeriodStart).getTime()
        : 0;
      await grantOrderCreditsOnce(tx, {
        orderNo: `UPG${md5(
          `${params.subscriptionNo}:${fromProductId}:${plan.productId}:${periodKey}`
        ).slice(0, 24)}`,
        userId: locked.userId,
        userEmail: locked.userEmail,
        subscriptionNo: params.subscriptionNo,
        // Prorated by the time left, like the provider's same-cycle charge.
        credits: proratedSameCycleCredits({
          newCredits: upgradeCreditsDelta(fromProductId, plan.productId),
          oldCredits: 0,
          periodStart: previousPeriodStart,
          periodEnd: previousPeriodEnd,
          at: new Date(),
        }),
        transactionScene: 'subscription',
        description: 'Plan upgrade credit',
        expiresAt: calculateCreditExpirationTime({
          creditsValidDays: plan.creditsValidDays || 0,
          currentPeriodEnd: periodEnd,
        }),
      });
    }
  });
}

export type { WaffoPlanChangeMarker } from './plan-change';

export async function recordConfirmedWaffoPlanChange(
  existingSub: any,
  info: any
) {
  if (
    existingSub.status === SubscriptionStatus.PENDING_CANCEL &&
    existingSub.canceledReasonType === 'user_request'
  ) {
    return;
  }
  const effectiveAt =
    info.canceledEndAt ||
    info.currentPeriodEnd ||
    existingSub.pendingEffectiveAt ||
    existingSub.currentPeriodEnd;
  if (
    existingSub.pendingProductId &&
    existingSub.pendingChangeType === PendingChangeType.DOWNGRADE &&
    existingSub.status === SubscriptionStatus.PENDING_CANCEL
  ) {
    await updateBySubscriptionNo(existingSub.subscriptionNo, {
      pendingEffectiveAt: effectiveAt,
    });
    return;
  }
  const orders = await listRecentWaffoPlanChangeOrders(existingSub.userId);
  const confirmed = pickConfirmedWaffoPlanChange(
    orders,
    existingSub.subscriptionNo
  );
  if (!confirmed) return;
  await updateBySubscriptionNo(existingSub.subscriptionNo, {
    pendingProductId: confirmed.productId,
    pendingEffectiveAt: effectiveAt,
    pendingChangeType: PendingChangeType.DOWNGRADE,
    providerScheduleId: confirmed.orderNo,
  });
  await markWaffoPlanChangeOrdersSuperseded(
    recentWaffoPlanChangeOrders(orders, existingSub.subscriptionNo).filter(
      (o) => o.status === 'created' && o.id !== confirmed.id
    )
  );
}

async function handleProviderPlanChange(session: any, provider: string) {
  const change = session.planChange;
  if (provider !== 'waffo' || !change?.providerOrderId) return;
  if (change.state !== 'scheduled' && change.state !== 'failed') return;
  const result = await applyWaffoPlanChangeOutcome({
    state: change.state,
    providerOrderId: change.providerOrderId,
    orderNo: change.merchantOrderNo,
    userId: change.buyerIdentity,
    effectiveAt: change.effectiveAt || null,
  });
  console.log('[payment] waffo plan change', {
    state: change.state,
    providerOrderId: change.providerOrderId,
    orderNo: change.merchantOrderNo,
    result,
  });
}

// --- Query helpers ---

export async function getUserOrders(userId: string) {
  return db()
    .select()
    .from(order)
    .where(and(eq(order.userId, userId), isNull(order.deletedAt)))
    .orderBy(desc(order.createdAt));
}

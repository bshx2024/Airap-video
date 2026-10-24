import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { PaymentType } from '@/core/payment/types';
import {
  checkoutUsdFallback,
  getPricingProduct,
  resolvePricingPlanAction,
  resolveProviderCheckoutPricing,
} from '@/config/pricing';
import { getAllConfigs } from '@/modules/config/service';
import {
  classifyPlanChange,
  isPlanPurchaseBlockedByEnding,
  PendingChangeType,
} from '@/modules/payment/plan-change';
import {
  healUnconfirmedWaffoBooking,
  pendingErrorFor,
  PLAN_CHANGE_ERRORS,
} from '@/modules/payment/plan-change-service';
import {
  createCheckout,
  resolveCheckoutProviderName,
} from '@/modules/payment/service';
import {
  getCurrentSubscription,
  SubscriptionStatus,
} from '@/modules/subscriptions/service';
import { isProduction } from '@/lib/env';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';
import { safeErrorMessage } from '@/lib/safe-error-message';
import { baseLocale, locales, localizeUrl } from '@/paraglide/runtime.js';

// Mapped to a localized message in src/lib/api-error.ts.
const CNY_PROVIDER_UNAVAILABLE_ERROR =
  'Alipay and WeChat Pay are only available for one-time credit packs';
const PROVIDER_CURRENCY_REJECTED_ERROR =
  'This payment method does not support the selected currency';

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1000,
    keyPrefix: 'checkout',
  });
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return respErr('Unauthorized');
    }

    const body = await request.json().catch(() => ({}));
    const { product_id, payment_provider, currency, locale } = body;

    if (!product_id || typeof product_id !== 'string') {
      return respErr('Missing product_id');
    }

    // Look up product in the authoritative server-side catalog.
    // We DO NOT trust price / credits / plan from the request body.
    const product = getPricingProduct(product_id);
    if (!product) {
      return respErr('Unknown product');
    }

    if (product.type === PaymentType.SUBSCRIPTION) {
      const rawSub = await getCurrentSubscription(session.user.id);
      const currentSub = rawSub
        ? await healUnconfirmedWaffoBooking(rawSub)
        : null;
      const action = resolvePricingPlanAction(
        product,
        currentSub?.productId || null
      );
      if (action === 'current') {
        return respErr('You already have this plan. Manage it in Billing.');
      }
      if (
        currentSub?.pendingProductId &&
        currentSub.pendingChangeType === PendingChangeType.DOWNGRADE
      ) {
        return respJson(-1, pendingErrorFor(currentSub), {
          code: 'plan_change_pending',
        });
      }
      // Canceled at period end, still running: no other plan (upgrade or
      // interval switch) until it ends, so no second subscription runs next
      // to it. Downgrades keep their own code below.
      if (
        currentSub &&
        action !== 'downgrade' &&
        isPlanPurchaseBlockedByEnding(product, currentSub)
      ) {
        if (currentSub.pendingProductId) {
          return respJson(-1, pendingErrorFor(currentSub), {
            code: 'plan_change_pending',
          });
        }
        const endsAt = currentSub.canceledEndAt || currentSub.currentPeriodEnd;
        return respJson(-1, PLAN_CHANGE_ERRORS.subscriptionEnding, {
          code: 'subscription_ending',
          ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        });
      }
      // Lower-tier yearly → higher-tier monthly: never a fresh checkout that
      // replaces the paid year; the pricing dialog offers the two options.
      const change = classifyPlanChange(
        currentSub?.productId,
        product.productId
      );
      if (
        currentSub &&
        change.intent === 'upgrade_to_monthly' &&
        currentSub.status !== SubscriptionStatus.PENDING_CANCEL
      ) {
        return respJson(-1, PLAN_CHANGE_ERRORS.choiceRequired, {
          code: 'plan_change_choice_required',
          suggested_product_id: change.suggestedProductId,
        });
      }
      if (action === 'downgrade') {
        if (currentSub?.status === SubscriptionStatus.PENDING_CANCEL) {
          return respJson(-1, PLAN_CHANGE_ERRORS.endingSoon, {
            code: 'downgrade_after_period_end',
          });
        }
        return respJson(-1, PLAN_CHANGE_ERRORS.useChange, {
          code: 'use_change_endpoint',
        });
      }
    }

    // Resolve the provider exactly as createCheckout will (requested, else
    // the payment manager default = default_payment_provider when that
    // provider is configured, otherwise the first configured one).
    const configs = await getAllConfigs();
    const providerKey = await resolveCheckoutProviderName(payment_provider);

    // Price in the currency the provider will actually charge, so the order
    // amount/currency matches the paid amount verified later:
    // alipay/wechat → CNY only; creem → catalog USD; waffo/stripe → USD
    // (this product always settles in USD).
    const requestedCurrency =
      typeof currency === 'string' ? currency.toLowerCase() : '';
    const pricing = resolveProviderCheckoutPricing(product, {
      provider: providerKey,
      locale,
      requestedCurrency,
    });
    if (!pricing.ok) {
      return respErr(CNY_PROVIDER_UNAVAILABLE_ERROR);
    }
    const { amount: authoritativePrice, currency: authoritativeCurrency } =
      pricing;

    // Optional per-provider "test amount" override (admin-configured).
    // Disabled in production: order.amount becomes the charge amount and
    // verifyPaidAmount accepts it, so a leftover test_amount would let users
    // pay $0.01 for full catalog credits.
    const testAmountRaw =
      !isProduction && providerKey
        ? configs[`${providerKey}_test_amount`]
        : undefined;
    const testAmount = testAmountRaw ? parseInt(testAmountRaw) : 0;
    const chargeAmount = testAmount > 0 ? testAmount : authoritativePrice;

    const baseUrl = configs.app_url || 'http://localhost:3000';
    const checkoutLocale =
      typeof locale === 'string' && locale.split('-')[0] === 'zh' ? 'zh' : 'en';
    const localeKnown =
      typeof locale === 'string' && locales.includes(locale as any);
    const requestedLocale = (
      localeKnown ? locale : baseLocale
    ) as typeof baseLocale;
    const finalRedirect = localizeUrl(
      `${baseUrl}${
        product.type === PaymentType.SUBSCRIPTION
          ? '/settings/billing'
          : '/settings/credits'
      }`,
      { locale: requestedLocale }
    ).href;
    const cancelUrl = localizeUrl(`${baseUrl}/pricing`, {
      locale: requestedLocale as typeof baseLocale,
    }).href;

    const paymentOrder = {
      productId: product.productId,
      type: product.type,
      description: product.description,
      successUrl: finalRedirect,
      cancelUrl,
      locale: checkoutLocale,
      customer: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
      plan: product.plan
        ? {
            name: product.plan.name,
            interval: product.plan.interval,
            intervalCount: product.plan.intervalCount,
          }
        : undefined,
    };
    const startCheckout = (amount: number, payCurrency: string) =>
      createCheckout({
        userId: session.user.id,
        userEmail: session.user.email,
        productName: product.productName,
        planName: product.planName,
        credits: product.credits,
        creditsValidDays: product.creditsValidDays,
        paymentOrder: {
          ...paymentOrder,
          price: { amount, currency: payCurrency },
        },
        provider: payment_provider,
      });

    let checkout;
    try {
      checkout = await startCheckout(chargeAmount, authoritativeCurrency);
    } catch (error: any) {
      const usd = checkoutUsdFallback(product, {
        provider: providerKey,
        currency: authoritativeCurrency,
        testAmount,
      });
      if (!usd || !/currenc/i.test(String(error?.message || ''))) throw error;
      console.error('[payment] provider rejected currency, charging USD', {
        provider: providerKey,
        productId: product.productId,
        currency: authoritativeCurrency,
      });
      checkout = await startCheckout(usd.amount, usd.currency);
    }

    return respData({ checkout_url: checkout.checkoutInfo.checkoutUrl });
  } catch (error: any) {
    console.error('checkout error:', error);
    if (/currenc/i.test(String(error?.message || ''))) {
      return respErr(PROVIDER_CURRENCY_REJECTED_ERROR);
    }
    return respErr(safeErrorMessage(error, 'Checkout failed'));
  }
}

export const Route = createFileRoute('/api/payment/checkout')({
  server: {
    handlers: { POST },
  },
});

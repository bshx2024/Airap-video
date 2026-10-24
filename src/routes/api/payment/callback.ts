import { createFileRoute } from '@tanstack/react-router';
import { eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { PaymentType } from '@/core/payment/types';
import { order } from '@/config/db/schema';
import { getAllConfigs } from '@/modules/config/service';
import {
  handlePaymentCallback,
  handlePaymentCallbackBySessionId,
} from '@/modules/payment/service';
import { baseLocale, locales, localizeUrl } from '@/paraglide/runtime.js';

/**
 * GET /api/payment/callback?order_no=xxx&redirect=xxx
 * Also accepts checkout_id / session_id when the provider strips order_no.
 *
 * After payment (e.g. Alipay return_url), this endpoint:
 * 1. Queries the payment provider for the latest order status
 * 2. Updates the order in DB if paid (and backfills sub/credits) or failed
 * 3. Redirects to the final destination (same-origin only)
 *
 * Failed / canceled checkouts go to /settings/payments (order list), not
 * /settings/billing (subscriptions only) — billing would look empty.
 */
function resolveSameOriginRedirect(
  input: string | null,
  fallbackUrl: string,
  baseUrl: string
): string {
  if (!input) return fallbackUrl;
  try {
    const appUrl = new URL(baseUrl);
    const target = new URL(input, appUrl);
    if (target.origin !== appUrl.origin) return fallbackUrl;
    // Never bounce through the callback again — unwrap nested redirects.
    if (target.pathname.includes('/api/payment/callback')) {
      const nested = target.searchParams.get('redirect');
      if (nested)
        return resolveSameOriginRedirect(nested, fallbackUrl, baseUrl);
      return fallbackUrl;
    }
    return target.toString();
  } catch {
    return fallbackUrl;
  }
}

function returnLocale(
  request: Request,
  redirect: string | null,
  appUrl: string
): typeof baseLocale {
  if (redirect) {
    try {
      const first = new URL(redirect, appUrl).pathname
        .split('/')
        .filter(Boolean)[0];
      if (first && locales.includes(first as (typeof locales)[number])) {
        return first as typeof baseLocale;
      }
    } catch {
      // fall through to the locale cookie
    }
  }
  const raw = /(?:^|; )PARAGLIDE_LOCALE=([^;]+)/.exec(
    request.headers.get('cookie') || ''
  );
  const cookie = raw ? decodeURIComponent(raw[1]) : '';
  if (locales.includes(cookie as (typeof locales)[number])) {
    return cookie as typeof baseLocale;
  }
  return baseLocale;
}

async function loadOrderStatus(
  orderNo: string | null,
  sessionId: string | null
) {
  if (orderNo) {
    const [row] = await db()
      .select({
        status: order.status,
        orderNo: order.orderNo,
        paymentType: order.paymentType,
      })
      .from(order)
      .where(eq(order.orderNo, orderNo))
      .limit(1);
    return row ?? null;
  }
  if (sessionId) {
    const [row] = await db()
      .select({
        status: order.status,
        orderNo: order.orderNo,
        paymentType: order.paymentType,
      })
      .from(order)
      .where(eq(order.paymentSessionId, sessionId))
      .limit(1);
    return row ?? null;
  }
  return null;
}

async function GET({ request }: { request: Request }) {
  const url = new URL(request.url);
  const orderNo = url.searchParams.get('order_no');
  const checkoutId =
    url.searchParams.get('checkout_id') ||
    url.searchParams.get('session_id') ||
    url.searchParams.get('checkoutId');
  const redirect = url.searchParams.get('redirect');
  const configs = await getAllConfigs();
  const appUrl = configs.app_url || 'http://localhost:3000';

  try {
    if (orderNo) {
      await handlePaymentCallback(orderNo);
    } else if (checkoutId) {
      await handlePaymentCallbackBySessionId(checkoutId);
    }
  } catch (error: any) {
    console.error('payment callback error:', error);
  }

  const ord = await loadOrderStatus(orderNo, checkoutId);
  const status = String(ord?.status || '').toLowerCase();
  const locale = returnLocale(request, redirect, appUrl);
  const returnPath =
    ord?.paymentType === PaymentType.SUBSCRIPTION
      ? '/settings/billing'
      : ord?.paymentType === PaymentType.ONE_TIME
        ? '/settings/credits'
        : null;
  let location = returnPath
    ? localizeUrl(`${appUrl}${returnPath}`, { locale }).href
    : resolveSameOriginRedirect(
        redirect,
        localizeUrl(`${appUrl}/settings/billing`, { locale }).href,
        appUrl
      );

  if (status === 'failed' || status === 'canceled') {
    const payments = new URL(
      localizeUrl(`${appUrl}/settings/payments`, { locale }).href
    );
    payments.searchParams.set('payment', status);
    if (ord?.orderNo) payments.searchParams.set('order_no', ord.orderNo);
    location = payments.toString();
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
    },
  });
}

export const Route = createFileRoute('/api/payment/callback')({
  server: {
    handlers: { GET },
  },
});

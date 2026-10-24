import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  isProviderTimeoutError,
  providerTimeoutMessage,
} from '@/core/payment/timeout';
import {
  changeUserSubscriptionPlan,
  getResubscribeSuggestion,
  PlanChangeError,
} from '@/modules/payment/plan-change-service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';
import { safeErrorMessage } from '@/lib/safe-error-message';

/**
 * POST { product_id, locale?, accept_period_end? } — change the signed-in user's current
 * subscription to another plan. Upgrades apply now (prorated); downgrades
 * (lower tier / yearly→monthly) are booked for the end of the period.
 * Returns { mode: 'checkout' } when the provider can't switch in place —
 * the client then continues with /api/payment/checkout.
 */
async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1000,
    keyPrefix: 'plan-change',
  });
  if (limited) return limited;

  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session?.user) return respErr('Unauthorized');

    const body = await request.json().catch(() => ({}));
    const productId = body?.product_id;
    if (!productId || typeof productId !== 'string') {
      return respErr('Missing product_id');
    }

    const outcome = await changeUserSubscriptionPlan({
      userId: session.user.id,
      userEmail: session.user.email,
      productId,
      locale: typeof body?.locale === 'string' ? body.locale : null,
      acceptPeriodEnd: body?.accept_period_end === true,
    });
    return respData(outcome);
  } catch (error: any) {
    if (error instanceof PlanChangeError) {
      return respJson(-1, error.message, { code: error.code, ...error.data });
    }
    if (isProviderTimeoutError(error)) {
      return respJson(-1, providerTimeoutMessage(error), {
        code: 'provider_timeout',
      });
    }
    const safe = safeErrorMessage(error, 'Plan change failed');
    console.error(
      'plan change error:',
      error?.message || String(error),
      safe === 'Plan change failed' ? '(not passed through to client)' : '',
      error
    );
    return respErr(safe);
  }
}

/** GET — plan to offer after a cancel-then-resubscribe downgrade ended. */
async function GET({ request }: { request: Request }) {
  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session?.user) return respErr('Unauthorized');
    return respData({
      resubscribe: await getResubscribeSuggestion(session.user.id),
    });
  } catch (error: any) {
    console.error('resubscribe suggestion error:', error);
    return respErr(safeErrorMessage(error, 'Request failed'));
  }
}

export const Route = createFileRoute('/api/user/subscriptions/change/')({
  server: {
    handlers: { GET, POST },
  },
});

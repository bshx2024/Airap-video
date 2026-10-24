import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  isProviderTimeoutError,
  providerTimeoutMessage,
} from '@/core/payment/timeout';
import { resumeUserSubscription } from '@/modules/payment/service';
import { respData, respErr, respJson } from '@/lib/resp';
import { safeErrorMessage } from '@/lib/safe-error-message';

/**
 * POST { subscriptionNo } → undo the caller's own scheduled cancel through
 * the provider API (Stripe / Dodo / Creem / Waffo) and return the live subscription.
 * Mirrors /api/user/subscriptions/cancel.
 */
async function POST({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized');

    const body = await request.json().catch(() => ({}));
    const subscriptionNo = body?.subscriptionNo;
    if (!subscriptionNo || typeof subscriptionNo !== 'string') {
      return respErr('subscriptionNo is required');
    }

    const updated = await resumeUserSubscription({
      userId: session.user.id,
      subscriptionNo,
    });
    return respData(updated);
  } catch (error: any) {
    if (isProviderTimeoutError(error)) {
      return respJson(-1, providerTimeoutMessage(error), {
        code: 'provider_timeout',
      });
    }
    // name + message first: a bare Error object can reach the worker log as
    // its stack only, hiding the provider's errors[] (e.g. Waffo 400 reason).
    console.error(
      `resume subscription error: ${error?.name || 'Error'}: ${error?.message || ''}`,
      error?.stack || ''
    );
    return respErr(safeErrorMessage(error, 'Resume failed'));
  }
}

export const Route = createFileRoute('/api/user/subscriptions/resume')({
  server: {
    handlers: { POST },
  },
});

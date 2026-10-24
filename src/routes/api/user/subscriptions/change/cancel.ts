import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  isProviderTimeoutError,
  providerTimeoutMessage,
} from '@/core/payment/timeout';
import {
  cancelUserPlanChange,
  PlanChangeError,
} from '@/modules/payment/plan-change-service';
import { respData, respErr, respJson } from '@/lib/resp';
import { safeErrorMessage } from '@/lib/safe-error-message';

/**
 * POST { subscription_no? } — undo the booked end-of-period plan change
 * (Stripe: release schedule; Dodo: cancel scheduled change). Only the
 * owner's subscription; Waffo/Creem changes cannot be undone.
 */
async function POST({ request }: { request: Request }) {
  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session?.user) return respErr('Unauthorized');

    const body = await request.json().catch(() => ({}));
    const subscriptionNo =
      typeof body?.subscription_no === 'string' ? body.subscription_no : null;

    const updated = await cancelUserPlanChange({
      userId: session.user.id,
      subscriptionNo,
    });
    return respData(updated);
  } catch (error: any) {
    if (error instanceof PlanChangeError) {
      return respJson(-1, error.message, { code: error.code, ...error.data });
    }
    if (isProviderTimeoutError(error)) {
      return respJson(-1, providerTimeoutMessage(error), {
        code: 'provider_timeout',
      });
    }
    console.error('undo plan change error:', error);
    return respErr(safeErrorMessage(error, 'Plan change failed'));
  }
}

export const Route = createFileRoute('/api/user/subscriptions/change/cancel')({
  server: {
    handlers: { POST },
  },
});

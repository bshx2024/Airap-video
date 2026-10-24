import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  discardAwaitingPlanChange,
  PlanChangeError,
} from '@/modules/payment/plan-change-service';
import { respData, respErr, respJson } from '@/lib/resp';
import { safeErrorMessage } from '@/lib/safe-error-message';

/**
 * POST — discard the signed-in user's Waffo plan change that was opened but
 * not confirmed on Waffo's page. Local only: nothing was booked at Waffo.
 */
async function POST({ request }: { request: Request }) {
  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session?.user) return respErr('Unauthorized');
    return respData(
      await discardAwaitingPlanChange({ userId: session.user.id })
    );
  } catch (error: any) {
    if (error instanceof PlanChangeError) {
      return respJson(-1, error.message, { code: error.code, ...error.data });
    }
    console.error('discard plan change error:', error);
    return respErr(safeErrorMessage(error, 'Request failed'));
  }
}

export const Route = createFileRoute('/api/user/subscriptions/change/abandon')({
  server: {
    handlers: { POST },
  },
});

import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  isProviderTimeoutError,
  providerTimeoutMessage,
} from '@/core/payment/timeout';
import { cancelUserSubscription } from '@/modules/payment/service';
import { respData, respErr, respJson } from '@/lib/resp';
import { safeErrorMessage } from '@/lib/safe-error-message';

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

    const updated = await cancelUserSubscription({
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
    console.error('cancel subscription error:', error);
    return respErr(safeErrorMessage(error, 'Cancellation failed'));
  }
}

export const Route = createFileRoute('/api/user/subscriptions/cancel')({
  server: {
    handlers: { POST },
  },
});

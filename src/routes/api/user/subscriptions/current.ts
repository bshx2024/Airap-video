import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getCurrentSubscriptionView } from '@/modules/payment/plan-change-service';
import { respErr, respJson } from '@/lib/resp';

async function GET({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized');

    // + awaiting_confirmation (Waffo change opened, not confirmed yet)
    const sub = await getCurrentSubscriptionView(session.user.id);
    // No live plan → `null` (respData would turn it into `[]`, which the
    // billing/pricing pages read as a subscription).
    return respJson(0, 'ok', sub || null);
  } catch (error: any) {
    return respErr(error.message || 'Internal error');
  }
}

export const Route = createFileRoute('/api/user/subscriptions/current')({
  server: {
    handlers: { GET },
  },
});

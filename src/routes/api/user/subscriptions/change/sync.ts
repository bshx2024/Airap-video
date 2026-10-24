import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { syncAwaitingPlanChange } from '@/modules/payment/plan-change-service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';
import { safeErrorMessage } from '@/lib/safe-error-message';

/**
 * POST — ask Waffo whether the signed-in user's awaiting plan change was
 * confirmed (webhook-independent reconciliation) and return
 * { subscription, sync }. Polled briefly by the billing page after the
 * customer returns from Waffo's confirm page.
 * A processing upgrade (Waffo / Creem) is looked up once overdue, or right
 * away with { force: true } ("Refresh status"); at most once a minute.
 */
async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1000,
    keyPrefix: 'plan-change-sync',
  });
  if (limited) return limited;

  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session?.user) return respErr('Unauthorized');
    const body = await request.json().catch(() => ({}));
    const { view, sync, report } = await syncAwaitingPlanChange(
      session.user.id,
      { force: body?.force === true }
    );
    // report: what Waffo answered per attempt (troubleshooting; no secrets)
    return respData({ subscription: view || null, sync, report });
  } catch (error: any) {
    console.error('plan change sync error:', error);
    return respErr(safeErrorMessage(error, 'Request failed'));
  }
}

export const Route = createFileRoute('/api/user/subscriptions/change/sync')({
  server: {
    handlers: { POST },
  },
});

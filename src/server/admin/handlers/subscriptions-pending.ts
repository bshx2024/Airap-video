import { clearLocalPendingChange } from '@/modules/payment/plan-change-service';
import { syncProcessingUpgrade } from '@/modules/payment/processing-upgrade-sync';
import { findBySubscriptionNo } from '@/modules/subscriptions/service';
import { respData, respErr } from '@/lib/resp';

import type { AdminHandlerContext } from '../types';

// Input is already validated by the operation schema in lib/admin-operations.
async function subscriptionNoFrom(request: Request): Promise<string> {
  if (request.method === 'DELETE') {
    return new URL(request.url).searchParams.get('subscriptionNo') || '';
  }
  const body = (await request.json().catch(() => ({}))) as {
    subscriptionNo?: unknown;
  };
  return typeof body.subscriptionNo === 'string' ? body.subscriptionNo : '';
}

/** POST: ask the provider about a processing upgrade (same path as billing). */
export async function POST({ request, actor }: AdminHandlerContext) {
  try {
    const subscriptionNo = await subscriptionNoFrom(request);
    const sub = await findBySubscriptionNo(subscriptionNo);
    if (!sub) return respErr('Subscription not found', { status: 404 });
    const { state, detail } = await syncProcessingUpgrade(sub, {
      force: true,
    });
    console.log('[admin] subscription pending sync', {
      actor: actor.userId,
      subscriptionNo,
      state,
      detail,
    });
    const fresh = await findBySubscriptionNo(subscriptionNo);
    return respData({ state, detail: detail || null, subscription: fresh });
  } catch (error: any) {
    return respErr(error.message || 'Internal error');
  }
}

/** DELETE: clear the local pending change only (no provider call). */
export async function DELETE({ request, actor }: AdminHandlerContext) {
  try {
    const subscriptionNo = await subscriptionNoFrom(request);
    const sub = await findBySubscriptionNo(subscriptionNo);
    if (!sub) return respErr('Subscription not found', { status: 404 });
    if (!sub.pendingProductId && !sub.pendingChangeType) {
      return respErr('No pending change');
    }
    console.warn('[admin] clear subscription pending change', {
      actor: actor.userId,
      subscriptionNo,
      pendingProductId: sub.pendingProductId,
      pendingChangeType: sub.pendingChangeType,
      pendingEffectiveAt: sub.pendingEffectiveAt,
      providerScheduleId: sub.providerScheduleId,
    });
    const updated = await clearLocalPendingChange(sub);
    return respData({ subscription: updated || null });
  } catch (error: any) {
    return respErr(error.message || 'Internal error');
  }
}

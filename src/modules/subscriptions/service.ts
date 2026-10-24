import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';

import { db } from '@/core/db';
import { effectiveCancelEndAt } from '@/core/payment/period';
import { subscription } from '@/config/db/schema';

export enum SubscriptionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PENDING_CANCEL = 'pending_cancel',
  TRIALING = 'trialing',
  EXPIRED = 'expired',
  PAUSED = 'paused',
}

export type NewSubscription = typeof subscription.$inferInsert;
export type UpdateSubscription = Partial<
  Omit<NewSubscription, 'id' | 'subscriptionNo' | 'createdAt'>
>;

export async function createSubscription(data: NewSubscription) {
  const [result] = await db().insert(subscription).values(data).returning();
  return result;
}

export async function updateBySubscriptionNo(
  subscriptionNo: string,
  data: UpdateSubscription
) {
  const [result] = await db()
    .update(subscription)
    .set(data)
    .where(eq(subscription.subscriptionNo, subscriptionNo))
    .returning();
  return result;
}

export async function findBySubscriptionNo(subscriptionNo: string) {
  const [result] = await db()
    .select()
    .from(subscription)
    .where(eq(subscription.subscriptionNo, subscriptionNo));
  return result;
}

export async function findByProviderSubscriptionId(params: {
  provider: string;
  subscriptionId: string;
}) {
  const [result] = await db()
    .select()
    .from(subscription)
    .where(
      and(
        eq(subscription.paymentProvider, params.provider),
        eq(subscription.subscriptionId, params.subscriptionId)
      )
    );
  return result;
}

/**
 * The user's live subscription (newest first). A PENDING_CANCEL whose
 * paid period has passed counts as ended even if the provider's final
 * webhook never arrived (and for PayPal, whose cancel we hold locally until
 * the paid period ends). When canceledEndAt was wrongly written as "now"
 * (missing provider period), we still treat start+interval as the end.
 */
export async function getCurrentSubscription(userId: string) {
  const now = Date.now();
  const rows = await db()
    .select()
    .from(subscription)
    .where(
      and(
        eq(subscription.userId, userId),
        inArray(subscription.status, [
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.PENDING_CANCEL,
          SubscriptionStatus.TRIALING,
        ]),
        isNull(subscription.deletedAt)
      )
    )
    .orderBy(desc(subscription.createdAt))
    .limit(5);

  for (const row of rows) {
    if (row.status !== SubscriptionStatus.PENDING_CANCEL) return row;
    const end = effectiveCancelEndAt(row, now);
    if (end && end.getTime() > now) return row;
  }
  return null;
}

export async function getSubscriptions(params: {
  userId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { userId, status, page = 1, limit = 30 } = params;
  return db()
    .select()
    .from(subscription)
    .where(
      and(
        userId ? eq(subscription.userId, userId) : undefined,
        status ? eq(subscription.status, status) : undefined
      )
    )
    .orderBy(desc(subscription.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
}

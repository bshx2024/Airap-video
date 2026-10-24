/**
 * DB access for Waffo plan-change orders (hosted confirmation flow).
 * Decisions live in plan-change.ts (pure, unit tested); this file only
 * loads and updates rows.
 */
import { and, asc, desc, eq, gte, inArray, isNull, ne } from 'drizzle-orm';

import { db } from '@/core/db';
import { order } from '@/config/db/schema';

import {
  parseWaffoPlanChangeMarker,
  WAFFO_CONFIRM_TTL_MS,
  WAFFO_CONFIRMED_PREFIX,
  type PlanChangeOrderLike,
  type WaffoPlanChangeMarker,
} from './plan-change';

/** Created / superseded Waffo orders of a user inside the confirm TTL. */
export async function listRecentWaffoPlanChangeOrders(
  userId: string,
  now = Date.now()
): Promise<PlanChangeOrderLike[]> {
  return db()
    .select()
    .from(order)
    .where(
      and(
        eq(order.userId, userId),
        eq(order.paymentProvider, 'waffo'),
        inArray(order.status, ['created', 'canceled']),
        gte(order.createdAt, new Date(now - WAFFO_CONFIRM_TTL_MS)),
        isNull(order.deletedAt)
      )
    )
    .orderBy(desc(order.createdAt))
    .limit(30);
}

/**
 * Supersede unconfirmed plan-change orders: status canceled + marker
 * `superseded`. No provider call: an unconfirmed Waffo session changes
 * nothing. If Waffo still activates one later (old tab), checkout
 * fulfillment claims canceled orders too.
 */
export async function markWaffoPlanChangeOrdersSuperseded(
  orders: PlanChangeOrderLike[]
): Promise<void> {
  // Independent single-row updates: run them together, not one by one.
  await Promise.all(
    orders.map((o) => {
      let info: Record<string, any> = {};
      try {
        info = JSON.parse(o.checkoutInfo || '{}') || {};
      } catch {
        info = {};
      }
      info.planChange = { ...(info.planChange || {}), superseded: true };
      return db()
        .update(order)
        .set({ status: 'canceled', checkoutInfo: JSON.stringify(info) })
        .where(and(eq(order.id, o.id), eq(order.status, 'created')));
    })
  );
}

/**
 * Our order number that started a subscription (the paid checkout or
 * plan-change order, not a renewal). Waffo copies it to every payment of
 * that order as orderMerchantExternalId.
 */
export async function findSubscriptionOriginOrderNo(
  subscriptionNo: string
): Promise<string | null> {
  const [row] = await db()
    .select({ orderNo: order.orderNo })
    .from(order)
    .where(
      and(
        eq(order.subscriptionNo, subscriptionNo),
        ne(order.paymentType, 'renew'),
        eq(order.status, 'paid'),
        isNull(order.deletedAt)
      )
    )
    .orderBy(asc(order.createdAt))
    .limit(1);
  return row?.orderNo || null;
}

/** One order by our order number (null when missing / deleted). */
export async function findOrderByOrderNo(
  orderNo: string
): Promise<(PlanChangeOrderLike & { userId: string }) | null> {
  const [row] = await db()
    .select()
    .from(order)
    .where(and(eq(order.orderNo, orderNo), isNull(order.deletedAt)))
    .limit(1);
  return row || null;
}

/**
 * The plan-change order behind a confirmed Waffo booking. providerScheduleId
 * is either `waffo_confirmed:<our order no>` or Waffo's new order id (kept
 * in the order's marker as confirmedOrderId). Not limited to the confirm
 * TTL: a stuck upgrade is looked up after that window too.
 */
export async function findWaffoPlanChangeOrderForBooking(sub: {
  userId: string;
  subscriptionNo: string;
  providerScheduleId?: string | null;
}): Promise<(PlanChangeOrderLike & { userId: string }) | null> {
  const scheduleId = sub.providerScheduleId || '';
  if (!scheduleId) return null;
  const isOwn = (row: PlanChangeOrderLike | null) =>
    parseWaffoPlanChangeMarker(row?.checkoutInfo)?.fromSubscriptionNo ===
    sub.subscriptionNo;
  if (scheduleId.startsWith(WAFFO_CONFIRMED_PREFIX)) {
    const row = await findOrderByOrderNo(
      scheduleId.slice(WAFFO_CONFIRMED_PREFIX.length)
    );
    return row && isOwn(row) ? row : null;
  }
  const rows = await db()
    .select()
    .from(order)
    .where(
      and(
        eq(order.userId, sub.userId),
        eq(order.paymentProvider, 'waffo'),
        isNull(order.deletedAt)
      )
    )
    .orderBy(desc(order.createdAt))
    .limit(50);
  return (
    rows.find(
      (row: PlanChangeOrderLike) =>
        isOwn(row) &&
        parseWaffoPlanChangeMarker(row.checkoutInfo)?.confirmedOrderId ===
          scheduleId
    ) || null
  );
}

/** Merge `patch` into the order's planChange marker (and set status). */
export async function updateWaffoPlanChangeMarker(
  row: PlanChangeOrderLike,
  patch: Partial<WaffoPlanChangeMarker>,
  status?: string
): Promise<void> {
  let info: Record<string, any> = {};
  try {
    info = JSON.parse(row.checkoutInfo || '{}') || {};
  } catch {
    info = {};
  }
  info.planChange = { ...(info.planChange || {}), ...patch };
  await db()
    .update(order)
    .set({
      checkoutInfo: JSON.stringify(info),
      ...(status ? { status } : {}),
    })
    .where(eq(order.id, row.id));
}

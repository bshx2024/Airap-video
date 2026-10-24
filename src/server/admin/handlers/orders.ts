import { and, count, desc, eq, inArray, type SQL } from 'drizzle-orm';

import { affectedRows, db } from '@/core/db';
import { order, user } from '@/config/db/schema';
import {
  adminUpdateOrder,
  type AdminOrderPatch,
} from '@/modules/payment/order-admin';
import { respErr, respOk, respPage } from '@/lib/resp';
import { keywordMatch } from '@/lib/sql-search';

import type { AdminHandlerContext } from '../types';

const VALID_STATUSES = [
  'pending',
  'created',
  'paid',
  'failed',
  'canceled',
  'abnormal',
  'deleted',
];

export async function GET({ request, actor }: AdminHandlerContext) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('pageSize') || '20'))
    );
    const offset = (page - 1) * pageSize;

    const status = searchParams.get('status');
    const paymentType = searchParams.get('paymentType');
    const search = searchParams.get('search');
    const userId = searchParams.get('userId');

    const conditions: SQL[] = [];
    if (userId) conditions.push(eq(order.userId, userId));
    if (status) conditions.push(eq(order.status, status));
    if (paymentType) conditions.push(eq(order.paymentType, paymentType));
    const keyword = keywordMatch(search, {
      contains: [
        order.orderNo,
        order.userEmail,
        order.paymentEmail,
        user.email,
        user.name,
      ],
      exact: [
        order.userId,
        order.transactionId,
        order.paymentSessionId,
        order.subscriptionId,
      ],
    });
    if (keyword) conditions.push(keyword);

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db()
      .select({ count: count() })
      .from(order)
      .leftJoin(user, eq(order.userId, user.id))
      .where(where);
    const total = totalResult.count;

    const orders = await db()
      .select({
        id: order.id,
        orderNo: order.orderNo,
        userId: order.userId,
        userEmail: order.userEmail,
        status: order.status,
        amount: order.amount,
        currency: order.currency,
        paymentType: order.paymentType,
        paymentProvider: order.paymentProvider,
        productId: order.productId,
        productName: order.productName,
        description: order.description,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        paymentAmount: order.paymentAmount,
        creditsAmount: order.creditsAmount,
        subscriptionNo: order.subscriptionNo,
        refundAmount: order.refundAmount,
        refundedAt: order.refundedAt,
        userName: user.name,
        userImage: user.image,
        userAccountEmail: user.email,
      })
      .from(order)
      .leftJoin(user, eq(order.userId, user.id))
      .where(where)
      .orderBy(desc(order.createdAt))
      .limit(pageSize)
      .offset(offset);

    return respPage(orders, total);
  } catch (error: any) {
    return respErr(error.message || 'Internal error');
  }
}

export async function PATCH({ request, actor }: AdminHandlerContext) {
  try {
    const { orderNo, status, productId, productName, description } =
      await request.json();
    if (!orderNo) return respErr('orderNo is required');
    if (status && !VALID_STATUSES.includes(status))
      return respErr('Invalid status');

    const patch: AdminOrderPatch = {};
    if (status !== undefined) patch.status = status;
    if (productId !== undefined) patch.productId = productId;
    if (productName !== undefined) patch.productName = productName;
    if (description !== undefined) patch.description = description;
    if (Object.keys(patch).length === 0) return respErr('No fields to update');

    const result = await adminUpdateOrder(orderNo, patch);
    if (!result.ok) {
      return respErr(
        result.error === 'status_conflict'
          ? 'Order status changed, please refresh'
          : result.error === 'invalid_status_transition'
            ? 'Only abnormal orders can be marked paid'
            : 'Order not found'
      );
    }
    return respOk();
  } catch (error: any) {
    return respErr(error.message || 'Internal error');
  }
}

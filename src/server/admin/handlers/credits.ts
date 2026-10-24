import { and, count, desc, eq, like, or, type SQL } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiTask, credit, user } from '@/config/db/schema';
import { respErr, respPage } from '@/lib/resp';

import type { AdminHandlerContext } from '../types';

// Project credit ledger: each row joined with the AI task it paid for.
// Unlike the base template there is no default status filter (the admin page
// lists every record); `status` / `userId` narrow it when given.
export async function GET({ request }: AdminHandlerContext) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('pageSize') || '20'))
    );
    const offset = (page - 1) * pageSize;

    const transactionType = searchParams.get('transactionType');
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const search = searchParams.get('search');

    const conditions: SQL[] = [];
    if (userId) conditions.push(eq(credit.userId, userId));
    if (transactionType)
      conditions.push(eq(credit.transactionType, transactionType));
    if (status && status !== 'all') conditions.push(eq(credit.status, status));
    if (search) {
      conditions.push(
        or(
          like(credit.id, `%${search}%`),
          like(credit.transactionNo, `%${search}%`),
          like(credit.userId, `%${search}%`),
          like(user.email, `%${search}%`),
          like(user.name, `%${search}%`)
        )!
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db()
      .select({ count: count() })
      .from(credit)
      .leftJoin(user, eq(user.id, credit.userId))
      .where(where);
    const total = totalResult.count;

    const items = await db()
      .select({
        id: credit.id,
        userId: credit.userId,
        userName: user.name,
        userEmail: user.email,
        userImage: user.image,
        credits: credit.credits,
        remainingCredits: credit.remainingCredits,
        description: credit.description,
        transactionType: credit.transactionType,
        transactionNo: credit.transactionNo,
        transactionScene: credit.transactionScene,
        expiresAt: credit.expiresAt,
        status: credit.status,
        createdAt: credit.createdAt,
        taskId: aiTask.id,
        taskExternalId: aiTask.taskId,
        taskMediaType: aiTask.mediaType,
        taskProvider: aiTask.provider,
        taskModel: aiTask.model,
        taskPrompt: aiTask.prompt,
        taskStatus: aiTask.status,
        taskCreatedAt: aiTask.createdAt,
      })
      .from(credit)
      .leftJoin(user, eq(user.id, credit.userId))
      .leftJoin(aiTask, eq(aiTask.creditId, credit.id))
      .where(where)
      .orderBy(desc(credit.createdAt))
      .limit(pageSize)
      .offset(offset);

    return respPage(items, total);
  } catch (error: any) {
    console.error('Failed to fetch admin credits:', error);
    return respErr('Failed to fetch credits');
  }
}

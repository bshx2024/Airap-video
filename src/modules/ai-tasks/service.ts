import { and, desc, eq, inArray, isNull, lt } from 'drizzle-orm';

import { db } from '@/core/db';
import { envConfigs } from '@/config';
import { aiTask, credit } from '@/config/db/schema';
import { consume, revoke } from '@/modules/credits/service';
import { getUuid } from '@/lib/hash';

export enum AITaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

const NON_TERMINAL_STATUSES = [AITaskStatus.PENDING, AITaskStatus.PROCESSING];

export async function expireTaskIfNeeded(
  taskId: string,
  timeoutMs = 20 * 60 * 1000
) {
  if (envConfigs.database_provider === 'd1') {
    const deadline = new Date(Date.now() - timeoutMs);
    const [expiredTask] = await db()
      .update(aiTask)
      .set({ status: AITaskStatus.FAILED, activeSlot: null })
      .where(
        and(
          eq(aiTask.id, taskId),
          inArray(aiTask.status, NON_TERMINAL_STATUSES),
          lt(aiTask.createdAt, deadline)
        )
      )
      .returning({ creditId: aiTask.creditId, userId: aiTask.userId });

    if (!expiredTask) return false;

    let creditIdToRevoke = expiredTask.creditId;
    if (!creditIdToRevoke) {
      const [record] = await db()
        .select({ id: credit.id })
        .from(credit)
        .where(
          and(
            eq(credit.userId, expiredTask.userId),
            eq(credit.transactionType, 'consume'),
            eq(credit.metadata, JSON.stringify({ taskId }))
          )
        )
        .limit(1);
      if (record) creditIdToRevoke = record.id;
    }
    if (creditIdToRevoke) await revoke(creditIdToRevoke);
    return true;
  }

  // Must not call revoke() inside this transaction: local sqlite wraps
  // writers in a process mutex, and revoke opens its own db() queries /
  // transaction — that deadlocks and leaves /api/ai/generate pending forever.
  let creditIdToRevoke: string | null = null;
  const expired = await db().transaction(async (tx: any) => {
    const [task] = await tx
      .select()
      .from(aiTask)
      .where(eq(aiTask.id, taskId))
      .limit(1)
      .for('update');

    if (
      !task ||
      !NON_TERMINAL_STATUSES.includes(task.status as AITaskStatus) ||
      Date.now() - new Date(task.createdAt).getTime() <= timeoutMs
    ) {
      return false;
    }

    await tx
      .update(aiTask)
      .set({ status: AITaskStatus.FAILED, activeSlot: null })
      .where(eq(aiTask.id, task.id));

    let foundCreditId = task.creditId;
    if (!foundCreditId && task.costCredits > 0) {
      const [record] = await tx
        .select({ id: credit.id })
        .from(credit)
        .where(
          and(
            eq(credit.userId, task.userId),
            eq(credit.transactionType, 'consume'),
            eq(credit.metadata, JSON.stringify({ taskId: task.id }))
          )
        )
        .limit(1);
      if (record) foundCreditId = record.id;
    }

    creditIdToRevoke = foundCreditId || null;
    return true;
  });

  if (expired && creditIdToRevoke) await revoke(creditIdToRevoke);
  return expired;
}

export async function expireTimedOutTasks(limit = 100, userId?: string) {
  const deadline = new Date(Date.now() - 20 * 60 * 1000);
  const tasks = await db()
    .select({ id: aiTask.id })
    .from(aiTask)
    .where(
      and(
        userId ? eq(aiTask.userId, userId) : undefined,
        inArray(aiTask.status, NON_TERMINAL_STATUSES),
        lt(aiTask.createdAt, deadline)
      )
    )
    .limit(limit);

  let expiredCount = 0;
  for (const task of tasks) {
    if (await expireTaskIfNeeded(task.id)) expiredCount++;
  }
  return expiredCount;
}

/**
 * Create an AI task with optional credit consumption.
 */
export async function createTask(params: {
  userId: string;
  mediaType: string;
  provider: string;
  model: string;
  prompt: string;
  costCredits?: number;
  options?: any;
}): Promise<any> {
  const { userId, mediaType, provider, model, prompt, costCredits } = params;

  return db().transaction(async (tx: any) => {
    // 1. Insert task
    const taskData: any = {
      id: getUuid(),
      userId,
      mediaType,
      provider,
      model,
      prompt,
      status: AITaskStatus.PENDING,
      costCredits: costCredits || 0,
    };

    const [task] = await tx.insert(aiTask).values(taskData).returning();

    // 2. Consume credits if cost > 0
    if (costCredits && costCredits > 0) {
      const result = await consume({
        userId,
        credits: costCredits,
        scene: 'ai_task',
        description: `AI ${mediaType} generation`,
        metadata: JSON.stringify({ taskId: task.id }),
        tx,
      });

      if (!result.success) {
        throw new Error('Insufficient credits');
      }

      // Store consumed credit ID for potential revocation
      if (result.consumedCredit) {
        await tx
          .update(aiTask)
          .set({
            taskInfo: JSON.stringify({ creditId: result.consumedCredit.id }),
          })
          .where(eq(aiTask.id, task.id));
      }
    }

    return task;
  });
}

/**
 * Update task status. Revokes credits on failure.
 */
export async function updateTask(params: {
  taskId: string;
  status: AITaskStatus;
  taskResult?: any;
}) {
  const { taskId, status, taskResult } = params;

  const [task] = await db()
    .select()
    .from(aiTask)
    .where(eq(aiTask.id, taskId))
    .limit(1);

  if (!task) throw new Error('Task not found');

  // Update task
  const updateData: any = { status };
  if (
    status === AITaskStatus.SUCCESS ||
    status === AITaskStatus.FAILED ||
    status === AITaskStatus.CANCELED
  ) {
    updateData.activeSlot = null;
  }
  if (taskResult) {
    updateData.taskResult = JSON.stringify(taskResult);
  }

  await db().update(aiTask).set(updateData).where(eq(aiTask.id, taskId));

  // Revoke credits on failure
  if (status === AITaskStatus.FAILED || status === AITaskStatus.CANCELED) {
    let creditId = task.creditId || '';
    if (!creditId && task.taskInfo) {
      try {
        const info = JSON.parse(task.taskInfo as string);
        creditId = typeof info?.creditId === 'string' ? info.creditId : '';
      } catch {
        // Ignore parse errors
      }
    }
    if (creditId) {
      try {
        await revoke(creditId);
      } catch (error) {
        console.error(
          `failed to revoke credits for task ${taskId} (credit ${creditId}):`,
          error
        );
      }
    }
  }
}

/**
 * Get tasks for a user.
 */
export async function getTasks(params: {
  userId: string;
  mediaType?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { userId, mediaType, status, page = 1, limit = 20 } = params;

  return db()
    .select()
    .from(aiTask)
    .where(
      and(
        eq(aiTask.userId, userId),
        mediaType ? eq(aiTask.mediaType, mediaType) : undefined,
        status ? eq(aiTask.status, status) : undefined,
        isNull(aiTask.deletedAt)
      )
    )
    .orderBy(desc(aiTask.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
}

/**
 * Find task by ID.
 */
export async function findTask(taskId: string) {
  const [result] = await db()
    .select()
    .from(aiTask)
    .where(eq(aiTask.id, taskId))
    .limit(1);
  return result;
}

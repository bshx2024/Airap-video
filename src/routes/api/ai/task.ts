import { createFileRoute } from '@tanstack/react-router';
import { and, eq, inArray, isNull, or } from 'drizzle-orm';

import { AITaskStatus } from '@/core/ai/types';
import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { envConfigs } from '@/config';
import { aiTask } from '@/config/db/schema';
import { expireTimedOutTasks } from '@/modules/ai-tasks/service';
import { createAIWebhookToken } from '@/lib/ai-webhook';
import { respData, respErr } from '@/lib/resp';

import { syncSingleTask } from './-task-sync';
import {
  mapConcurrent,
  MAX_POLL_TASKS,
  toPublicTaskResult,
  toTaskResult,
} from './-task-utils';

export { reclaimUserGhostSlots } from './-task-sync';

async function GET({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized');

    void expireTimedOutTasks().catch((err) => {
      console.warn('Background expireTimedOutTasks failed:', err);
    });

    const url = new URL(request.url);
    const rawIds = Array.from(
      new Set(
        (
          url.searchParams.get('taskIds') ||
          url.searchParams.get('taskId') ||
          ''
        )
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );

    if (rawIds.length === 0) {
      return respErr('taskId or taskIds is required');
    }
    if (rawIds.length > MAX_POLL_TASKS) {
      return respErr(
        `At most ${MAX_POLL_TASKS} task IDs are allowed per request`
      );
    }

    if (rawIds.length === 1 && !url.searchParams.get('taskIds')) {
      const taskId = rawIds[0];
      const [existingTask] = await db()
        .select()
        .from(aiTask)
        .where(
          and(
            eq(aiTask.userId, session.user.id),
            isNull(aiTask.deletedAt),
            or(eq(aiTask.taskId, taskId), eq(aiTask.id, taskId))
          )
        )
        .limit(1);

      if (!existingTask) return respErr('Task not found');
      const result = await syncSingleTask(existingTask, taskId);
      return respData(toPublicTaskResult(result));
    }

    const matchingTasks = await db()
      .select()
      .from(aiTask)
      .where(
        and(
          eq(aiTask.userId, session.user.id),
          isNull(aiTask.deletedAt),
          or(inArray(aiTask.id, rawIds), inArray(aiTask.taskId, rawIds))
        )
      );

    const taskResults: any[] = [];
    const pendingTasks: any[] = [];
    const matchedIdSet = new Set(
      matchingTasks.flatMap((t: any) => [t.id, t.taskId]).filter(Boolean)
    );

    for (const rawId of rawIds) {
      if (!matchedIdSet.has(rawId)) {
        taskResults.push({
          id: rawId,
          taskId: rawId,
          taskStatus: 'failed',
          error: 'Task not found or expired',
        });
      }
    }

    for (const t of matchingTasks) {
      const isTerminal =
        t.status === 'success' ||
        t.status === 'failed' ||
        t.status === 'canceled';
      if (isTerminal) {
        taskResults.push(toTaskResult(t, t.taskId || t.id));
      } else {
        pendingTasks.push(t);
      }
    }

    const MAX_VENDOR_SYNCS_PER_BATCH = 4;
    const batchOffset = Math.max(
      0,
      parseInt(
        url.searchParams.get('batchOffset') ||
          url.searchParams.get('offset') ||
          '0',
        10
      ) || 0
    );

    let tasksToSync: any[] = [];
    let deferredTasks: any[] = [];

    if (pendingTasks.length <= MAX_VENDOR_SYNCS_PER_BATCH) {
      tasksToSync = pendingTasks;
    } else {
      pendingTasks.sort((a, b) => {
        const timeA = new Date(
          a.pollLeaseExpiresAt || a.updatedAt || a.createdAt || 0
        ).getTime();
        const timeB = new Date(
          b.pollLeaseExpiresAt || b.updatedAt || b.createdAt || 0
        ).getTime();
        return timeA - timeB;
      });
      const start = batchOffset % pendingTasks.length;
      const selectedIndices = new Set<number>();
      for (let i = 0; i < MAX_VENDOR_SYNCS_PER_BATCH; i++) {
        const idx = (start + i) % pendingTasks.length;
        selectedIndices.add(idx);
        tasksToSync.push(pendingTasks[idx]);
      }
      deferredTasks = pendingTasks.filter(
        (_, idx) => !selectedIndices.has(idx)
      );
    }

    for (const dt of deferredTasks) {
      taskResults.push(toTaskResult(dt, dt.taskId || dt.id));
    }

    if (tasksToSync.length > 0) {
      const syncedResults = await mapConcurrent(
        tasksToSync,
        2,
        async (t: any) => {
          try {
            return await syncSingleTask(t, t.taskId || t.id);
          } catch {
            return toTaskResult(t, t.taskId || t.id);
          }
        }
      );
      taskResults.push(...syncedResults);
    }

    return respData({ tasks: taskResults.map(toPublicTaskResult) });
  } catch (error: any) {
    console.error('AI task query failed:', error);
    return respErr('Failed to query AI task');
  }
}

async function DELETE({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized');

    const url = new URL(request.url);
    const taskId = url.searchParams.get('taskId');
    if (!taskId) {
      return respErr('taskId is required');
    }

    const [task] = await db()
      .select({ id: aiTask.id, status: aiTask.status })
      .from(aiTask)
      .where(
        and(
          eq(aiTask.userId, session.user.id),
          isNull(aiTask.deletedAt),
          or(eq(aiTask.taskId, taskId), eq(aiTask.id, taskId))
        )
      )
      .limit(1);

    if (!task) return respErr('Task not found');

    // Keep activeSlot for in-flight tasks so soft-delete cannot free the
    // concurrency slot and immediately start more provider jobs. Expire /
    // terminal sync still clears the slot later.
    const isInFlight =
      task.status === AITaskStatus.PENDING ||
      task.status === AITaskStatus.PROCESSING;

    await db()
      .update(aiTask)
      .set({
        deletedAt: new Date(),
        ...(isInFlight ? {} : { activeSlot: null }),
        pollLeaseId: null,
        pollLeaseExpiresAt: null,
      })
      .where(and(eq(aiTask.id, task.id), isNull(aiTask.deletedAt)));

    return respData({ success: true });
  } catch (error: any) {
    console.error('Failed to delete AI task:', error);
    return respErr('Failed to delete AI task');
  }
}

async function POST({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const queryId =
      url.searchParams.get('taskId') ||
      url.searchParams.get('dbTaskId') ||
      url.searchParams.get('id');

    const webhookToken = url.searchParams.get('token');
    if (
      !queryId ||
      !webhookToken ||
      !envConfigs.auth_secret ||
      webhookToken !==
        (await createAIWebhookToken(queryId, envConfigs.auth_secret))
    ) {
      return respErr('Invalid webhook token', { status: 401 });
    }

    let body: any = {};
    try {
      const text = await request.text();
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = Object.fromEntries(new URLSearchParams(text));
        }
      }
    } catch {
      // Body may be empty or unparseable
    }

    const vendorIdFromBody = [
      body?.id,
      body?.taskId,
      body?.task_id,
      body?.request_id,
      body?.data?.taskId,
      body?.data?.task_id,
      body?.data?.id,
    ].find((id): id is string => typeof id === 'string' && Boolean(id.trim()));

    const candidateIds = Array.from(
      new Set(
        [queryId, vendorIdFromBody]
          .filter(
            (id): id is string => typeof id === 'string' && Boolean(id.trim())
          )
          .map((id) => id.trim())
      )
    );

    if (candidateIds.length === 0) {
      return respErr('Missing task identifier in webhook payload', {
        status: 400,
      });
    }

    const [existingTask] = await db()
      .select()
      .from(aiTask)
      .where(
        and(
          isNull(aiTask.deletedAt),
          or(
            inArray(aiTask.id, candidateIds),
            inArray(aiTask.taskId, candidateIds)
          )
        )
      )
      .limit(1);

    if (!existingTask) {
      return respErr('Task not found', { status: 404 });
    }

    if (!existingTask.taskId && vendorIdFromBody) {
      existingTask.taskId = vendorIdFromBody;
      await db()
        .update(aiTask)
        .set({ taskId: vendorIdFromBody })
        .where(eq(aiTask.id, existingTask.id))
        .catch(() => {});
    }

    const isTerminal =
      existingTask.status === 'success' ||
      existingTask.status === 'failed' ||
      existingTask.status === 'canceled';

    if (isTerminal) {
      return respData({
        success: true,
        message: 'Task already completed',
        status: existingTask.status,
      });
    }

    const syncResult = await syncSingleTask(
      existingTask,
      existingTask.taskId || existingTask.id
    );

    const isNowTerminal =
      syncResult.taskStatus === AITaskStatus.SUCCESS ||
      syncResult.taskStatus === AITaskStatus.FAILED ||
      syncResult.taskStatus === AITaskStatus.CANCELED;

    if (syncResult.syncError || !isNowTerminal) {
      console.warn(
        `Webhook sync did not finalize task ${existingTask.id}: status=${syncResult.taskStatus}, error=${syncResult.syncError?.message}`
      );
    }

    return respData({
      success: true,
      status: syncResult.taskStatus,
      taskId: existingTask.id,
    });
  } catch (error: any) {
    console.error('AI task webhook failed:', error);
    return respErr('Failed to process AI task webhook');
  }
}

export const Route = createFileRoute('/api/ai/task')({
  server: {
    handlers: { GET, POST, DELETE },
  },
});

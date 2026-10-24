import { extractAudioUrl, extractMediaUrl } from '@/core/ai';
import { apiGet } from '@/lib/api-client';

import {
  getActiveHeldTaskLocks,
  getBroadcastChannel,
  isTaskForegroundPolled,
  withAcquiredTaskLocks,
} from './channel';
import {
  getLocalCreations,
  removeLocalCreationOnly,
  saveLocalCreation,
} from './storage';

let globalPollerTimer: ReturnType<typeof setTimeout> | null = null;
let isPollingInProgress = false;
let pollStartQueued = false;
let batchPollOffset = 0;
const MAX_BATCH_POLL_TASKS = 4;
const missingTaskPollCounts = new Map<string, number>();
const MISSING_TASK_RETRY_LIMIT = 3;

/**
 * 统一合并轮询后台生成中的任务，排除当前前台正在独立轮询的任务。
 * A single global poller handles every media type so concurrent generators
 * cannot cancel one another's scheduled batch.
 */
export function pollPendingCreationTasks(
  _scopedMediaType?: 'image' | 'video' | 'music'
) {
  if (typeof window === 'undefined') return;

  const list = getLocalCreations();
  const hasPending = list.some(
    (item) => item.status === 'pending' || item.status === 'processing'
  );

  if (!hasPending) {
    if (globalPollerTimer) {
      clearTimeout(globalPollerTimer);
      globalPollerTimer = null;
    }
    return;
  }

  if (globalPollerTimer || isPollingInProgress || pollStartQueued) return;

  pollStartQueued = true;
  const runBatchPoll = async () => {
    globalPollerTimer = null;
    pollStartQueued = false;

    const executeBatch = async () => {
      const currentList = getLocalCreations();
      const hasAnyPending = currentList.some(
        (item) => item.status === 'pending' || item.status === 'processing'
      );
      if (!hasAnyPending) {
        batchPollOffset = 0;
        if (globalPollerTimer) {
          clearTimeout(globalPollerTimer);
          globalPollerTimer = null;
        }
        isPollingInProgress = false;
        return;
      }

      const heldLocks = await getActiveHeldTaskLocks();
      const pendingItems = currentList.filter((item) => {
        const isPending =
          item.status === 'pending' || item.status === 'processing';
        if (!isPending) return false;
        if (isTaskForegroundPolled(item.id)) return false;
        if (heldLocks.has(item.id)) return false;
        return true;
      });

      if (pendingItems.length === 0) {
        // All pending tasks are currently held by other tabs or foreground.
        // Keep the timer alive so this tab can take over if the holder closes.
        isPollingInProgress = false;
        if (!globalPollerTimer) {
          globalPollerTimer = setTimeout(runBatchPoll, 3000);
        }
        return;
      }

      isPollingInProgress = true;
      try {
        const candidateItems = Array.from(
          { length: Math.min(MAX_BATCH_POLL_TASKS, pendingItems.length) },
          (_, index) =>
            pendingItems[(batchPollOffset + index) % pendingItems.length]
        );
        batchPollOffset =
          (batchPollOffset + candidateItems.length) % pendingItems.length;

        const candidateIds = candidateItems.map((item) => item.id);

        await withAcquiredTaskLocks(candidateIds, async (lockedIds) => {
          const effectiveIds =
            typeof navigator !== 'undefined' && 'locks' in navigator
              ? lockedIds
              : candidateIds;

          if (effectiveIds.length === 0) {
            return;
          }

          const batchItems = candidateItems.filter((item) =>
            effectiveIds.includes(item.id)
          );
          const taskIds = batchItems.map((item) => item.id).join(',');
          const res: any = await apiGet(
            `/api/ai/task?taskIds=${encodeURIComponent(taskIds)}&batchOffset=${batchPollOffset}`
          );

          const taskList: any[] = Array.isArray(res?.tasks)
            ? res.tasks
            : res
              ? [res]
              : [];

          // 仅在连续多次未返回后清理失效任务，避免短暂接口异常误删正在生成的任务。
          const returnedIds = new Set(
            taskList.flatMap((task) => [task?.id, task?.taskId]).filter(Boolean)
          );
          for (const item of batchItems) {
            if (returnedIds.has(item.id)) {
              missingTaskPollCounts.delete(item.id);
              continue;
            }
            const missedCount = (missingTaskPollCounts.get(item.id) || 0) + 1;
            if (missedCount >= MISSING_TASK_RETRY_LIMIT) {
              missingTaskPollCounts.delete(item.id);
              removeLocalCreationOnly(item.id);
            } else {
              missingTaskPollCounts.set(item.id, missedCount);
            }
          }

          for (const t of taskList) {
            const item = batchItems.find(
              (p) => p.id === t.taskId || p.id === t.id
            );
            if (!item) continue;

            if (t.taskStatus === 'success') {
              const mainUrl =
                item.mediaType === 'music'
                  ? extractAudioUrl(t)
                  : extractMediaUrl(t);
              if (mainUrl) {
                saveLocalCreation({
                  ...item,
                  url: mainUrl,
                  status: 'success',
                });
                window.dispatchEvent(
                  new CustomEvent('imagegen_creation_task_completed', {
                    detail: { taskId: item.id, status: 'success' },
                  })
                );
                getBroadcastChannel()?.postMessage({
                  type: 'TASK_COMPLETED',
                  taskId: item.id,
                  status: 'success',
                });
              } else {
                saveLocalCreation({
                  ...item,
                  url: '',
                  status: 'failed',
                  errorCode: 'generation_failed',
                });
                window.dispatchEvent(
                  new CustomEvent('imagegen_creation_task_completed', {
                    detail: {
                      taskId: item.id,
                      status: 'failed',
                      errorCode: 'generation_failed',
                    },
                  })
                );
                getBroadcastChannel()?.postMessage({
                  type: 'TASK_COMPLETED',
                  taskId: item.id,
                  status: 'failed',
                  errorCode: 'generation_failed',
                });
              }
            } else if (
              t.taskStatus === 'failed' ||
              t.taskStatus === 'canceled'
            ) {
              const errorCode = t.taskInfo?.userErrorCode;
              saveLocalCreation({
                ...item,
                status: 'failed',
                errorCode,
              });
              window.dispatchEvent(
                new CustomEvent('imagegen_creation_task_completed', {
                  detail: { taskId: item.id, status: 'failed', errorCode },
                })
              );
              getBroadcastChannel()?.postMessage({
                type: 'TASK_COMPLETED',
                taskId: item.id,
                status: 'failed',
                errorCode,
              });
            }
          }
        });
      } catch (e) {
        console.warn('Batch poll error:', e);
      } finally {
        isPollingInProgress = false;
        const latestList = getLocalCreations();
        const hasAnyPending = latestList.some(
          (item) => item.status === 'pending' || item.status === 'processing'
        );

        if (hasAnyPending) {
          if (!globalPollerTimer) {
            globalPollerTimer = setTimeout(runBatchPoll, 3000);
          }
        } else {
          if (globalPollerTimer) {
            clearTimeout(globalPollerTimer);
            globalPollerTimer = null;
          }
        }
      }
    };

    if (typeof navigator !== 'undefined' && 'locks' in navigator) {
      await navigator.locks.request(
        'imagegen_batch_poller_lock',
        { ifAvailable: true },
        async (lock) => {
          if (!lock) {
            isPollingInProgress = false;
            // Another tab is currently running the batch poll.
            // Ensure this tab has a timer to take over if the leader tab is closed.
            const currentList = getLocalCreations();
            const hasAnyPending = currentList.some(
              (item) =>
                item.status === 'pending' || item.status === 'processing'
            );
            if (hasAnyPending && !globalPollerTimer) {
              globalPollerTimer = setTimeout(
                runBatchPoll,
                3000 + Math.floor(Math.random() * 500)
              );
            }
            return;
          }
          await executeBatch();
        }
      );
    } else {
      await executeBatch();
    }
  };

  // Let foreground polling register its task before starting the background
  // batch poll (saveLocalCreation broadcasts synchronously).
  queueMicrotask(() => void runBatchPoll());
}

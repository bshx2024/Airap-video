export const activePollerSet = new Set<string>();

const CHANNEL_NAME = 'imagegen_creation_channel';
let creationBroadcastChannel: BroadcastChannel | null = null;
const crossTabActivePollerMap = new Map<string, number>();

export const getTaskLockName = (taskId: string) =>
  `imagegen_task_poll_${taskId}`;

export async function getActiveHeldTaskLocks(): Promise<Set<string>> {
  if (
    typeof navigator !== 'undefined' &&
    'locks' in navigator &&
    typeof navigator.locks.query === 'function'
  ) {
    try {
      const state = await navigator.locks.query();
      const held = new Set<string>();
      for (const lock of state.held || []) {
        if (lock.name && lock.name.startsWith('imagegen_task_poll_')) {
          held.add(lock.name.slice('imagegen_task_poll_'.length));
        }
      }
      return held;
    } catch {
      return new Set();
    }
  }
  return new Set();
}

/**
 * 递归获取一组任务的专属锁（使用 ifAvailable: true 非阻塞尝试），
 * 仅对成功锁定（未被前台占用）的任务执行回调，并在整个请求与状态落库期间持续持有锁。
 */
export async function withAcquiredTaskLocks<T>(
  taskIds: string[],
  fn: (lockedIds: string[]) => Promise<T>,
  lockedIds: string[] = [],
  index: number = 0
): Promise<T> {
  if (
    typeof navigator === 'undefined' ||
    !('locks' in navigator) ||
    index >= taskIds.length
  ) {
    return fn(lockedIds);
  }
  const currentId = taskIds[index];
  return navigator.locks.request(
    getTaskLockName(currentId),
    { ifAvailable: true },
    async (lock) => {
      if (lock) {
        return withAcquiredTaskLocks(
          taskIds,
          fn,
          [...lockedIds, currentId],
          index + 1
        );
      } else {
        return withAcquiredTaskLocks(taskIds, fn, lockedIds, index + 1);
      }
    }
  );
}

export function getBroadcastChannel(): BroadcastChannel | null {
  if (
    typeof window === 'undefined' ||
    typeof BroadcastChannel === 'undefined'
  ) {
    return null;
  }
  if (!creationBroadcastChannel) {
    try {
      creationBroadcastChannel = new BroadcastChannel(CHANNEL_NAME);
      creationBroadcastChannel.onmessage = (event) => {
        const data = event.data;
        if (!data || typeof data !== 'object') return;

        if (data.type === 'POLLER_CLAIM' && typeof data.taskId === 'string') {
          crossTabActivePollerMap.set(data.taskId, Date.now());
        } else if (
          data.type === 'POLLER_RELEASE' &&
          typeof data.taskId === 'string'
        ) {
          crossTabActivePollerMap.delete(data.taskId);
        } else if (data.type === 'POLLER_DISCOVERY_PING') {
          for (const tid of activePollerSet) {
            getBroadcastChannel()?.postMessage({
              type: 'POLLER_CLAIM',
              taskId: tid,
            });
          }
        } else if (data.type === 'CREATION_DELETED') {
          window.dispatchEvent(
            new CustomEvent('imagegen_creation_deleted', {
              detail: { id: data.id, item: data.item },
            })
          );
        } else if (data.type === 'CREATIONS_UPDATED') {
          window.dispatchEvent(new Event('imagegen_creations_updated'));
        } else if (data.type === 'TASK_COMPLETED' && data.taskId) {
          crossTabActivePollerMap.delete(data.taskId);
          window.dispatchEvent(
            new CustomEvent('imagegen_creation_task_completed', {
              detail: {
                taskId: data.taskId,
                status: data.status,
                errorCode: data.errorCode,
              },
            })
          );
          window.dispatchEvent(new Event('imagegen_creations_updated'));
        } else if (data.type === 'TASK_PROGRESS' && data.taskId && data.res) {
          window.dispatchEvent(
            new CustomEvent('imagegen_creation_task_progress', {
              detail: { taskId: data.taskId, res: data.res },
            })
          );
        }
      };
      creationBroadcastChannel.postMessage({ type: 'POLLER_DISCOVERY_PING' });
    } catch {
      creationBroadcastChannel = null;
    }
  }
  return creationBroadcastChannel;
}

export function claimForegroundPoller(taskId: string) {
  activePollerSet.add(taskId);
  crossTabActivePollerMap.set(taskId, Date.now());
  getBroadcastChannel()?.postMessage({ type: 'POLLER_CLAIM', taskId });
}

export function releaseForegroundPoller(taskId: string) {
  activePollerSet.delete(taskId);
  crossTabActivePollerMap.delete(taskId);
  getBroadcastChannel()?.postMessage({ type: 'POLLER_RELEASE', taskId });
}

export function isTaskForegroundPolled(taskId: string): boolean {
  if (activePollerSet.has(taskId)) return true;
  const claimTime = crossTabActivePollerMap.get(taskId);
  if (!claimTime) return false;
  if (Date.now() - claimTime > 10000) {
    crossTabActivePollerMap.delete(taskId);
    return false;
  }
  return true;
}

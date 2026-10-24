import { getLocalCreations } from '@/modules/creations/storage';
import type { CreationItem } from '@/modules/creations/types';

/** 首页视频生成器当前任务：刷新后回显生成中 / 成功结果 */
const HOME_HERO_TASK_KEY = 'videogen_home_hero_task';

export function persistHomeHeroTaskId(taskId: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (!taskId) sessionStorage.removeItem(HOME_HERO_TASK_KEY);
    else sessionStorage.setItem(HOME_HERO_TASK_KEY, taskId);
  } catch {
    // ignore quota / private mode
  }
}

export function readHomeHeroTaskId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(HOME_HERO_TASK_KEY);
  } catch {
    return null;
  }
}

export function findCreationByTaskId(taskId: string): CreationItem | undefined {
  return getLocalCreations().find(
    (item) =>
      item.mediaType === 'video' && (item.id === taskId || item.dbId === taskId)
  );
}

export function creationMatchesTaskId(
  item: CreationItem,
  taskId: string | null | undefined
): boolean {
  if (!taskId) return false;
  return item.id === taskId || item.dbId === taskId;
}

export function isHeroTaskPending(item: CreationItem): boolean {
  return item.status === 'pending' || item.status === 'processing';
}

export function isHeroTaskFailed(item: CreationItem): boolean {
  return item.status === 'failed';
}

/** 有 url 且非进行中/失败即视为成功（兼容缺 status 的旧缓存） */
export function isHeroTaskSuccess(item: CreationItem): boolean {
  return (
    Boolean(item.url) && !isHeroTaskPending(item) && !isHeroTaskFailed(item)
  );
}

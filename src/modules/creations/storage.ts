import { apiDelete, apiGet } from '@/lib/api-client';

import { getBroadcastChannel } from './channel';
import type { CreationItem } from './types';

const STORAGE_KEY = 'imagegen_user_creations';

/**
 * 校验作品数据格式合法性
 */
function isValidCreation(item: unknown): item is CreationItem {
  if (!item || typeof item !== 'object') return false;
  const creation = item as CreationItem;
  if (!['image', 'video', 'music'].includes(creation.mediaType)) return false;
  if (!Number.isFinite(creation.createdAt)) return false;
  if (
    creation.status === 'pending' ||
    creation.status === 'processing' ||
    creation.status === 'failed'
  ) {
    return typeof creation.prompt === 'string';
  }
  if (typeof creation.url !== 'string' || !creation.url) return false;
  try {
    const url = new URL(creation.url, window.location.origin);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 根据作品属性推断对应的创作模式 (text-to-image / image-to-image / png-maker 等)
 */
export function inferCreationMode(item: Partial<CreationItem>): string {
  if (item.mode) return item.mode;
  if (item.mediaType === 'video') return 'text-to-video';
  if (item.mediaType === 'music') return 'text-to-music';
  if (
    item.prompt?.includes('移除图片主体之外的所有背景') ||
    item.prompt?.toLowerCase().includes('png')
  ) {
    return 'png-maker';
  }
  return 'text-to-image';
}

/**
 * 获取本地缓存的所有作品列表
 */
export function getLocalCreations(): CreationItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: CreationItem[] = JSON.parse(raw);
    const valid = list
      .filter((item) => isValidCreation(item))
      .map((item) => {
        const isMockCover =
          item.thumbnailUrl?.includes('text-to-video-ai-cover.webp') &&
          item.url &&
          !item.url.includes('mock');
        return {
          ...item,
          thumbnailUrl: isMockCover ? undefined : item.thumbnailUrl,
          mode: item.mode || inferCreationMode(item),
        };
      });
    if (valid.length !== list.length || !localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    }
    return valid.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

let syncPromise: Promise<CreationItem[]> | null = null;
let lastSyncTime = 0;

function isSameCreation(
  a: CreationItem & { dbId?: string },
  b: CreationItem & { dbId?: string }
) {
  if (a.id === b.id) return true;
  if (a.dbId && (a.dbId === b.id || a.dbId === b.dbId)) return true;
  if (b.dbId && (b.dbId === a.id || b.dbId === a.dbId)) return true;
  return false;
}

/**
 * 从服务端 API 同步当前登录用户的云端历史生成作品，并合并到本地缓存（带请求去重与防抖缓存）
 */
export async function syncUserCreations(
  force = false
): Promise<CreationItem[]> {
  if (typeof window === 'undefined') return [];
  if (syncPromise) return syncPromise;

  const now = Date.now();
  if (!force && now - lastSyncTime < 5000) {
    return getLocalCreations();
  }

  syncPromise = (async () => {
    try {
      const res: any = await apiGet('/api/ai/creations');
      lastSyncTime = Date.now();
      const items =
        res?.items || res?.data || (Array.isArray(res) ? res : null);
      if (items && Array.isArray(items)) {
        const local = getLocalCreations();
        const map = new Map<string, CreationItem>();
        // 写入服务端作品（按 id/dbId 去重，避免与本地乐观写入重复）
        items.forEach((item: CreationItem) => {
          if (!isValidCreation(item)) return;
          // 本地已终态时，禁止用服务端仍 pending/processing 覆盖（避免失败任务被再次激活进轮询）
          const localMatch = local.find((l) => isSameCreation(l, item));
          if (
            localMatch &&
            (localMatch.status === 'success' ||
              localMatch.status === 'failed') &&
            (item.status === 'pending' || item.status === 'processing')
          ) {
            for (const [key, existing] of map) {
              if (isSameCreation(existing, localMatch)) {
                map.delete(key);
                break;
              }
            }
            map.set(localMatch.id, {
              ...item,
              ...localMatch,
              id: localMatch.id || item.id,
              dbId: localMatch.dbId || item.dbId,
              pageKey: localMatch.pageKey || item.pageKey,
              mode: localMatch.mode || item.mode,
            });
            return;
          }
          for (const [key, existing] of map) {
            if (isSameCreation(existing, item)) {
              map.delete(key);
              break;
            }
          }
          map.set(item.id, item);
        });
        // 仅保留本地新创建但仍在处理中的临时任务，以及最近 2 分钟内创建的本地新作品（避免服务端生成落库并发延迟导致新任务被覆盖抹除）
        const twoMinutesAgo = now - 2 * 60 * 1000;
        const mergeLocalItem = (item: CreationItem) => {
          if (!isValidCreation(item)) return;
          let existingKey: string | null = null;
          for (const [key, existing] of map) {
            if (isSameCreation(existing, item)) {
              existingKey = key;
              break;
            }
          }
          if (existingKey) {
            const existing = map.get(existingKey)!;
            const localTerminal =
              item.status === 'success' || item.status === 'failed';
            const serverPending =
              existing.status === 'pending' || existing.status === 'processing';
            // 本地已终态时优先保留，避免同步途中被较旧的 processing 覆盖
            if (
              localTerminal &&
              (serverPending || (!existing.url && item.url))
            ) {
              map.set(existingKey, {
                ...existing,
                ...item,
                id: item.id || existing.id,
                dbId: item.dbId || existing.dbId,
                // API 不落库的客户端字段必须保留，否则切页/刷新无法恢复「近期创作」
                pageKey: item.pageKey || existing.pageKey,
                mode: item.mode || existing.mode,
              });
            } else if (item.pageKey || item.mode) {
              map.set(existingKey, {
                ...existing,
                pageKey: item.pageKey || existing.pageKey,
                mode: item.mode || existing.mode,
              });
            }
            return;
          }
          if (
            item.status === 'pending' ||
            item.status === 'processing' ||
            item.createdAt >= twoMinutesAgo
          ) {
            map.set(item.id, item);
          }
        };
        local.forEach(mergeLocalItem);
        // 合并期间可能有新的 saveLocalCreation，写入前再读一次避免覆盖
        getLocalCreations().forEach(mergeLocalItem);
        const merged = Array.from(map.values()).sort(
          (a, b) => b.createdAt - a.createdAt
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        window.dispatchEvent(new Event('imagegen_creations_updated'));

        // 对本地超过 20 分钟仍 processing 的任务，静默触发一次 poll，
        // 让服务端超时逻辑（task.ts）立即判断并标记失败/退还积分，
        // 无需等待用户下次手动触发轮询
        const twentyMinutesAgo = now - 20 * 60 * 1000;
        merged.forEach((item) => {
          if (
            (item.status === 'processing' || item.status === 'pending') &&
            item.createdAt < twentyMinutesAgo
          ) {
            void apiGet(`/api/ai/task?taskId=${encodeURIComponent(item.id)}`)
              .then((res: any) => {
                if (res?.taskStatus === 'failed' || res?.status === 'failed') {
                  const current = getLocalCreations();
                  const idx = current.findIndex((c) => c.id === item.id);
                  if (idx !== -1) {
                    current[idx] = { ...current[idx], status: 'failed' };
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
                    window.dispatchEvent(
                      new Event('imagegen_creations_updated')
                    );
                  }
                }
              })
              .catch(() => {});
          }
        });

        return merged;
      }
    } catch (e) {
      console.error('Failed to sync creations with server', e);
    } finally {
      syncPromise = null;
    }
    return getLocalCreations();
  })();

  return syncPromise;
}

/**
 * 缓存新生成的作品并广播更新事件
 */
export function saveLocalCreation(
  item: Omit<CreationItem, 'createdAt'> & { createdAt?: number }
) {
  if (typeof window === 'undefined') return;
  if (!isValidCreation({ ...item, createdAt: item.createdAt || Date.now() }))
    return;
  try {
    const list = getLocalCreations();
    const existingIndex = list.findIndex(
      (i) =>
        i.id === item.id ||
        (item.dbId && (i.id === item.dbId || i.dbId === item.dbId)) ||
        (i.dbId && (i.dbId === item.id || i.dbId === item.dbId))
    );
    let updated: CreationItem[];
    if (existingIndex >= 0) {
      const existing = list[existingIndex];
      const existingIsTerminal =
        existing.status === 'success' || existing.status === 'failed';
      const incomingIsTerminal =
        item.status === 'success' || item.status === 'failed';
      if (
        existingIsTerminal &&
        (!incomingIsTerminal || existing.status === 'success')
      ) {
        return;
      }
      const updatedItem: CreationItem = {
        ...existing,
        ...item,
        id: item.id || existing.id,
        dbId: item.dbId || existing.dbId,
        createdAt: item.createdAt || existing.createdAt,
      };
      updated = list.filter((_, idx) => idx !== existingIndex);
      // Drop any other duplicates that share id/dbId
      updated = updated.filter((i) => !isSameCreation(i, updatedItem));
      updated = [updatedItem, ...updated];
    } else {
      const newItem: CreationItem = {
        ...item,
        createdAt: item.createdAt || Date.now(),
      };
      updated = [newItem, ...list.filter((i) => !isSameCreation(i, newItem))];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('imagegen_creations_updated'));
    getBroadcastChannel()?.postMessage({ type: 'CREATIONS_UPDATED' });
  } catch (e) {
    console.error('Failed to save creation to storage', e);
  }
}

/**
 * 仅从本地缓存移除指定条目（不发起服务端删除请求），用于清理临时乐观占位 ID
 */
export function removeLocalCreationOnly(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const list = getLocalCreations();
    const updated = list.filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('imagegen_creations_updated'));
    getBroadcastChannel()?.postMessage({ type: 'CREATIONS_UPDATED' });
  } catch (e) {
    console.error('Failed to remove local creation', e);
  }
}

/**
 * 删除指定作品（同时发起服务端删除请求）
 */
export function removeLocalCreation(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const list = getLocalCreations();
    const itemToDelete = list.find((i) => i.id === id);
    const updated = list.filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // 记录删除的唯一标识符（id, dbId, taskId）供画廊组件精准乐观过滤
    try {
      const stored = JSON.parse(
        sessionStorage.getItem('imagegen_deleted_creation_keys') || '[]'
      );
      const keysToAdd: string[] = [
        id,
        (itemToDelete as any)?.dbId,
        (itemToDelete as any)?.taskId,
      ].filter(
        (k): k is string =>
          typeof k === 'string' &&
          Boolean(k.trim()) &&
          !k.startsWith('http://') &&
          !k.startsWith('https://')
      );

      const validStored = (Array.isArray(stored) ? stored : []).filter(
        (k) =>
          typeof k === 'string' &&
          !k.startsWith('http://') &&
          !k.startsWith('https://')
      );

      const nextKeys = Array.from(
        new Set([...validStored, ...keysToAdd])
      ).slice(-100);
      sessionStorage.setItem(
        'imagegen_deleted_creation_keys',
        JSON.stringify(nextKeys)
      );
    } catch {}

    window.dispatchEvent(
      new CustomEvent('imagegen_creation_deleted', {
        detail: { id, item: itemToDelete },
      })
    );
    window.dispatchEvent(new Event('imagegen_creations_updated'));
    getBroadcastChannel()?.postMessage({
      type: 'CREATION_DELETED',
      id,
      item: itemToDelete,
    });
    getBroadcastChannel()?.postMessage({ type: 'CREATIONS_UPDATED' });

    // 异步同步到后端数据库
    void apiDelete(`/api/ai/task?taskId=${encodeURIComponent(id)}`)
      .catch(() => {
        // 忽略游客或已删除错误
      })
      .finally(() => {
        window.dispatchEvent(new Event('imagegen_creations_updated'));
        getBroadcastChannel()?.postMessage({ type: 'CREATIONS_UPDATED' });
      });
  } catch (e) {
    console.error('Failed to delete creation', e);
  }
}

/**
 * 用户退出登录时清理本地缓存作品数据
 */
export function clearLocalCreations() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('imagegen_creations_updated'));
    getBroadcastChannel()?.postMessage({ type: 'CREATIONS_UPDATED' });
  } catch (e) {
    console.error('Failed to clear local creations', e);
  }
}

export function formatDateTime(timestamp: number | string | Date): string {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

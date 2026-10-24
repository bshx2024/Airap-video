/**
 * 作品数据持久化与状态同步模块
 * 管理客户端 localStorage 缓存、服务端生成任务数据同步与事件广播
 */
export interface CreationItem {
  id: string;
  dbId?: string;
  mediaType: 'image' | 'video' | 'music';
  mode?: string;
  /** 发起生成时的页面上下文（用于切回该路由才恢复「近期创作」展示） */
  pageKey?: string;
  prompt: string;
  model?: string;
  url: string;
  thumbnailUrl?: string;
  aspectRatio?: string;
  duration?: string;
  resolution?: string;
  visibility?: 'public' | 'private';
  status?: 'pending' | 'processing' | 'success' | 'failed';
  errorCode?: string;
  createdAt: number; // 时间戳 (毫秒)
}

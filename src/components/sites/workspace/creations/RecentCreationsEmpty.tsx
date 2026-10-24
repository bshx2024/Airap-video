'use client';

import React from 'react';
import { Clapperboard, Plus, Sparkles } from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { Link, usePathname, useRouter } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';

export type TabType = 'all' | 'video' | 'image' | 'music';

export interface RecentCreationsEmptyProps {
  isSettingsPage?: boolean;
  filterMediaType?: 'image' | 'video' | 'music';
  activeTab: TabType;
}

export function RecentCreationsEmpty({
  isSettingsPage = false,
  filterMediaType,
  activeTab,
}: RecentCreationsEmptyProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const effectiveTab = filterMediaType ?? activeTab;

  const getCreateHref = (tab: TabType) => {
    switch (tab) {
      case 'video':
      case 'image':
      case 'all':
      default:
        return '/#generator';
    }
  };

  const getCreateButtonText = (tab: TabType) => {
    if (isSettingsPage) {
      return m['settings.creations.new_render']();
    }
    switch (tab) {
      case 'video':
        return m['stp.workspace.create_video']();
      case 'music':
        return m['stp.workspace.create_music']();
      case 'image':
        return m['stp.workspace.create_image']();
      default:
        return m['stp.workspace.create_now']();
    }
  };

  const handleCreateClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // 1. 未登录：阻断并跳转登录页，携带当前路径 callbackUrl，与左下角 Sign in 保持完全一致
    if (!session?.user) {
      e.preventDefault();
      const currentUrl =
        typeof window !== 'undefined'
          ? window.location.pathname + window.location.search
          : pathname || '';
      const signInUrl = currentUrl
        ? `/sign-in?callbackUrl=${encodeURIComponent(currentUrl)}`
        : '/sign-in';
      router.push(signInUrl);
      return;
    }

    // 2. 已登录：若当前页面存在 AI 生成器，平滑滚动至生成器输入区
    const generatorEl =
      document.getElementById('generator') ||
      document.getElementById('ai-generator') ||
      document.querySelector('[data-section="ai-generator"]');

    if (generatorEl) {
      e.preventDefault();
      generatorEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const textarea = generatorEl.querySelector('textarea');
      if (textarea) {
        setTimeout(() => textarea.focus(), 250);
      }
      return;
    }

    // 3. 当前页面无生成器（如在 /settings/creations 或 overview 页面），按默认 Link 导航跳转
  };

  if (isSettingsPage) {
    return (
      <div className="border-border/70 flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed bg-transparent p-10 text-center sm:p-14 md:p-16 dark:border-zinc-800/80">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-100 text-zinc-700 shadow-inner dark:border-zinc-700/60 dark:bg-zinc-800/80 dark:text-zinc-200">
          <Clapperboard className="text-foreground/90 size-6" />
        </div>
        <h3 className="text-foreground text-base font-semibold md:text-lg">
          {m['settings.creations.empty']()}
        </h3>
        <p className="text-muted-foreground mt-1.5 max-w-md text-xs md:text-sm">
          {m['settings.creations.empty_desc']()}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link
            href="/#generator"
            onClick={handleCreateClick}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-blue-500 active:scale-95"
          >
            {m['settings.creations.new_render']()}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="border-border/70 bg-card/40 flex flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center sm:p-10 md:p-14">
      <div className="bg-muted text-muted-foreground border-border/70 mb-3 flex size-12 items-center justify-center rounded-full border">
        <Sparkles className="size-6" />
      </div>
      <h3 className="text-foreground text-sm font-semibold">
        {m['stp.workspace.no_creations_title']()}
      </h3>
      <p className="text-muted-foreground mt-1 max-w-sm text-xs">
        {m['stp.workspace.no_creations_desc']()}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Link
          href={getCreateHref(effectiveTab)}
          onClick={handleCreateClick}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold shadow-xs transition-all hover:scale-[1.03] active:scale-100"
        >
          <Plus className="size-3.5" />
          {getCreateButtonText(effectiveTab)}
        </Link>
      </div>
    </div>
  );
}

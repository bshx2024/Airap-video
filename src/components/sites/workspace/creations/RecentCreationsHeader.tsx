'use client';

import { Plus, Sparkles } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { getVideoModelsList } from '@/config/ai-models';
import { m } from '@/paraglide/messages.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type TabType = 'all' | 'video' | 'image' | 'music';

export interface RecentCreationsHeaderProps {
  isSettingsPage?: boolean;
  filterMediaType?: 'image' | 'video' | 'music';
  activeTab: TabType;
  mounted: boolean;
  hasUser: boolean;
  onTabClick: (tab: TabType) => void;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
}

export function RecentCreationsHeader({
  isSettingsPage = false,
  filterMediaType,
  mounted,
  hasUser,
  selectedModel,
  onModelChange,
}: RecentCreationsHeaderProps) {
  const videoModels = getVideoModelsList();

  if (isSettingsPage) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">
              {m['settings.nav.creations']()}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {m['settings.creations.description']()}
            </p>
          </div>
          <Link
            href="/#generator"
            className="inline-flex items-center gap-1.5 self-start rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-blue-500 active:scale-95 sm:self-auto"
          >
            <Plus className="size-4" />
            {m['settings.creations.new_render']()}
          </Link>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-muted-foreground text-sm font-medium">
            {m['settings.creations.model_filter']()}
          </span>
          {mounted ? (
            <Select
              value={selectedModel || 'all'}
              onValueChange={(val) => onModelChange?.(val as string)}
            >
              <SelectTrigger className="border-border/80 bg-background text-foreground h-9 min-w-[140px] rounded-lg text-sm font-medium shadow-xs">
                <SelectValue
                  placeholder={m['settings.creations.all_models']()}
                />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground">
                <SelectItem value="all">
                  {m['settings.creations.all_models']()}
                </SelectItem>
                {videoModels.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="border-border/80 bg-background text-foreground h-9 min-w-[140px] rounded-lg border px-3 py-2 text-sm font-medium opacity-70">
              {m['settings.creations.all_models']()}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        {filterMediaType && <Sparkles className="text-primary size-4" />}
        <div>
          <h2 className="text-foreground text-lg font-bold tracking-tight md:text-xl">
            {m['stp.workspace.recent_creations']()}
          </h2>
          {!filterMediaType && (
            <p className="text-muted-foreground text-xs">
              {m['stp.workspace.recent_creations_desc']()}
            </p>
          )}
        </div>
      </div>

      {mounted && hasUser && (
        <Link
          href="/my-creations"
          className="text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
        >
          {m['stp.workspace.view_all']()} &rarr;
        </Link>
      )}
    </div>
  );
}

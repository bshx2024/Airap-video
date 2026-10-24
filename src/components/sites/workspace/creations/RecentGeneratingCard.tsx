'use client';

import React from 'react';
import {
  Check,
  Clock,
  Copy,
  Film,
  Image as ImageIcon,
  Loader2,
  Music,
} from 'lucide-react';

import { formatDateTime } from '@/modules/creations/store';
import { copyToClipboard } from '@/lib/copy';
import { m } from '@/paraglide/messages.js';

export interface RecentGeneratingCardProps {
  generatingPrompt?: string;
  filterMediaType?: 'image' | 'video' | 'music';
  copiedId?: string | null;
  onCopyPrompt?: (text: string) => void;
  createdAt?: number;
}

export function RecentGeneratingCard({
  generatingPrompt = '',
  filterMediaType,
  copiedId = null,
  onCopyPrompt,
  createdAt,
}: RecentGeneratingCardProps) {
  const [localCopied, setLocalCopied] = React.useState(false);
  const isCopied = copiedId === 'generating' || localCopied;

  return (
    <div className="group border-border/75 bg-card hover:border-primary/40 hover:shadow-primary/5 relative flex flex-col justify-between overflow-hidden rounded-2xl border shadow-2xs backdrop-blur-xs transition-all duration-300 hover:shadow-lg">
      <div
        data-slot="card-media"
        className="relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden bg-black/5 dark:bg-black/20"
      >
        <div className="flex flex-col items-center justify-center gap-2">
          <Loader2 className="text-primary size-6 animate-spin" />
          <span className="text-muted-foreground text-[11px] font-medium tracking-wide">
            {m['stp.common.generating']()}...
          </span>
        </div>
        <div className="pointer-events-none absolute top-2.5 left-2.5 z-10">
          <span className="flex items-center gap-1 rounded-full border border-white/20 bg-black/50 px-2 py-0.5 text-[10px] font-medium tracking-wide text-white/90 backdrop-blur-md">
            {filterMediaType === 'image' && <ImageIcon className="size-2.5" />}
            {filterMediaType === 'video' && <Film className="size-2.5" />}
            {filterMediaType === 'music' && <Music className="size-2.5" />}
            {filterMediaType || 'image'}
          </span>
        </div>

        {generatingPrompt && (
          <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                if (onCopyPrompt) {
                  onCopyPrompt(generatingPrompt);
                } else {
                  await copyToClipboard(generatingPrompt);
                  setLocalCopied(true);
                  setTimeout(() => setLocalCopied(false), 2000);
                }
              }}
              className="flex size-7 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/60 text-white/90 shadow-sm backdrop-blur-md transition-all hover:scale-110 hover:bg-black/85 hover:text-white"
              title={m['stp.common.copy_prompt']()}
            >
              {isCopied ? (
                <Check className="size-3.5 text-emerald-400" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-2.5 p-3.5 sm:p-4">
        <div>
          <p
            className="text-foreground/90 group-hover:text-primary line-clamp-2 text-xs leading-relaxed font-medium break-all transition-colors"
            title={generatingPrompt}
          >
            {generatingPrompt || m['stp.workspace.untitled_generation']()}
          </p>
        </div>

        <div className="border-border/60 text-muted-foreground flex items-center justify-between border-t pt-2 text-xs">
          <div className="flex items-center gap-1 text-[11px]">
            <Clock className="size-3" />
            <span>{formatDateTime(createdAt || Date.now())}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

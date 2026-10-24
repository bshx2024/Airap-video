'use client';

import React from 'react';
import {
  Check,
  CircleAlert,
  Clock,
  Copy,
  Film,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  Music,
  Trash2,
} from 'lucide-react';

import {
  getImageModelById,
  getVideoModelById,
  needsModelIconInvert,
} from '@/config/ai-models';
import { formatDateTime, type CreationItem } from '@/modules/creations/store';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { DownloadButton } from '@/components/download-button';
import { formatLocalizedErrorMessage } from '@/components/sites/root/generation-errors';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { RecentImageCardMedia } from './RecentImageCardMedia';
import { RecentMusicCardMedia } from './RecentMusicCardMedia';
import { RecentVideoCardMedia } from './RecentVideoCardMedia';

/** PC 悬停显示；平板/手机始终露出操作项 */
const CARD_ACTIONS_CLASS =
  'absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 opacity-100 transition-opacity duration-200 lg:opacity-0 lg:group-hover:opacity-100';

function CreationModelBadge({ item }: { item: CreationItem }) {
  const model = getVideoModelById(item.model) || getImageModelById(item.model);
  const label = model?.name || item.model;
  if (!label) {
    return (
      <span className="flex items-center gap-1 rounded-full border border-white/20 bg-black/50 px-2 py-0.5 text-[10px] font-medium tracking-wide text-white/90 backdrop-blur-md">
        {item.mediaType === 'image' && <ImageIcon className="size-2.5" />}
        {item.mediaType === 'video' && <Film className="size-2.5" />}
        {item.mediaType === 'music' && <Music className="size-2.5" />}
        {item.mediaType}
      </span>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="pointer-events-auto flex max-w-[min(70%,11rem)] cursor-default items-center gap-1 truncate rounded-full border border-white/20 bg-black/50 px-2 py-0.5 text-left text-[10px] font-medium tracking-wide text-white/90 backdrop-blur-md"
          >
            {model?.icon ? (
              <img
                src={model.icon}
                alt=""
                width={10}
                height={10}
                className={cn(
                  'size-2.5 shrink-0 rounded-[2px] object-cover',
                  needsModelIconInvert(model.icon) && 'invert'
                )}
              />
            ) : null}
            <span className="truncate">{label}</span>
          </button>
        }
      />
      <TooltipContent side="top" className="px-2 py-1 text-[11px]">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export interface RecentCreationCardProps {
  item: CreationItem;
  size?: 'default' | 'sm';
  selected?: boolean;
  selectable?: boolean;
  onSelect?: (item: CreationItem) => void;
  copiedId?: string | null;
  videoClickedId?: string | null;
  audioClickedId?: string | null;
  onCopyPrompt?: (id: string, text: string) => void;
  onOpenLightbox?: (item: CreationItem) => void;
  onPlayVideo?: (id: string) => void;
  onPlayAudio?: (id: string) => void;
  onRequestDelete?: (id: string) => void;
}

function RecentCreationCardImpl({
  item,
  size = 'default',
  selected = false,
  selectable = false,
  onSelect,
  copiedId = null,
  videoClickedId = null,
  audioClickedId = null,
  onCopyPrompt = () => {},
  onOpenLightbox = () => {},
  onPlayVideo = () => {},
  onPlayAudio = () => {},
  onRequestDelete = () => {},
}: RecentCreationCardProps) {
  const isItemProcessing =
    item.status === 'processing' ||
    item.status === 'pending' ||
    (!item.status && !item.url);

  if (item.status === 'failed') {
    if (size === 'sm') {
      return (
        <div
          className={cn(
            'group border-destructive/30 bg-destructive/5 hover:border-destructive/50 relative z-0 flex aspect-square flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border p-2.5 text-center transition-all'
          )}
        >
          <div className="bg-destructive/15 text-destructive flex size-7 items-center justify-center rounded-full">
            <CircleAlert className="size-4" />
          </div>
          <span className="text-destructive text-[11px] font-semibold">
            {m['stp.common.generation_failed']()}
          </span>
          {/* 悬浮 Prompt 简略浮层 */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
            <p className="truncate text-[10px] font-medium text-white/90">
              {item.prompt || ''}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="group border-border/75 bg-card hover:border-destructive/40 relative flex flex-col justify-between overflow-hidden rounded-2xl border shadow-2xs backdrop-blur-xs transition-all duration-300 hover:shadow-lg">
        {/* Media Preview Area */}
        <div
          data-slot="card-media"
          className="border-border/60 from-destructive/5 via-destructive/8 to-destructive/12 dark:from-destructive/10 dark:via-destructive/15 dark:to-destructive/20 relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden border-b bg-gradient-to-b px-4 py-3 text-center"
        >
          {/* Media Type / Status Badge (Top-Left) */}
          <div className="pointer-events-none absolute top-2.5 left-2.5 z-10">
            <span className="border-destructive/25 bg-destructive/15 text-destructive flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium backdrop-blur-md">
              <CircleAlert className="size-2.5" />
              {m['stp.common.generation_failed']()}
            </span>
          </div>

          {/* Hover-to-Reveal Actions Bar (Top-Right Overlay) */}
          <div className={CARD_ACTIONS_CLASS}>
            {/* Copy Prompt */}
            {onCopyPrompt && item.prompt && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyPrompt(item.id, item.prompt);
                }}
                className="border-border/60 bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground flex size-7 cursor-pointer items-center justify-center rounded-full border shadow-xs backdrop-blur-md transition-all hover:scale-105"
                title={m['stp.common.copy_prompt']()}
              >
                {copiedId === item.id ? (
                  <Check className="size-3.5 text-emerald-500" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            )}

            {/* Delete Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRequestDelete(item.id);
              }}
              className="border-border/60 bg-background/80 text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive flex size-7 cursor-pointer items-center justify-center rounded-full border shadow-xs backdrop-blur-md transition-all hover:scale-105"
              title={m['stp.workspace.delete']()}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>

          {/* Center Error Content: Compact & Proportionate */}
          <div className="flex max-w-[88%] flex-col items-center justify-center gap-1.5">
            <div className="border-destructive/25 bg-destructive/15 text-destructive flex size-9 items-center justify-center rounded-full border shadow-xs">
              <CircleAlert className="size-4.5" />
            </div>
            <p className="text-foreground/90 text-xs font-semibold tracking-tight">
              {m['stp.common.generation_failed']()}
            </p>
            {item.errorCode && (
              <p className="text-muted-foreground line-clamp-2 text-[11px] leading-relaxed">
                {formatLocalizedErrorMessage(item.errorCode)}
              </p>
            )}
          </div>
        </div>

        {/* Card Body: Prompt & Meta */}
        <div className="flex flex-1 flex-col justify-between gap-2.5 p-3.5 sm:p-4">
          <div>
            <p
              className="text-foreground/90 group-hover:text-destructive line-clamp-2 text-xs leading-relaxed font-medium break-all transition-colors"
              title={item.prompt}
            >
              {item.prompt || m['stp.workspace.untitled_generation']()}
            </p>
          </div>

          <div className="border-border/60 text-muted-foreground flex items-center justify-between border-t pt-2 text-xs">
            <div className="flex items-center gap-1 text-[11px]">
              <Clock className="size-3" />
              <span>{formatDateTime(item.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isItemProcessing) {
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
            <CreationModelBadge item={item} />
          </div>

          {/* Hover-to-Reveal Actions Bar (Top-Right Overlay) */}
          <div className={CARD_ACTIONS_CLASS}>
            {onCopyPrompt && item.prompt && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyPrompt(item.id, item.prompt);
                }}
                className="flex size-7 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/60 text-white/90 shadow-sm backdrop-blur-md transition-all hover:scale-110 hover:bg-black/85 hover:text-white"
                title={m['stp.common.copy_prompt']()}
              >
                {copiedId === item.id ? (
                  <Check className="size-3.5 text-emerald-400" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            )}
            {onRequestDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestDelete(item.id);
                }}
                className="flex size-7 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/60 text-white/90 shadow-sm backdrop-blur-md transition-all hover:scale-110 hover:bg-red-500/80 hover:text-white"
                title={m['stp.workspace.delete']()}
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-between gap-2.5 p-3.5 sm:p-4">
          <div>
            <p
              className="text-foreground/90 group-hover:text-primary line-clamp-2 text-xs leading-relaxed font-medium break-all transition-colors"
              title={item.prompt}
            >
              {item.prompt || m['stp.workspace.untitled_generation']()}
            </p>
          </div>

          <div className="border-border/60 text-muted-foreground flex items-center justify-between border-t pt-2 text-xs">
            <div className="flex items-center gap-1 text-[11px]">
              <Clock className="size-3" />
              <span>{formatDateTime(item.createdAt || Date.now())}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (size === 'sm') {
    return (
      <div
        onClick={() => {
          if (selectable && onSelect) {
            onSelect(item);
          } else if (item.mediaType === 'image' && onOpenLightbox) {
            onOpenLightbox(item);
          }
        }}
        className={cn(
          'group border-border/60 bg-muted/20 hover:border-primary/70 relative z-0 aspect-square cursor-pointer overflow-hidden rounded-xl border transition-all hover:z-10 hover:scale-[1.02]',
          selected && 'ring-primary border-primary ring-2'
        )}
      >
        {item.mediaType === 'image' ? (
          <RecentImageCardMedia item={item} size="sm" />
        ) : item.mediaType === 'music' ? (
          <RecentMusicCardMedia item={item} size="sm" previewOnHover={true} />
        ) : (
          <RecentVideoCardMedia
            item={item}
            size="sm"
            isClicked={videoClickedId === item.id}
            onPlayClick={() => onPlayVideo?.(item.id)}
            previewOnHover={selectable}
          />
        )}

        {/* 选中态角标 */}
        {selected && (
          <div className="bg-primary text-primary-foreground absolute top-1.5 right-1.5 z-20 flex size-4 items-center justify-center rounded-full shadow-xs">
            <Check className="size-2.5 stroke-[3]" />
          </div>
        )}

        {/* 悬浮 Prompt 简略浮层 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <p className="truncate text-[10px] font-medium text-white/90">
            {item.prompt || ''}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="group border-border/75 bg-card hover:border-primary/40 hover:shadow-primary/5 relative flex flex-col justify-between overflow-hidden rounded-2xl border shadow-2xs backdrop-blur-xs transition-all duration-300 hover:shadow-lg">
      {/* Media Preview Area */}
      <div
        data-slot="card-media"
        className={`relative aspect-video w-full overflow-hidden bg-black/5 dark:bg-black/20 ${
          item.mediaType === 'image' ? 'cursor-pointer' : ''
        }`}
        onClick={() => {
          if (item.mediaType === 'image' && item.url) {
            onOpenLightbox(item);
          }
        }}
      >
        {/* 1. Image Type */}
        {item.mediaType === 'image' && (
          <RecentImageCardMedia
            item={item}
            size="default"
            onClick={() => {
              if (item.url) onOpenLightbox(item);
            }}
          />
        )}

        {/* 2. Video Type – thumbnail cover with play/pause overlay */}
        {item.mediaType === 'video' && (
          <RecentVideoCardMedia
            item={item}
            isClicked={videoClickedId === item.id}
            onPlayClick={() => onPlayVideo(item.id)}
          />
        )}

        {/* 3. Music Type – click to load & play with dynamic soundwave cover */}
        {item.mediaType === 'music' && (
          <RecentMusicCardMedia
            item={item}
            isClicked={audioClickedId === item.id}
            onPlayClick={() => onPlayAudio(item.id)}
          />
        )}

        {/* Model Badge (Top-Left) */}
        <div className="pointer-events-none absolute top-2.5 left-2.5 z-10">
          <CreationModelBadge item={item} />
        </div>

        {/* Actions Bar (Top-Right Overlay)：小屏常显，PC 悬停显示 */}
        <div className={CARD_ACTIONS_CLASS}>
          {/* Copy Prompt */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCopyPrompt(item.id, item.prompt);
            }}
            className="flex size-7 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/60 text-white/90 shadow-sm backdrop-blur-md transition-all hover:scale-110 hover:bg-black/85 hover:text-white"
            title={m['stp.common.copy_prompt']()}
          >
            {copiedId === item.id ? (
              <Check className="size-3.5 text-emerald-400" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>

          {/* Fullscreen zoom for Image */}
          {item.mediaType === 'image' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenLightbox(item);
              }}
              className="flex size-7 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/60 text-white/90 shadow-sm backdrop-blur-md transition-all hover:scale-110 hover:bg-black/85 hover:text-white"
              title={m['stp.common.fullscreen']()}
            >
              <Maximize2 className="size-3.5" />
            </button>
          )}

          {/* Download Button */}
          <div onClick={(e) => e.stopPropagation()}>
            <DownloadButton
              item={item}
              className="flex size-7 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/60 text-white/90 shadow-sm backdrop-blur-md transition-all hover:scale-110 hover:bg-black/85 hover:text-white"
              iconClassName="size-3.5 text-white/90"
              title={m['stp.workspace.download']()}
            />
          </div>

          {/* Delete Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRequestDelete(item.id);
            }}
            className="flex size-7 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/60 text-white/90 shadow-sm backdrop-blur-md transition-all hover:scale-110 hover:bg-red-500/80 hover:text-white"
            title={m['stp.workspace.delete']()}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Card Body: Prompt & Meta */}
      <div className="flex flex-1 flex-col justify-between gap-2.5 p-3.5 sm:p-4">
        <div>
          <p
            className="text-foreground/90 group-hover:text-primary line-clamp-2 text-xs leading-relaxed font-medium break-all transition-colors"
            title={item.prompt}
          >
            {item.prompt || m['stp.workspace.untitled_generation']()}
          </p>
        </div>

        <div className="border-border/60 text-muted-foreground flex items-center justify-between border-t pt-2 text-xs">
          <div className="flex items-center gap-1 text-[11px]">
            <Clock className="size-3" />
            <span>{formatDateTime(item.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export const RecentCreationCard = React.memo(RecentCreationCardImpl);

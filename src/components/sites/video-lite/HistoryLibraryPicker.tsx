'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Library } from 'lucide-react';
import { toast } from 'sonner';

import {
  getLocalCreations,
  syncUserCreations,
  type CreationItem,
} from '@/modules/creations/store';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

export type HistoryLibraryMedia = {
  id: string;
  /** Image URL used as first/last frame. */
  src: string;
  /** Optional video URL for grid preview when picking from video history. */
  preview?: string;
  name: string;
  alt: string;
};

function isVideoUrl(url?: string | null): boolean {
  return /\.(mp4|webm|mov|m4v)(?:$|[?#])/i.test(url || '');
}

/** Frame candidates: images, or video covers (thumbnail) for first/last slots. */
function toLibraryMedia(item: CreationItem): HistoryLibraryMedia | null {
  if (item.status !== 'success' || !item.url) return null;
  const name = item.prompt?.slice(0, 48) || item.id;
  const alt = item.prompt || item.id;

  if (item.mediaType === 'image') {
    return { id: item.id, src: item.url, name, alt };
  }

  if (item.mediaType === 'video') {
    const thumb = item.thumbnailUrl?.trim();
    if (thumb && !isVideoUrl(thumb)) {
      return {
        id: item.id,
        src: thumb,
        preview: item.url,
        name,
        alt,
      };
    }
    // Keep listing videos without a still; submit path will skip non-image src.
    return {
      id: item.id,
      src: item.url,
      preview: item.url,
      name,
      alt,
    };
  }

  return null;
}

function VideoGridSkeleton({ count = 12 }: { count?: number }) {
  const ratios = [
    '16 / 10',
    '4 / 5',
    '16 / 9',
    '1 / 1',
    '3 / 4',
    '9 / 16',
    '3 / 2',
    '4 / 3',
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 md:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton
          key={i}
          className="w-full rounded-md"
          style={{ aspectRatio: ratios[i % ratios.length] }}
        />
      ))}
    </div>
  );
}

/** Pick previous creations into first/last frame slots (skeleton → select → submit). */
export function HistoryLibraryPicker({
  open,
  onOpenChange,
  onAdd,
  maxSelect,
  maxSelectCap,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (media: HistoryLibraryMedia[]) => void;
  maxSelect?: number;
  maxSelectCap?: number;
}) {
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [items, setItems] = useState<HistoryLibraryMedia[]>([]);
  const [selectedMap, setSelectedMap] = useState<
    Map<string, HistoryLibraryMedia>
  >(new Map());
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const [readyIds, setReadyIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setSelectedMap(new Map());
      setFailedIds(new Set());
      setReadyIds(new Set());
      setLoadFailed(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);

    const local = getLocalCreations()
      .map(toLibraryMedia)
      .filter(Boolean) as HistoryLibraryMedia[];
    setItems(local);

    syncUserCreations(true)
      .then((creations) => {
        if (cancelled) return;
        const next = creations
          .map(toLibraryMedia)
          .filter(Boolean) as HistoryLibraryMedia[];
        setItems(next);
      })
      .catch(() => {
        if (cancelled) return;
        if (local.length === 0) setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const media = useMemo(
    () => items.filter((item) => !failedIds.has(item.id)),
    [failedIds, items]
  );
  const readyMedia = media.filter((item) => readyIds.has(item.id));
  const pendingMedia = media.filter((item) => !readyIds.has(item.id));
  const showPageSkeleton =
    loading || (readyMedia.length === 0 && pendingMedia.length > 0);
  const selectedCount = selectedMap.size;

  function toggleMedia(item: HistoryLibraryMedia) {
    setSelectedMap((previous) => {
      const next = new Map(previous);
      if (next.has(item.id)) {
        next.delete(item.id);
        return next;
      }
      if (typeof maxSelect === 'number' && next.size >= maxSelect) {
        toast.info(
          m['landing.hero.upload_limit_reached']({
            max: maxSelectCap ?? maxSelect,
          })
        );
        return previous;
      }
      next.set(item.id, item);
      return next;
    });
  }

  function markFailed(id: string) {
    setFailedIds((previous) => {
      if (previous.has(id)) return previous;
      const next = new Set(previous);
      next.add(id);
      return next;
    });
    setSelectedMap((previous) => {
      if (!previous.has(id)) return previous;
      const next = new Map(previous);
      next.delete(id);
      return next;
    });
  }

  function markReady(id: string) {
    setReadyIds((previous) => {
      if (previous.has(id)) return previous;
      const next = new Set(previous);
      next.add(id);
      return next;
    });
  }

  function previewUrl(item: HistoryLibraryMedia) {
    return item.preview || item.src;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(88dvh,50rem)] w-[calc(100vw-1.5rem)] max-w-4xl flex-col gap-2.5 overflow-hidden p-3.5 sm:w-full sm:gap-3 sm:p-5 md:p-6">
        <DialogHeader className="gap-1 pr-6 sm:pr-8">
          <DialogTitle className="text-base font-semibold sm:text-lg">
            {m['agent.composer.library_title']()}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs sm:text-sm">
            {m['agent.composer.library_description']()}
          </DialogDescription>
        </DialogHeader>

        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          <div className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0">
            {pendingMedia.map((item) => {
              const preview = previewUrl(item);
              return isVideoUrl(preview) ? (
                <video
                  key={`preload-${item.id}`}
                  src={preview}
                  muted
                  playsInline
                  preload="metadata"
                  onLoadedData={() => markReady(item.id)}
                  onError={() => markFailed(item.id)}
                />
              ) : (
                <img
                  key={`preload-${item.id}`}
                  src={preview}
                  alt=""
                  loading="eager"
                  onLoad={() => markReady(item.id)}
                  onError={() => markFailed(item.id)}
                />
              );
            })}
          </div>

          {loadFailed ? (
            <div className="text-muted-foreground flex min-h-48 flex-col items-center justify-center gap-2 px-6 text-center text-sm">
              <Library className="size-5" />
              <p>{m['agent.composer.library_load_failed']()}</p>
            </div>
          ) : showPageSkeleton ? (
            <VideoGridSkeleton />
          ) : readyMedia.length === 0 ? (
            <div className="text-muted-foreground flex min-h-48 flex-col items-center justify-center gap-2 px-6 text-center text-sm">
              <Library className="size-5" />
              <p>{m['agent.composer.library_empty']()}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 md:grid-cols-4">
              {readyMedia.map((item) => {
                const selected = selectedMap.has(item.id);
                const preview = previewUrl(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleMedia(item)}
                    aria-pressed={selected}
                    className={cn(
                      'group border-border bg-muted focus-visible:ring-ring relative aspect-video cursor-pointer overflow-hidden rounded-md border text-left transition-colors focus-visible:ring-2 focus-visible:outline-none',
                      selected && 'border-primary ring-primary/30 ring-2'
                    )}
                  >
                    {isVideoUrl(preview) ? (
                      <video
                        src={preview}
                        aria-label={item.alt || item.name}
                        muted
                        playsInline
                        preload="metadata"
                        className="size-full object-cover transition-transform group-hover:scale-[1.02]"
                      />
                    ) : (
                      <img
                        src={preview}
                        alt=""
                        className="size-full object-cover transition-transform group-hover:scale-[1.02]"
                      />
                    )}
                    {selected ? (
                      <span className="bg-primary text-primary-foreground absolute top-2 right-2 z-20 flex size-5 items-center justify-center rounded-full shadow-sm">
                        <Check className="size-3.5" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={() => {
              onAdd(Array.from(selectedMap.values()));
              onOpenChange(false);
            }}
            disabled={selectedCount === 0}
          >
            {m['agent.composer.add_selected']({ count: selectedCount })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

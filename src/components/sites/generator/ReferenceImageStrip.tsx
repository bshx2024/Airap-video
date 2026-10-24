'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ImagePlus, Loader2, RefreshCw, X } from 'lucide-react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';

export type ReferenceUploadingItem = {
  id: string;
  localUrl: string;
  slotIndex?: number;
};

type HoverState = {
  src: string;
  x: number;
  y: number;
} | null;

function HoverPreview({ state }: { state: HoverState }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted || !state) return null;

  const left = Math.min(state.x + 16, window.innerWidth - 280);
  const top = Math.min(state.y + 16, window.innerHeight - 280);

  return createPortal(
    <div
      className="border-border bg-card pointer-events-none fixed z-[300] overflow-hidden rounded-xl border shadow-2xl"
      style={{ left, top, width: 240, height: 240 }}
      aria-hidden
    >
      <img
        src={state.src}
        alt=""
        className="bg-muted size-full object-contain"
      />
    </div>,
    document.body
  );
}

function ThumbShell({
  children,
  previewSrc,
  onHoverChange,
  className,
}: {
  children: ReactNode;
  previewSrc?: string;
  onHoverChange: (state: HoverState) => void;
  className?: string;
}) {
  return (
    <div
      className={cn('group relative size-9', className)}
      onMouseEnter={(e) => {
        if (!previewSrc) return;
        onHoverChange({ src: previewSrc, x: e.clientX, y: e.clientY });
      }}
      onMouseMove={(e) => {
        if (!previewSrc) return;
        onHoverChange({ src: previewSrc, x: e.clientX, y: e.clientY });
      }}
      onMouseLeave={() => onHoverChange(null)}
    >
      {children}
    </div>
  );
}

export function ReferenceImageStrip({
  imageUrls,
  uploadingItems,
  maxImages,
  isUploading,
  onUploadClick,
  onReplaceClick,
  onRemove,
  fileInput,
  replaceInput,
}: {
  imageUrls: string[];
  uploadingItems: ReferenceUploadingItem[];
  maxImages: number;
  isUploading: boolean;
  onUploadClick: () => void;
  onReplaceClick: (index: number) => void;
  onRemove: (index: number) => void;
  fileInput: ReactNode;
  replaceInput?: ReactNode;
}) {
  const [hover, setHover] = useState<HoverState>(null);
  const canUploadMore = imageUrls.length + uploadingItems.length < maxImages;

  const appendedUploading = uploadingItems.filter(
    (item) => item.slotIndex === undefined || item.slotIndex >= imageUrls.length
  );

  const handleHover = useCallback((state: HoverState) => {
    setHover(state);
  }, []);

  return (
    <>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {fileInput}
        {replaceInput}

        {imageUrls.map((url, index) => {
          const replacingItem = uploadingItems.find(
            (item) => item.slotIndex === index
          );
          const displaySrc = replacingItem?.localUrl || url;
          return (
            <ThumbShell
              key={`${url}-${index}`}
              previewSrc={replacingItem ? undefined : url}
              onHoverChange={handleHover}
            >
              <div className="border-border bg-muted relative size-full overflow-hidden rounded-lg border">
                <img
                  src={displaySrc}
                  alt=""
                  width={36}
                  height={36}
                  className={cn(
                    'size-full object-cover',
                    replacingItem && 'opacity-40 blur-[1px]'
                  )}
                />
                {replacingItem ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="text-primary size-3.5 animate-spin" />
                  </div>
                ) : (
                  <button
                    type="button"
                    title={m['landing.hero.replace_image']()}
                    aria-label={m['landing.hero.replace_image']()}
                    disabled={isUploading}
                    onClick={() => onReplaceClick(index)}
                    className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className="size-3.5 text-white" />
                  </button>
                )}
              </div>
              {!replacingItem && (
                <button
                  type="button"
                  title={m['landing.hero.remove_image']()}
                  aria-label={m['landing.hero.remove_image']()}
                  disabled={isUploading}
                  onClick={() => onRemove(index)}
                  className="bg-destructive text-destructive-foreground absolute -top-1.5 -right-1.5 z-10 flex size-4 cursor-pointer items-center justify-center rounded-full hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
                >
                  <X className="size-2.5" />
                </button>
              )}
            </ThumbShell>
          );
        })}

        {appendedUploading.map((item) => (
          <div
            key={item.id}
            className="border-border bg-muted relative size-9 overflow-hidden rounded-lg border"
            title={m['landing.hero.uploading']()}
          >
            <img
              src={item.localUrl}
              alt=""
              width={36}
              height={36}
              className="size-full object-cover opacity-40 blur-[1px]"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="text-primary size-3.5 animate-spin" />
            </div>
          </div>
        ))}

        {canUploadMore && (
          <button
            type="button"
            disabled={isUploading}
            onClick={onUploadClick}
            title={m['landing.hero.upload_reference']()}
            aria-label={m['landing.hero.upload_reference']()}
            className="border-border text-muted-foreground hover:text-foreground hover:bg-muted inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border transition-colors disabled:pointer-events-none disabled:opacity-50"
          >
            <ImagePlus className="size-4" />
          </button>
        )}
      </div>
      <HoverPreview state={hover} />
    </>
  );
}

/** Map upload API errors to a user-facing toast message. */
export { resolveUploadMediaErrorMessage as toastUploadError } from '@/lib/upload-media-error';

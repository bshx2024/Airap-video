'use client';

import React from 'react';
import { QrCode, X } from 'lucide-react';
import { createPortal } from 'react-dom';

import type { CreationItem } from '@/modules/creations/store';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { DownloadButton } from '@/components/download-button';
import { MobileVideoDownloadModal } from '@/components/sites/video-lite/MobileVideoDownloadModal';

export interface RecentCreationsLightboxProps {
  item: CreationItem | null;
  onClose: () => void;
}

export function RecentCreationsLightbox({
  item,
  onClose,
}: RecentCreationsLightboxProps) {
  const [mounted, setMounted] = React.useState(false);
  const [showMobileQr, setShowMobileQr] = React.useState(false);
  // 关闭时保留上次作品，避免卸载 <img> 导致同图再次打开重新下载
  const [displayItem, setDisplayItem] = React.useState<CreationItem | null>(
    null
  );
  const open = Boolean(item);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (item) setDisplayItem(item);
  }, [item]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!mounted || !displayItem) return null;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[100] cursor-pointer items-center justify-center bg-black/85 p-4 backdrop-blur-md',
        open ? 'flex' : 'hidden'
      )}
      onClick={onClose}
      aria-hidden={!open}
    >
      <div
        className="relative max-h-[90vh] max-w-4xl cursor-default overflow-hidden rounded-2xl border border-white/10 bg-black/90 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {displayItem.mediaType === 'video' ||
        /\.(mp4|webm|mov|m4v)(?:$|[?#])/i.test(displayItem.url) ? (
          <video
            src={displayItem.url}
            controls
            autoPlay
            playsInline
            className="h-full max-h-[85vh] w-full object-contain"
          />
        ) : (
          <img
            src={displayItem.url}
            alt={displayItem.prompt}
            decoding="async"
            className="h-full max-h-[85vh] w-full object-contain"
          />
        )}
        {displayItem.prompt && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 text-white">
            <p className="max-h-32 max-w-3xl overflow-y-auto pr-2 text-xs leading-relaxed font-medium sm:max-h-40 sm:text-sm">
              {displayItem.prompt}
            </p>
          </div>
        )}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {displayItem.url && (
            <button
              type="button"
              onClick={() => setShowMobileQr(true)}
              className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-amber-400/30 bg-black/60 text-amber-300 backdrop-blur-md transition-all hover:scale-105 hover:bg-black/80 hover:text-amber-200"
              title="手机扫码下载"
            >
              <QrCode className="size-4" />
            </button>
          )}
          <DownloadButton
            item={displayItem}
            className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/60 text-white backdrop-blur-md transition-all hover:scale-105 hover:bg-black/80"
            iconClassName="size-4 text-white"
            title={m['stp.workspace.download']()}
          />
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/60 text-white backdrop-blur-md transition-all hover:scale-105 hover:bg-black/80"
            aria-label={m['showcase.dialog.close']()}
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {showMobileQr && displayItem.url && (
        <MobileVideoDownloadModal
          isOpen={showMobileQr}
          onClose={() => setShowMobileQr(false)}
          videoUrl={displayItem.url}
          title={displayItem.prompt || 'AI Video'}
          filename={displayItem.prompt ? `${displayItem.prompt.slice(0, 20)}.mp4` : 'ai-video.mp4'}
        />
      )}
    </div>,
    document.body
  );
}

import { useState, type ReactNode } from 'react';
import { LoaderCircle, QrCode, Square, X } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { DownloadButton } from '@/components/download-button';
import { MobileVideoDownloadModal } from './MobileVideoDownloadModal';

export type VideoHeroGenerationResult = {
  id?: string;
  taskId?: string;
  status: 'processing' | 'failed' | 'success';
  videoUrl?: string;
  error?: ReactNode;
  prompt?: string;
};

export function VideoHeroResultPanel({
  generationResult,
  onClear,
}: {
  generationResult: VideoHeroGenerationResult;
  onClear: () => void;
}) {
  const [downloadQrOpen, setDownloadQrOpen] = useState(false);
  return (
    <div
      id="generation-result"
      className="relative z-20 scroll-mt-20 bg-slate-50 px-5 pt-8 pb-16 text-slate-900 transition-colors sm:px-8 sm:pt-12 sm:pb-24 dark:bg-[#020617] dark:text-white"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex min-h-9 items-center justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-slate-900 sm:text-xl dark:text-white">
            {m['landing.hero.generation_results']()}
          </h2>

          {generationResult.status === 'processing' && (
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/[0.08] px-3 text-xs font-medium text-red-600 transition-colors hover:border-red-500/40 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-45 dark:border-red-300/20 dark:bg-red-400/[0.06] dark:text-red-200 dark:hover:border-red-300/35 dark:hover:bg-red-400/10"
              disabled
            >
              <Square className="size-3 fill-current" />
              {m['landing.hero.cancel_task']()}
            </button>
          )}

          {generationResult.status === 'failed' && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/65 dark:hover:border-white/20 dark:hover:bg-white/[0.08] dark:hover:text-white"
            >
              <X className="size-3.5" />
              {m['landing.hero.clear_result']()}
            </button>
          )}

          {generationResult.status === 'success' && (
            <div className="flex items-center gap-2">
              <Link
                href="/settings/creations"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/80 dark:hover:border-white/20 dark:hover:bg-white/[0.08] dark:hover:text-white"
              >
                {m['settings.nav.creations']()}
              </Link>
              <button
                type="button"
                onClick={onClear}
                className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/65 dark:hover:border-white/20 dark:hover:bg-white/[0.08] dark:hover:text-white"
              >
                <X className="size-3.5" />
                {m['landing.hero.clear_result']()}
              </button>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#0f172a] dark:shadow-[0_24px_80px_rgba(0,0,0,0.36)]">
          {generationResult.status === 'processing' && (
            <div
              role="status"
              className="relative flex aspect-video items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_35%,#93c5fd55_0%,#f8fafc_55%,#e2e8f0_100%)] dark:bg-[radial-gradient(circle_at_50%_35%,#1d4ed833_0%,#0f172a_55%,#020617_100%)]"
              aria-live="polite"
            >
              <div className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,transparent_25%,#0f172a0a_45%,transparent_65%)] dark:bg-[linear-gradient(110deg,transparent_25%,#ffffff0a_45%,transparent_65%)]" />
              <div className="relative flex flex-col items-center gap-3 px-6 text-center text-slate-600 dark:text-white/75">
                <LoaderCircle className="size-8 animate-spin text-[#2563eb] dark:text-[#60a5fa]" />
                <span className="text-sm font-medium">
                  {m['landing.hero.processing_hint']()}
                </span>
              </div>
            </div>
          )}

          {generationResult.status === 'failed' && (
            <div
              role="alert"
              className="flex aspect-video items-center justify-center px-6 text-center"
            >
              <div className="flex max-w-lg flex-col items-center gap-3 text-red-600 dark:text-red-300">
                <span className="flex size-10 items-center justify-center rounded-full bg-red-500/10">
                  <X className="size-5" />
                </span>
                <span className="text-sm leading-6">
                  {generationResult.error ||
                    m['landing.hero.generation_failed']()}
                </span>
              </div>
            </div>
          )}

          {generationResult.status === 'success' && (
            <div className="group relative flex aspect-video w-full items-center justify-center overflow-hidden bg-black">
              <video
                src={generationResult.videoUrl}
                controls
                autoPlay
                loop
                playsInline
                className="size-full object-contain"
              />
              <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => setDownloadQrOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-400/40 bg-black/60 px-3 py-1.5 text-xs font-medium text-amber-300 shadow-lg backdrop-blur-md transition hover:bg-black/80"
                  title="Scan QR Code to Download"
                >
                  <QrCode className="size-3.5 text-amber-400" />
                  <span>Scan QR Code</span>
                </button>
                <DownloadButton
                  item={{
                    id: generationResult.id || generationResult.taskId,
                    url: generationResult.videoUrl!,
                    mediaType: 'video',
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/60 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-md transition hover:bg-black/80"
                  iconClassName="size-3.5"
                >
                  {m['showcase.dialog.download']()}
                </DownloadButton>
              </div>
            </div>
          )}
        </div>
      </div>

      {downloadQrOpen && generationResult.videoUrl && (
        <MobileVideoDownloadModal
          isOpen={downloadQrOpen}
          onClose={() => setDownloadQrOpen(false)}
          videoUrl={generationResult.videoUrl}
          title={generationResult.prompt || 'AI Video'}
          filename="ai-video.mp4"
        />
      )}
    </div>
  );
}

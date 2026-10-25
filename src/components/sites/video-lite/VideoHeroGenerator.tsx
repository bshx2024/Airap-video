'use client';

import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { QuickAuthModal } from '@/components/sites/root/QuickAuthModal';
import { HistoryLibraryPicker } from '@/components/sites/video-lite/HistoryLibraryPicker';
import {
  useVideoHeroGenerator,
  type VideoHeroExternalPrompt,
} from '@/components/sites/video-lite/useVideoHeroGenerator';
import { VideoHeroComposer } from '@/components/sites/video-lite/VideoHeroComposer';
import { VideoHeroResultPanel } from '@/components/sites/video-lite/VideoHeroResultPanel';

export function VideoHeroGenerator({
  externalPrompt,
  onClearExternalPrompt,
}: {
  externalPrompt?: VideoHeroExternalPrompt | null;
  onClearExternalPrompt?: () => void;
}) {
  const hero = useVideoHeroGenerator({
    externalPrompt,
    onClearExternalPrompt,
  });

  return (
    <section
      id="generator"
      className="relative overflow-hidden bg-[#020617] text-white"
    >
      <div
        className={cn(
          'relative z-10 mx-auto w-full px-5 pt-[16svh] text-center sm:px-8 sm:pt-[18svh]',
          hero.generationResult
            ? 'min-h-0 pb-6 sm:pb-8'
            : 'min-h-0 pb-14 sm:pb-16'
        )}
      >
        <div className="pointer-events-none relative z-30 mx-auto flex max-w-5xl flex-col items-center">
          {/* Today's Free Quota Badge */}
          <div className="pointer-events-auto mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-xs font-semibold text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.15)] backdrop-blur-md transition hover:bg-amber-400/15">
            <span className="flex size-2 rounded-full bg-amber-400 animate-pulse" />
            <span>
              {m['landing.hero.today_free_credits']({
                remaining: hero.userBalance != null ? Math.min(hero.userBalance, 100) : 100,
                total: 100,
              })}
            </span>
            {!hero.session?.user && (
              <button
                type="button"
                onClick={hero.requireAuth}
                className="cursor-pointer rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] text-amber-200 transition hover:bg-amber-400/30"
              >
                {m['landing.hero.login_to_claim']()}
              </button>
            )}
          </div>

          <div>
            <h1 className="text-[36px] leading-[1.05] font-normal tracking-[-0.035em] text-balance text-white sm:text-5xl lg:text-6xl">
              {m['landing.hero.title']()}
            </h1>
          </div>
          <div className="w-full">
            <p className="mx-auto mt-5 max-w-4xl text-[15px] leading-[1.5] text-white/75 sm:text-base">
              {m['landing.hero.desc']()}
            </p>
          </div>
        </div>

        <div className="absolute inset-0 overflow-hidden bg-[#020617] text-white">
          <div aria-hidden="true" className="absolute inset-0 z-0">
            <video
              ref={hero.videoRef}
              key={hero.activePreset.video}
              src={hero.activePreset.video}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="absolute inset-0 size-full object-cover opacity-100 brightness-[0.7] saturate-110 transition-opacity duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-[radial-gradient(80%_68%_at_50%_34%,#0f3d7526_0%,#020617e8_100%)]" />
            <div className="absolute inset-x-0 top-0 h-52 bg-gradient-to-b from-[#020617]/90 to-transparent" />
            <div
              className={cn(
                'absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#020617] to-transparent',
                hero.generationResult
                  ? 'h-32 via-[#020617]/80 sm:h-40'
                  : 'h-[54svh] via-[#020617cc]'
              )}
            />
          </div>
        </div>

        <div
          className={cn(
            'pointer-events-none relative z-40 mx-auto flex max-w-7xl flex-col items-center justify-start px-2 sm:px-8',
            hero.generationResult
              ? 'min-h-0 pt-6 sm:pt-7'
              : 'min-h-0 pt-[6svh] sm:pt-[7svh]'
          )}
        >
          <VideoHeroComposer
            prompt={hero.prompt}
            promptPlaceholder={hero.promptPlaceholder}
            onPromptChange={hero.setPrompt}
            imageUrls={hero.imageUrls}
            imageNames={hero.imageNames}
            onRemoveImage={hero.handleRemoveImage}
            isFirstLastFrameMode={hero.isFirstLastFrameMode}
            isUploading={hero.isUploading}
            isGenerating={hero.isGenerating}
            sessionUser={hero.session?.user}
            onRequireAuth={hero.requireAuth}
            mediaActions={hero.mediaActions}
            libraryMaxSelect={hero.libraryMaxSelect}
            frameLimit={hero.frameLimit}
            onOpenLibrary={() => hero.setLibraryOpen(true)}
            onSetUploadSlot={hero.setUploadSlot}
            uploadSlot={hero.uploadSlot}
            fileInputRef={hero.fileInputRef}
            onUploadFile={(file, slot) => void hero.uploadImageFile(file, slot)}
            selectedModel={hero.selectedModel}
            selectedModelId={hero.selectedModelId}
            onApplyModel={hero.applyModel}
            paramsMenuOpen={hero.paramsMenuOpen}
            onParamsMenuOpenChange={hero.setParamsMenuOpen}
            resolution={hero.resolution}
            onResolutionChange={hero.setResolution}
            supportedResolutions={hero.supportedResolutions}
            duration={hero.duration}
            onDurationChange={hero.setDuration}
            durationRange={hero.durationRange}
            durationProgress={hero.durationProgress}
            aspectRatio={hero.aspectRatio}
            onAspectRatioChange={hero.setAspectRatio}
            aspectRatios={hero.aspectRatios}
            onGenerate={() => void hero.handleGenerate()}
            showProcessingHint={Boolean(
              hero.isGenerating ||
              hero.generationResult?.status === 'processing'
            )}
            referenceMode={hero.referenceMode}
            userBalance={hero.userBalance}
            onSwapImages={hero.handleSwapImages}
            onSetImages={hero.handleSetImages}
          />
        </div>
      </div>

      {hero.generationResult && (
        <VideoHeroResultPanel
          generationResult={hero.generationResult}
          onClear={hero.clearGenerationResult}
        />
      )}

      <HistoryLibraryPicker
        open={hero.libraryOpen}
        onOpenChange={hero.setLibraryOpen}
        maxSelect={hero.libraryMaxSelect}
        maxSelectCap={hero.frameLimit}
        onAdd={hero.handleAddFromLibrary}
      />

      <QuickAuthModal
        open={hero.showAuthModal}
        onOpenChange={hero.setShowAuthModal}
        callbackUrl="/"
      />
    </section>
  );
}

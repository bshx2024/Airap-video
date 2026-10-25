import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Image, ImagePlus, Library } from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { tDynamic } from '@/core/i18n/dynamic';
import { apiGet } from '@/lib/api-client';
import {
  clampVideoDuration,
  getVideoModelAspectRatios,
  getVideoModelById,
  getVideoModelDefaultAspectRatio,
  getVideoModelDurationRange,
  getVideoModelSupportedResolutions,
  type VideoModelConfig,
} from '@/config/ai-models';
import { HERO_PRESETS } from '@/config/video-landing-data';
import { pollPendingCreationTasks } from '@/modules/creations/polling';
import type { CreationItem } from '@/modules/creations/types';
import {
  isLocalMediaUrl,
  publishLocalMediaSources,
} from '@/lib/publish-local-media';
import { resolveUploadMediaErrorMessage } from '@/lib/upload-media-error';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { formatLocalizedErrorMessage } from '@/components/sites/root/generation-errors';
import type { HistoryLibraryMedia } from '@/components/sites/video-lite/HistoryLibraryPicker';
import { runVideoHeroGenerate } from '@/components/sites/video-lite/video-hero-generate';
import {
  creationMatchesTaskId,
  findCreationByTaskId,
  isHeroTaskFailed,
  isHeroTaskPending,
  isHeroTaskSuccess,
  persistHomeHeroTaskId,
  readHomeHeroTaskId,
} from '@/components/sites/video-lite/video-hero-task';
import {
  isVideoMediaUrl,
  MAX_FIRST_LAST_FRAMES,
  MAX_IMAGE_FILE_SIZE,
  parseDurationSeconds,
  parsePresetParams,
  resolveModelId,
  VIDEO_MODELS,
} from '@/components/sites/video-lite/video-hero-utils';
import type { VideoHeroUploadSlot } from '@/components/sites/video-lite/VideoHeroComposer';
import type { VideoHeroGenerationResult } from '@/components/sites/video-lite/VideoHeroResultPanel';

export type VideoHeroExternalPrompt = {
  prompt: string;
  model: string;
  sourceImage?: string;
  /** Clear previous media / generation result before applying */
  reset?: boolean;
  /** Publish local/bundled media to storage right after attach */
  publishMedia?: boolean;
  /** Switch generator into reference-to-video mode */
  referenceMode?: boolean;
};

export function useVideoHeroGenerator({
  externalPrompt,
  onClearExternalPrompt,
}: {
  externalPrompt?: VideoHeroExternalPrompt | null;
  onClearExternalPrompt?: () => void;
}) {
  const { data: session } = useSession();
  const creditsQuery = useQuery({
    queryKey: ['credits', 'balance', session?.user?.id],
    queryFn: () => apiGet<{ balance: number }>('/api/credits?summary=1'),
    enabled: Boolean(session?.user),
    staleTime: 10_000,
  });
  const userBalance = session?.user ? (creditsQuery.data?.balance ?? 0) : null;
  const [activePresetIndex, setActivePresetIndex] = useState<number | null>(0);
  // Init with locale text (afd554e) so first paint is not empty; textarea has
  // suppressHydrationWarning if cookie/url locale briefly differs on hydrate.
  const [prompt, setPrompt] = useState(() =>
    tDynamic(`video.clone.prompts.${HERO_PRESETS[0]?.key}_text`)
  );
  const [promptPlaceholder, setPromptPlaceholder] = useState(() =>
    m['landing.hero.placeholder_video']()
  );
  const initialModelId = resolveModelId(HERO_PRESETS[0]?.model);
  const initialModel = getVideoModelById(initialModelId);
  const initialPresetParams = parsePresetParams(HERO_PRESETS[0]?.params || '');
  const [selectedModelId, setSelectedModelId] = useState(initialModelId);
  const [resolution, setResolution] = useState(() => {
    const supported = getVideoModelSupportedResolutions(initialModelId);
    const fromPreset = initialPresetParams.resolution;
    if (
      fromPreset &&
      supported.some((item) => item.toLowerCase() === fromPreset.toLowerCase())
    ) {
      return (
        supported.find(
          (item) => item.toLowerCase() === fromPreset.toLowerCase()
        ) || fromPreset
      );
    }
    return initialModel?.defaultResolution || '720P';
  });
  const [duration, setDuration] = useState(() =>
    clampVideoDuration(
      initialModelId,
      initialPresetParams.duration ??
        parseDurationSeconds(initialModel?.defaultDuration)
    )
  );
  const [aspectRatio, setAspectRatio] = useState(
    getVideoModelDefaultAspectRatio(initialModelId)
  );
  const [imageUrls, setImageUrls] = useState<string[]>(
    HERO_PRESETS[0]?.sourceImage ? [HERO_PRESETS[0].sourceImage] : []
  );
  const [imageNames, setImageNames] = useState<string[]>(
    HERO_PRESETS[0]?.sourceImageName ? [HERO_PRESETS[0].sourceImageName] : []
  );
  const [uploadSlot, setUploadSlot] = useState<VideoHeroUploadSlot>('first');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [paramsMenuOpen, setParamsMenuOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [referenceMode, setReferenceMode] = useState(false);
  const [generationResult, setGenerationResult] =
    useState<VideoHeroGenerationResult | null>(null);
  const generationResultRef = useRef<VideoHeroGenerationResult | null>(null);
  const lastPresetIndexRef = useRef(0);
  const failedToastIdsRef = useRef(new Set<string>());

  useEffect(() => {
    generationResultRef.current = generationResult;
  }, [generationResult]);

  useEffect(() => {
    const isTrackingTask = (item: CreationItem) => {
      const tracked = readHomeHeroTaskId();
      const current = generationResultRef.current;
      return (
        creationMatchesTaskId(item, tracked) ||
        creationMatchesTaskId(item, current?.id) ||
        creationMatchesTaskId(item, current?.taskId)
      );
    };

    const notifyHeroTaskFailed = (
      taskId: string,
      errorCode?: string,
      altId?: string
    ) => {
      if (
        failedToastIdsRef.current.has(taskId) ||
        (altId && failedToastIdsRef.current.has(altId))
      ) {
        return;
      }
      failedToastIdsRef.current.add(taskId);
      if (altId) failedToastIdsRef.current.add(altId);
      toast.error(formatLocalizedErrorMessage(errorCode));
    };

    const applySuccessResult = (item: CreationItem) => {
      // Clear 后 key/result 已空：忽略滞后 updated，避免结果被拉回
      if (!isTrackingTask(item)) return;
      persistHomeHeroTaskId(item.id);
      setGenerationResult((prev) => {
        if (
          prev?.status === 'success' &&
          prev.id === item.id &&
          prev.videoUrl === item.url
        ) {
          return prev;
        }
        return {
          id: item.id,
          taskId: item.dbId || item.id,
          status: 'success',
          videoUrl: item.url,
          prompt: item.prompt || prev?.prompt,
        };
      });
    };

    const attachPendingHeroTask = (item: CreationItem) => {
      persistHomeHeroTaskId(item.id);
      setGenerationResult((prev) => {
        if (
          prev?.status === 'processing' &&
          (prev.id === item.id || prev.taskId === item.id)
        ) {
          return prev;
        }
        return {
          id: item.id,
          taskId: item.dbId || item.id,
          status: 'processing',
          prompt: item.prompt || prev?.prompt,
        };
      });
      pollPendingCreationTasks('video');
    };

    const clearHeroTaskTracking = () => {
      persistHomeHeroTaskId(null);
      setGenerationResult(null);
    };

    const restoreHomeHeroTask = () => {
      const taskId = readHomeHeroTaskId();
      if (!taskId) return;
      const item = findCreationByTaskId(taskId);
      if (!item) return;

      if (isHeroTaskPending(item)) {
        attachPendingHeroTask(item);
        return;
      }

      if (isHeroTaskSuccess(item)) {
        applySuccessResult(item);
        return;
      }

      // failed：清掉会话任务，保持首页 preset 现状（刷新不再弹 toast）
      clearHeroTaskTracking();
    };

    restoreHomeHeroTask();

    const handleCompleted = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const eventTaskId = detail.taskId as string | undefined;
      if (!eventTaskId) return;

      const tracked =
        readHomeHeroTaskId() ||
        generationResultRef.current?.id ||
        generationResultRef.current?.taskId ||
        null;
      if (!tracked) return;

      const item =
        findCreationByTaskId(eventTaskId) || findCreationByTaskId(tracked);
      const related =
        eventTaskId === tracked ||
        (item != null &&
          creationMatchesTaskId(item, eventTaskId) &&
          creationMatchesTaskId(item, tracked));
      if (!related) return;

      if (detail.status === 'success') {
        if (item && isHeroTaskSuccess(item)) {
          persistHomeHeroTaskId(item.id);
          applySuccessResult(item);
        } else {
          clearHeroTaskTracking();
        }
        return;
      }

      // 进行中失败：保留失败面板（与现网一致），但不把失败任务留给刷新回显
      persistHomeHeroTaskId(null);
      if (item && isHeroTaskFailed(item)) {
        setGenerationResult({
          id: item.id,
          taskId: item.dbId || item.id,
          status: 'failed',
          error: formatLocalizedErrorMessage(
            detail.errorCode || item.errorCode || 'generation_failed'
          ),
          prompt: item.prompt,
        });
      }
      notifyHeroTaskFailed(eventTaskId, detail.errorCode, item?.id);
    };

    const handleUpdated = () => {
      const taskId =
        readHomeHeroTaskId() ||
        generationResultRef.current?.id ||
        generationResultRef.current?.taskId ||
        null;
      if (!taskId) return;
      const item = findCreationByTaskId(taskId);
      if (!item) return;
      if (!isTrackingTask(item)) return;

      if (isHeroTaskPending(item)) {
        attachPendingHeroTask(item);
        return;
      }

      if (isHeroTaskSuccess(item)) {
        applySuccessResult(item);
        return;
      }

      if (isHeroTaskFailed(item)) {
        persistHomeHeroTaskId(null);
        setGenerationResult({
          id: item.id,
          taskId: item.dbId || item.id,
          status: 'failed',
          error: formatLocalizedErrorMessage(
            item.errorCode || 'generation_failed'
          ),
          prompt: item.prompt,
        });
        notifyHeroTaskFailed(item.id, item.errorCode, item.dbId);
      }
    };

    window.addEventListener(
      'imagegen_creation_task_completed',
      handleCompleted
    );
    window.addEventListener('imagegen_creations_updated', handleUpdated);
    return () => {
      window.removeEventListener(
        'imagegen_creation_task_completed',
        handleCompleted
      );
      window.removeEventListener('imagegen_creations_updated', handleUpdated);
    };
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const locale = getLocale();
  const selectedModel: VideoModelConfig | undefined =
    getVideoModelById(selectedModelId) || VIDEO_MODELS[0];
  const supportedResolutions =
    getVideoModelSupportedResolutions(selectedModelId);
  const durationRange = getVideoModelDurationRange(selectedModelId);
  const aspectRatios = useMemo(
    () => getVideoModelAspectRatios(selectedModelId),
    [selectedModelId]
  );
  const maxImages = selectedModel?.maxImages ?? 1;
  const isFirstLastFrameMode = Boolean(selectedModel?.supportsFirstLastFrame);
  const frameLimit = isFirstLastFrameMode
    ? Math.min(maxImages, MAX_FIRST_LAST_FRAMES)
    : Math.min(maxImages, 1);
  const durationProgress =
    durationRange.max === durationRange.min
      ? 100
      : ((duration - durationRange.min) /
          (durationRange.max - durationRange.min)) *
        100;

  useEffect(() => {
    if (!supportedResolutions.includes(resolution)) {
      setResolution(
        selectedModel?.defaultResolution || supportedResolutions[0] || '720P'
      );
    }
    setDuration((prev) => clampVideoDuration(selectedModelId, prev));
    if (
      !aspectRatios.some(
        (item) => item.toLowerCase() === aspectRatio.toLowerCase()
      )
    ) {
      setAspectRatio(getVideoModelDefaultAspectRatio(selectedModelId));
    }
  }, [
    aspectRatio,
    aspectRatios,
    resolution,
    selectedModel?.defaultResolution,
    selectedModelId,
    supportedResolutions,
  ]);

  useEffect(() => {
    if (imageUrls.length <= frameLimit) return;
    setImageUrls((prev) => prev.slice(0, frameLimit));
    setImageNames((prev) => prev.slice(0, frameLimit));
  }, [imageUrls.length, frameLimit]);

  // Keep prompt/image/params in sync before paint (preset switch + locale).
  // Skip when deselected (null) after showcase「使用该提示词/视频素材」.
  useLayoutEffect(() => {
    if (activePresetIndex == null) return;
    const current = HERO_PRESETS[activePresetIndex];
    if (!current) return;
    const initialPrompt = tDynamic(`video.clone.prompts.${current.key}_text`);
    const modelId = resolveModelId(current.model);
    const parsed = parsePresetParams(current.params);
    const model = getVideoModelById(modelId);
    setReferenceMode(false);
    setPrompt(initialPrompt);
    setPromptPlaceholder(m['landing.hero.placeholder_video']());
    setSelectedModelId(modelId);
    setResolution(
      parsed.resolution &&
        getVideoModelSupportedResolutions(modelId).some(
          (item) => item.toLowerCase() === parsed.resolution!.toLowerCase()
        )
        ? getVideoModelSupportedResolutions(modelId).find(
            (item) => item.toLowerCase() === parsed.resolution!.toLowerCase()
          )!
        : model?.defaultResolution || '720P'
    );
    setDuration(
      clampVideoDuration(
        modelId,
        parsed.duration ?? parseDurationSeconds(model?.defaultDuration)
      )
    );
    setAspectRatio(getVideoModelDefaultAspectRatio(modelId));
    setImageUrls(current.sourceImage ? [current.sourceImage] : []);
    setImageNames(current.sourceImageName ? [current.sourceImageName] : []);
  }, [activePresetIndex, locale]);

  const requireAuth = () => setShowAuthModal(true);

  // Handle prompt / media passed from showcase actions.
  useEffect(() => {
    if (!externalPrompt) return;
    let cancelled = false;

    const applyExternal = async () => {
      if (externalPrompt.reset !== false) {
        persistHomeHeroTaskId(null);
        setGenerationResult(null);
      }
      // Showcase 填入后取消「示例」选中
      setActivePresetIndex(null);

      const nextReferenceMode = Boolean(externalPrompt.referenceMode);
      setReferenceMode(nextReferenceMode);

      let nextModelId = resolveModelId(externalPrompt.model);
      if (nextReferenceMode) {
        const model = getVideoModelById(nextModelId);
        if (!model?.supportsReferenceToVideo) {
          const fallback =
            VIDEO_MODELS.find((item) => item.supportsReferenceToVideo)?.id ||
            'minimax-h3';
          nextModelId = fallback;
        }
      }
      setPrompt(externalPrompt.prompt);
      setSelectedModelId(nextModelId);

      const mediaUrl = externalPrompt.sourceImage?.trim() || '';
      if (!mediaUrl) {
        setImageUrls([]);
        setImageNames([]);
      } else {
        const mediaName =
          decodeURIComponent(mediaUrl.split('/').pop() || '') ||
          (isVideoMediaUrl(mediaUrl) ? 'reference.mp4' : 'reference-frame.png');
        setImageUrls([mediaUrl]);
        setImageNames([mediaName]);

        if (externalPrompt.publishMedia && isLocalMediaUrl(mediaUrl)) {
          if (!session?.user) {
            requireAuth();
          } else {
            setIsUploading(true);
            try {
              const [published] = await publishLocalMediaSources([
                { src: mediaUrl, name: mediaName },
              ]);
              if (!cancelled && published) {
                setImageUrls([published]);
                toast.success(m['landing.hero.toast_media_attached']());
              }
            } catch (err: any) {
              if (!cancelled) {
                toast.error(resolveUploadMediaErrorMessage(err?.message));
              }
            } finally {
              if (!cancelled) setIsUploading(false);
            }
          }
        }
      }

      document.getElementById('generator')?.scrollIntoView({
        behavior: 'smooth',
      });
      onClearExternalPrompt?.();
    };

    void applyExternal();
    return () => {
      cancelled = true;
    };
  }, [externalPrompt, onClearExternalPrompt, session?.user]);

  const activePreset =
    HERO_PRESETS[activePresetIndex ?? lastPresetIndexRef.current] ??
    HERO_PRESETS[0];
  if (activePresetIndex != null) {
    lastPresetIndexRef.current = activePresetIndex;
  }
  const firstFrame = imageUrls[0];
  const lastFrame = imageUrls[1];

  const applyModel = (modelId: string) => {
    const model = getVideoModelById(modelId);
    if (!model) return;
    setSelectedModelId(modelId);
    setResolution(model.defaultResolution || '720P');
    setDuration(parseDurationSeconds(model.defaultDuration));
    setAspectRatio(getVideoModelDefaultAspectRatio(modelId));
    const nextLimit = model.supportsFirstLastFrame
      ? Math.min(
          model.maxImages ?? MAX_FIRST_LAST_FRAMES,
          MAX_FIRST_LAST_FRAMES
        )
      : Math.min(model.maxImages ?? 1, 1);
    if (nextLimit < imageUrls.length) {
      setImageUrls((prev) => prev.slice(0, nextLimit));
      setImageNames((prev) => prev.slice(0, nextLimit));
    }
  };

  const handleSelectPreset = (index: number) => {
    setActivePresetIndex(index);
  };

  const handleRandomSelect = () => {
    let nextIndex = Math.floor(Math.random() * HERO_PRESETS.length);
    if (nextIndex === activePresetIndex) {
      nextIndex = (nextIndex + 1) % HERO_PRESETS.length;
    }
    handleSelectPreset(nextIndex);
  };

  const uploadImageFile = async (file: File, slot: VideoHeroUploadSlot) => {
    if (!session?.user) {
      requireAuth();
      return;
    }
    if (file.size > MAX_IMAGE_FILE_SIZE) {
      toast.error(m['landing.hero.upload_size_limit']());
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error(m['landing.hero.upload_failed']());
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('files', file);
      const res = await fetch('/api/storage/upload-media', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      const remoteUrl = data?.data?.urls?.[0] || data?.urls?.[0];
      if (!res.ok || data?.code !== 0 || !remoteUrl) {
        throw new Error(data?.message || m['landing.hero.upload_failed']());
      }

      if (slot === 'last' && (!selectedModel?.supportsFirstLastFrame || frameLimit < 2)) {
        const duoModel = VIDEO_MODELS.find(
          (m) => m.supportsFirstLastFrame && (m.maxImages ?? 1) >= 2
        );
        if (duoModel) {
          applyModel(duoModel.id);
        }
      }

      setImageUrls((prev) => {
        const next = [...prev];
        if (slot === 'first' || slot === 'reference') {
          next[0] = remoteUrl;
        } else if (slot === 'last') {
          if (!next[0]) {
            next[0] = remoteUrl;
          } else {
            next[1] = remoteUrl;
          }
        }
        return next.filter(Boolean).slice(0, 2);
      });
      setImageNames((prev) => {
        const next = [...prev];
        if (slot === 'first' || slot === 'reference') {
          next[0] = file.name;
        } else if (slot === 'last') {
          if (!next[0]) {
            next[0] = file.name;
          } else {
            next[1] = file.name;
          }
        }
        return next.filter(Boolean).slice(0, 2);
      });
      toast.success(m['landing.hero.toast_media_attached']());
    } catch (err: any) {
      toast.error(resolveUploadMediaErrorMessage(err?.message));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const clearGenerationResult = () => {
    persistHomeHeroTaskId(null);
    setGenerationResult(null);
  };

  const handleGenerate = async () => {
    failedToastIdsRef.current.clear();
    await runVideoHeroGenerate({
      prompt,
      imageUrls,
      imageNames,
      frameLimit,
      isFirstLastFrameMode,
      firstFrame,
      lastFrame,
      sessionUser: session?.user,
      requireAuth,
      selectedModelId,
      resolution,
      duration,
      aspectRatio,
      referenceMode,
      setGenerationResult,
      setImageUrls,
      setIsGenerating,
    });
  };

  const mediaActions = [
    {
      key: 'first' as const,
      label: m['landing.hero.upload_first_frame'](),
      icon: ImagePlus,
      enabled: true,
    },
    {
      key: 'last' as const,
      label: m['landing.hero.upload_last_frame'](),
      icon: Image,
      enabled: Boolean(isFirstLastFrameMode && frameLimit > 1),
    },
    {
      key: 'library' as const,
      label: m['agent.composer.add_from_library'](),
      icon: Library,
      enabled: true,
    },
  ].filter((item) => item.enabled);

  const filledFrameCount = imageUrls.filter((url) =>
    Boolean(url?.trim())
  ).length;
  const libraryMaxSelect = Math.max(0, frameLimit - filledFrameCount);

  const handleAddFromLibrary = (media: HistoryLibraryMedia[]) => {
    if (!media.length) return;
    // Only image URLs can fill first/last frames (pixany form generator).
    const frames = media.filter((item) => !isVideoMediaUrl(item.src));
    if (frames.length === 0) {
      toast.error(m['landing.hero.upload_failed']());
      return;
    }
    const filled = imageUrls.map((item) => item.trim()).filter(Boolean);
    const added = frames.filter((item) => !filled.includes(item.src));
    if (filled.length + frames.length > frameLimit) {
      toast.info(m['landing.hero.upload_limit_reached']({ max: frameLimit }));
    }
    if (added.length === 0) return;
    setImageUrls(
      [...filled, ...added.map((item) => item.src)].slice(0, frameLimit)
    );
    setImageNames(
      [
        ...imageNames.slice(0, filled.length),
        ...added.map((item) => item.name || 'frame.png'),
      ].slice(0, frameLimit)
    );
    toast.success(m['landing.hero.toast_media_attached']());
  };

  const handleRemoveImage = (index: number) => {
    setImageUrls((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) setReferenceMode(false);
      return next;
    });
    setImageNames((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSwapImages = () => {
    setImageUrls((prev) => {
      if (prev.length < 2) return prev;
      return [prev[1], prev[0], ...prev.slice(2)];
    });
    setImageNames((prev) => {
      if (prev.length < 2) return prev;
      return [prev[1], prev[0], ...prev.slice(2)];
    });
    toast.success('Rapper roles swapped! ⇄');
  };

  const handleSetImages = (urls: string[], names: string[]) => {
    setImageUrls(urls);
    setImageNames(names);
    toast.success('Sample duo photos loaded!');
  };

  return {
    session,
    userBalance,
    activePresetIndex,
    prompt,
    setPrompt,
    promptPlaceholder,
    selectedModelId,
    selectedModel,
    resolution,
    setResolution,
    duration,
    setDuration,
    aspectRatio,
    setAspectRatio,
    imageUrls,
    imageNames,
    uploadSlot,
    setUploadSlot,
    isGenerating,
    isUploading,
    showAuthModal,
    setShowAuthModal,
    paramsMenuOpen,
    setParamsMenuOpen,
    libraryOpen,
    setLibraryOpen,
    referenceMode,
    generationResult,
    setGenerationResult,
    clearGenerationResult,
    fileInputRef,
    videoRef,
    supportedResolutions,
    durationRange,
    aspectRatios,
    isFirstLastFrameMode,
    frameLimit,
    durationProgress,
    activePreset,
    applyModel,
    handleSelectPreset,
    handleRandomSelect,
    requireAuth,
    uploadImageFile,
    handleGenerate,
    mediaActions,
    libraryMaxSelect,
    handleAddFromLibrary,
    handleRemoveImage,
    handleSwapImages,
    handleSetImages,
  };
}

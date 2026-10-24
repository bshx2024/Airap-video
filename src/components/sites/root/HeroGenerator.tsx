'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { ArrowUp, ChevronDown, ImagePlus, Loader2, Type } from 'lucide-react';
import { toast } from 'sonner';

import { extractMediaUrl } from '@/core/ai/types';
import { useSession } from '@/core/auth/client';
import { tDynamic } from '@/core/i18n/dynamic';
import { usePathname } from '@/core/i18n/navigation';
import {
  getImageModelCredits,
  getModelResolutionOptions,
  getModelSupportedAspectRatios,
  needsModelIconInvert,
} from '@/config/ai-models';
import type { FeatureQuickStartItem } from '@/config/feature-pages';
import {
  EDIT_EXAMPLES,
  getLandingGeneratorModels,
  QUICK_PROMPTS,
  type EditExampleItem,
  type GeneratorModel,
} from '@/config/landing-data';
import {
  getToolGeneratorModels,
  getToolShowcaseItems,
  TOOL_MODEL_ID,
  type ToolPageConfig,
  type ToolShowcaseItem,
} from '@/config/tools';
import { pollPendingCreationTasks } from '@/modules/creations/polling';
import {
  getLocalCreations,
  inferCreationMode,
  saveLocalCreation,
} from '@/modules/creations/storage';
import type { CreationItem } from '@/modules/creations/types';
import {
  clearGeneratorDraft,
  readGeneratorDraft,
  saveGeneratorDraft,
} from '@/modules/generator-draft';
import { ApiError, apiPost } from '@/lib/api-client';
import {
  isCjkPromptTooShort,
  MIN_CJK_PROMPT_LENGTH,
} from '@/lib/prompt-validation';
import { currentPathWithQuery } from '@/lib/redirect';
import {
  buildToolSubmitParams,
  enrichToolPrompt,
  getToolEnsureFallback,
  getToolEnsureMessageKey,
} from '@/lib/tool-prompt';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import {
  ReferenceImageStrip,
  toastUploadError,
  type ReferenceUploadingItem,
} from '@/components/sites/generator/ReferenceImageStrip';
import { QuickAuthModal } from '@/components/sites/root/QuickAuthModal';
import { ToolExampleCards } from '@/components/sites/tools/ToolExampleCards';
import { ToolOptionSelect } from '@/components/sites/tools/ToolOptionSelect';
import { WorkspaceRecentCreations } from '@/components/sites/workspace/WorkspaceRecentCreations';

import { formatLocalizedErrorMessage } from './generation-errors';

const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;

function isHttpUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isUsableImageUrl(url: string) {
  if (!url) return false;
  // 站内静态资源或已上传的绝对地址均可作为参考图
  if (url.startsWith('/') && !url.startsWith('//')) return true;
  return isHttpUrl(url);
}

function getRecentCreationsScrollOffset() {
  const stickyHeader = document.querySelector('header.sticky');
  if (stickyHeader instanceof HTMLElement) {
    // sticky 时 bottom 已含 top-banner 偏移；未吸顶时同样对得上文档流位置
    return stickyHeader.getBoundingClientRect().bottom + 12;
  }
  const bannerH =
    Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        '--top-banner-height'
      )
    ) || 0;
  return bannerH + 56 + 12;
}

function scrollToRecentCreations(smooth = true) {
  if (typeof window === 'undefined') return;
  const doScroll = () => {
    const el =
      document.getElementById('recent-creations') ||
      document.querySelector('[data-section="recent-creations"]');
    if (!el) return false;
    const top =
      window.scrollY +
      el.getBoundingClientRect().top -
      getRecentCreationsScrollOffset();
    window.scrollTo({
      top: Math.max(0, top),
      behavior: smooth ? 'smooth' : 'auto',
    });
    return true;
  };
  // 等近期创作挂载/布局完成后再滚，避免位置算偏
  requestAnimationFrame(() => {
    if (doScroll()) return;
    setTimeout(doScroll, 80);
  });
}

type UploadingItem = ReferenceUploadingItem;

function RatioIcon({ ratio }: { ratio: string }) {
  const [w, h] = ratio.split(':').map(Number);
  const scale = 18 / Math.max(w, h);
  const width = Math.round(w * scale);
  const height = Math.round(h * scale);

  return (
    <span
      aria-hidden="true"
      className="border-current"
      style={{
        display: 'block',
        width,
        height,
        borderWidth: 1.5,
        borderStyle: 'solid',
        borderRadius: 3,
      }}
    />
  );
}

function ModelGlyph({ model }: { model: GeneratorModel }) {
  return (
    <img
      src={model.icon}
      alt=""
      width={14}
      height={14}
      className={cn(
        'size-3.5 shrink-0 rounded-sm object-cover',
        needsModelIconInvert(model.icon) && 'dark:invert'
      )}
    />
  );
}

function toolOptionLabel(
  kind: ToolPageConfig['optionKind'],
  value: string
): string {
  if (!kind) return value;
  if (kind === 'scale') return `${value}×`;
  if (kind === 'aspect_ratio') return value;
  return tDynamic(`landing.tools.options.style.${value}`, value);
}

export type HeroGeneratorMode = 'default' | 'text-only' | 'image-only';

/** 生成器所在页面上下文：用于近期创作归属与切回路由后的恢复展示 */
function getGeneratorPageKey({
  mode,
  tool,
  unifiedInput,
  initialModelId,
}: {
  mode: HeroGeneratorMode;
  tool?: ToolPageConfig;
  unifiedInput?: boolean;
  initialModelId?: string;
}): string {
  if (tool) return `tool:${tool.slug}`;
  if (unifiedInput && initialModelId) return `model:${initialModelId}`;
  if (mode === 'text-only') return 'text-to-image';
  if (mode === 'image-only') return 'image-to-image';
  return 'home';
}

function creationBelongsToPage(
  item: CreationItem,
  pageKey: string,
  { filterMode, filterModel }: { filterMode?: string; filterModel?: string }
): boolean {
  if (item.mediaType !== 'image') return false;
  if (item.pageKey) return item.pageKey === pageKey;
  // 旧数据 / 同步曾丢 pageKey：首页总览恢复通用图生任务；其余页按 mode/model 兜底
  if (pageKey === 'home') {
    const mode = item.mode || inferCreationMode(item);
    return mode === 'text-to-image' || mode === 'image-to-image';
  }
  if (filterModel) return item.model === filterModel;
  if (filterMode) {
    return (item.mode || inferCreationMode(item)) === filterMode;
  }
  return false;
}

type HeroGeneratorProps = {
  mode?: HeroGeneratorMode;
  title?: string;
  subtitle?: string;
  /** 覆盖首页默认 QUICK_PROMPTS（如 /text-to-image 专用快捷开始） */
  quickStartItems?: FeatureQuickStartItem[];
  /** 快捷开始标题的 messages 命名空间，默认 landing.quick_prompts */
  quickStartMessageNs?: string;
  /** 预选模型（如 /models/$slug） */
  initialModelId?: string;
  /**
   * 模型页统一输入：隐藏 tab / 快速开始，始终展示上传区；
   * 仅文字 → 文生图，文字+图 → 图生图。不影响其他页面。
   */
  unifiedInput?: boolean;
  /** 工具页：强制图生图 + 单图 + 工具选项 / prompt enrich / 示例卡片 */
  tool?: ToolPageConfig;
};

/** 主动切换路由时整实例 remount，清空 prompt / 参考图 / 结果等状态 */
export function HeroGenerator(props: HeroGeneratorProps = {}) {
  const pathname = usePathname();
  return <HeroGeneratorInner key={pathname} {...props} />;
}

function HeroGeneratorInner({
  mode = 'default',
  title,
  subtitle,
  quickStartItems,
  quickStartMessageNs = 'landing.quick_prompts',
  initialModelId,
  unifiedInput = false,
  tool,
}: HeroGeneratorProps) {
  const { data: session, isPending: sessionPending } = useSession();
  const isToolMode = Boolean(tool);
  const isImageOnly = mode === 'image-only' || isToolMode;
  const isTextOnly = mode === 'text-only' && !isToolMode;
  const showTabs = mode === 'default' && !unifiedInput && !isToolMode;
  const pageKey = getGeneratorPageKey({
    mode,
    tool,
    unifiedInput,
    initialModelId,
  });
  // 首页作总览展示全部近期图片；专题页按 mode / 模型收窄
  const recentFilterMode = tool
    ? tool.slug
    : unifiedInput
      ? undefined
      : mode === 'text-only'
        ? 'text-to-image'
        : mode === 'image-only'
          ? 'image-to-image'
          : undefined;
  const recentFilterModel =
    unifiedInput && initialModelId ? initialModelId : undefined;
  const toolShowcaseItems = tool ? getToolShowcaseItems(tool.slug) : [];
  const [tab, setTab] = useState<'text' | 'image'>(
    unifiedInput || isImageOnly ? 'image' : 'text'
  );
  const [prompt, setPrompt] = useState('');
  const availableModels = useMemo(() => {
    if (tool) {
      return getToolGeneratorModels(tool).map((model) => ({
        id: model.id,
        name: model.name,
        icon: model.icon,
        credits: model.credits,
        supportsImageToImage: model.supportsImageToImage,
        maxImages: model.maxImages ?? 3,
      }));
    }
    return getLandingGeneratorModels(tab);
  }, [tool, tab]);
  const [selectedModel, setSelectedModel] = useState<GeneratorModel>(() => {
    const models = tool
      ? getToolGeneratorModels(tool).map((model) => ({
          id: model.id,
          name: model.name,
          icon: model.icon,
          credits: model.credits,
          supportsImageToImage: model.supportsImageToImage,
          maxImages: model.maxImages ?? 3,
        }))
      : getLandingGeneratorModels(isImageOnly ? 'image' : 'text');
    if (initialModelId) {
      const found = models.find((item) => item.id === initialModelId);
      if (found) return found;
    }
    if (isToolMode) {
      return models.find((item) => item.id === TOOL_MODEL_ID) || models[0];
    }
    return isImageOnly
      ? models.find((item) => item.id === 'nano-banana-pro') || models[0]
      : models[0];
  });
  const [resolution, setResolution] = useState('auto');
  const [aspectRatio, setAspectRatio] = useState('auto');
  const [toolOption, setToolOption] = useState(tool?.optionDefault ?? '');
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [settingsPopoverOpen, setSettingsPopoverOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const settingsPopoverRef = useRef<HTMLDivElement>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingItems, setUploadingItems] = useState<UploadingItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  const activeTaskIdRef = useRef<string | null>(null);
  const completedToastIdsRef = useRef(new Set<string>());
  const lastShowcaseIdRef = useRef<string | null>(null);
  const uploadFilesRef = useRef<
    (files: File[], replaceAt?: number) => Promise<void>
  >(async () => {});
  const applyReferenceRef = useRef<(image: string, prompt: string) => void>(
    () => {}
  );

  const notifyCreationCompleted = (taskId: string) => {
    if (completedToastIdsRef.current.has(taskId)) return;
    completedToastIdsRef.current.add(taskId);
    toast.success(m['stp.common.creation_completed']());
  };

  const maxImages = isToolMode
    ? Math.min(selectedModel.maxImages ?? 1, 1)
    : (selectedModel.maxImages ?? 3);
  const availableResolutions = useMemo(
    () => getModelResolutionOptions(selectedModel.id),
    [selectedModel.id]
  );
  const availableAspectRatios = useMemo(
    () => getModelSupportedAspectRatios(selectedModel.id),
    [selectedModel.id]
  );
  const isUploading = uploadingItems.length > 0;

  const [mounted, setMounted] = useState(false);
  const [hasTriggeredGenerate, setHasTriggeredGenerate] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!modelDropdownOpen && !settingsPopoverOpen) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        modelDropdownOpen &&
        modelDropdownRef.current &&
        !modelDropdownRef.current.contains(target)
      ) {
        setModelDropdownOpen(false);
      }
      if (
        settingsPopoverOpen &&
        settingsPopoverRef.current &&
        !settingsPopoverRef.current.contains(target)
      ) {
        setSettingsPopoverOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [modelDropdownOpen, settingsPopoverOpen]);

  const showRecentCreations =
    mounted && Boolean(isGenerating || hasTriggeredGenerate || generatedResult);

  useEffect(() => {
    activeTaskIdRef.current = activeTaskId;
  }, [activeTaskId]);

  useEffect(() => {
    const attachPendingIfNeeded = () => {
      if (activeTaskIdRef.current) return;
      const pending = getLocalCreations().find(
        (item) =>
          (item.status === 'pending' || item.status === 'processing') &&
          creationBelongsToPage(item, pageKey, {
            filterMode: recentFilterMode,
            filterModel: recentFilterModel,
          })
      );
      if (!pending) return;
      // 仅切回「发起该任务的路由」时恢复近期创作区；不回填表单、不锁提交按钮
      setHasTriggeredGenerate(true);
      setActiveTaskId(pending.id);
      activeTaskIdRef.current = pending.id;
      pollPendingCreationTasks('image');
    };

    attachPendingIfNeeded();

    // 同步可能晚于首次 mount；补挂一次，避免刷新后仍显示「快速开始」
    const onCreationsUpdated = () => {
      attachPendingIfNeeded();
    };
    window.addEventListener('imagegen_creations_updated', onCreationsUpdated);
    return () => {
      window.removeEventListener(
        'imagegen_creations_updated',
        onCreationsUpdated
      );
    };
    // Attach matching in-progress task for this page instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleCompleted = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const taskId = detail.taskId as string | undefined;
      if (!taskId || taskId !== activeTaskIdRef.current) return;

      if (detail.status === 'success') {
        const item = getLocalCreations().find((c) => c.id === taskId);
        if (item?.url) setGeneratedResult(item.url);
        setIsGenerating(false);
        activeTaskIdRef.current = null;
        setActiveTaskId(null);
        notifyCreationCompleted(taskId);
        return;
      }

      setIsGenerating(false);
      activeTaskIdRef.current = null;
      setActiveTaskId(null);
      toast.error(formatLocalizedErrorMessage(detail.errorCode));
    };

    const handleUpdated = () => {
      const taskId = activeTaskIdRef.current;
      if (!taskId) return;
      const item = getLocalCreations().find((c) => c.id === taskId);
      if (!item) return;
      if (item.status === 'success' && item.url) {
        setGeneratedResult(item.url);
        setIsGenerating(false);
        activeTaskIdRef.current = null;
        setActiveTaskId(null);
        notifyCreationCompleted(taskId);
      } else if (item.status === 'failed') {
        setIsGenerating(false);
        activeTaskIdRef.current = null;
        setActiveTaskId(null);
        toast.error(formatLocalizedErrorMessage(item.errorCode));
      }
    };

    const handleUsePromptEvent = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setPrompt(customEvent.detail);
        document.getElementById('prompt-input')?.focus();
      }
    };

    const handleUseReferenceEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ image: string; prompt: string }>;
      if (!customEvent.detail) return;
      applyReferenceRef.current(
        customEvent.detail.image,
        customEvent.detail.prompt
      );
    };

    window.addEventListener(
      'imagegen_creation_task_completed',
      handleCompleted
    );
    window.addEventListener('imagegen_creations_updated', handleUpdated);
    window.addEventListener('use-prompt', handleUsePromptEvent);
    window.addEventListener('use-reference', handleUseReferenceEvent);
    return () => {
      window.removeEventListener(
        'imagegen_creation_task_completed',
        handleCompleted
      );
      window.removeEventListener('imagegen_creations_updated', handleUpdated);
      window.removeEventListener('use-prompt', handleUsePromptEvent);
      window.removeEventListener('use-reference', handleUseReferenceEvent);
    };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!availableModels.some((model) => model.id === selectedModel.id)) {
      if (availableModels[0]) setSelectedModel(availableModels[0]);
    }
  }, [availableModels, selectedModel.id]);

  useEffect(() => {
    if (!initialModelId || tool) return;
    const models = getLandingGeneratorModels(tab);
    const found = models.find((item) => item.id === initialModelId);
    if (found && found.id !== selectedModel.id) {
      setSelectedModel(found);
    }
  }, [initialModelId, tab, selectedModel.id, tool]);

  useEffect(() => {
    if (!availableResolutions.some((item) => item.value === resolution)) {
      setResolution('auto');
    }
    if (!availableAspectRatios.includes(aspectRatio)) {
      setAspectRatio('auto');
    }
  }, [
    availableAspectRatios,
    availableResolutions,
    aspectRatio,
    resolution,
    selectedModel.id,
  ]);

  useEffect(() => {
    if (imageUrls.length <= maxImages) return;
    setImageUrls((prev) => prev.slice(0, maxImages));
    toast.info(m['landing.hero.upload_limit_reached']({ max: maxImages }));
  }, [imageUrls.length, maxImages]);

  const requireAuth = () => {
    setShowAuthModal(true);
  };

  const ensureCanUpload = () => {
    if (session?.user) return true;
    saveGeneratorDraft({
      prompt,
      imageUrls: tab === 'image' ? imageUrls.filter(Boolean) : undefined,
      tab,
      modelId: selectedModel.id,
      aspectRatio,
      resolution,
      toolOption: tool ? toolOption || tool.optionDefault : undefined,
    });
    requireAuth();
    return false;
  };

  const uploadFiles = async (files: File[], replaceAt?: number) => {
    if (!files.length) return;
    if (!ensureCanUpload()) return;

    const oversized = files.filter((file) => file.size > MAX_IMAGE_FILE_SIZE);
    if (oversized.length > 0) {
      toast.error(m['landing.hero.upload_size_limit']());
    }

    const validFiles = files.filter((file) => file.size <= MAX_IMAGE_FILE_SIZE);
    if (!validFiles.length) return;

    if (typeof replaceAt === 'number') {
      const file = validFiles[0];
      const replaceId = `replace-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const localUrl = URL.createObjectURL(file);
      setUploadingItems((prev) => [
        ...prev,
        { id: replaceId, localUrl, slotIndex: replaceAt },
      ]);
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
        setImageUrls((prev) => {
          const next = [...prev];
          next[replaceAt] = remoteUrl;
          return next;
        });
      } catch (err: any) {
        toast.error(toastUploadError(err?.message));
      } finally {
        URL.revokeObjectURL(localUrl);
        setUploadingItems((prev) =>
          prev.filter((item) => item.id !== replaceId)
        );
      }
      return;
    }

    const availableSlots = Math.max(
      0,
      maxImages - (imageUrls.length + uploadingItems.length)
    );
    const filesToProcess = validFiles.slice(0, availableSlots);
    if (filesToProcess.length < validFiles.length) {
      toast.info(m['landing.hero.upload_limit_reached']({ max: maxImages }));
    }
    if (!filesToProcess.length) return;

    const newUploading: UploadingItem[] = filesToProcess.map((file, index) => ({
      id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      localUrl: URL.createObjectURL(file),
      slotIndex: imageUrls.length + index,
    }));
    setUploadingItems((prev) => [...prev, ...newUploading]);

    try {
      const formData = new FormData();
      filesToProcess.forEach((file) => formData.append('files', file));
      const res = await fetch('/api/storage/upload-media', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      const urls = data?.data?.urls || data?.urls;
      if (!res.ok || data?.code !== 0 || !Array.isArray(urls)) {
        throw new Error(data?.message || m['landing.hero.upload_failed']());
      }
      setImageUrls((prev) => [...prev, ...urls].slice(0, maxImages));
    } catch (err: any) {
      toast.error(toastUploadError(err?.message));
    } finally {
      newUploading.forEach((item) => URL.revokeObjectURL(item.localUrl));
      setUploadingItems((prev) =>
        prev.filter((item) => !newUploading.some((next) => next.id === item.id))
      );
    }
  };

  uploadFilesRef.current = uploadFiles;

  const applyReference = (image: string, nextPrompt: string) => {
    if (isTextOnly) {
      setPrompt(nextPrompt);
      document.getElementById('prompt-input')?.focus();
      return;
    }
    setTab('image');
    const imageModels = getLandingGeneratorModels('image');
    setSelectedModel(
      imageModels.find((item) => item.id === 'nano-banana-pro') ||
        imageModels[0]
    );
    setPrompt(nextPrompt);
    document.getElementById('prompt-input')?.focus();
    void (async () => {
      if (!session?.user) {
        saveGeneratorDraft({
          prompt: nextPrompt,
          image,
          imageUrls: [image],
          tab: 'image',
        });
        requireAuth();
        return;
      }
      setImageUrls([image]);
      try {
        const res = await fetch(image);
        const blob = await res.blob();
        const file = new File([blob], `reference-${Date.now()}.webp`, {
          type: blob.type || 'image/webp',
        });
        await uploadFilesRef.current([file], 0);
      } catch {
        toast.error(toastUploadError());
        setImageUrls([]);
      }
    })();
  };
  applyReferenceRef.current = applyReference;

  const draftRestoredRef = useRef(false);
  const submitGenerateRef = useRef<
    (overrides?: {
      prompt?: string;
      tab?: 'text' | 'image';
      imageUrls?: string[];
      modelId?: string;
      aspectRatio?: string;
      resolution?: string;
    }) => Promise<void>
  >(async () => {});

  const applyDraftToForm = (draft: {
    prompt?: string;
    image?: string;
    imageUrls?: string[];
    tab?: 'text' | 'image';
    modelId?: string;
    aspectRatio?: string;
    resolution?: string;
    toolOption?: string;
  }) => {
    const nextTab =
      draft.tab === 'image' && !isTextOnly
        ? 'image'
        : draft.tab === 'text' && !isImageOnly
          ? 'text'
          : isImageOnly
            ? 'image'
            : tab;
    if (nextTab !== tab && mode === 'default') {
      setTab(nextTab);
    }
    if (draft.prompt) setPrompt(draft.prompt);
    if (
      tool &&
      draft.toolOption &&
      tool.optionValues.includes(draft.toolOption)
    ) {
      setToolOption(draft.toolOption);
    }
    const draftModels = tool
      ? availableModels
      : getLandingGeneratorModels(
          nextTab === 'image' || isImageOnly ? 'image' : 'text'
        );
    let draftModelId = selectedModel.id;
    if (draft.modelId) {
      const model = draftModels.find((item) => item.id === draft.modelId);
      if (model) {
        setSelectedModel(model);
        draftModelId = model.id;
      } else if (nextTab === 'image' || isImageOnly) {
        const fallback =
          draftModels.find((item) => item.id === 'nano-banana-pro') ||
          draftModels[0];
        setSelectedModel(fallback);
        draftModelId = fallback.id;
      }
    } else if (nextTab === 'image' || isImageOnly) {
      const fallback =
        draftModels.find((item) => item.id === 'nano-banana-pro') ||
        draftModels[0];
      setSelectedModel(fallback);
      draftModelId = fallback.id;
    }
    const draftAspects = getModelSupportedAspectRatios(draftModelId);
    const draftResolutions = getModelResolutionOptions(draftModelId);
    if (draft.aspectRatio && draftAspects.includes(draft.aspectRatio)) {
      setAspectRatio(draft.aspectRatio);
    }
    if (
      draft.resolution &&
      draftResolutions.some((item) => item.value === draft.resolution)
    ) {
      setResolution(draft.resolution);
    }
    const refs =
      draft.imageUrls?.filter(Boolean) || (draft.image ? [draft.image] : []);
    if (refs.length > 0 && !isTextOnly) {
      if (mode === 'default') setTab('image');
      setImageUrls(refs);
    }
  };

  useEffect(() => {
    if (!mounted || sessionPending || draftRestoredRef.current) return;
    const draft = readGeneratorDraft();
    if (!draft) {
      draftRestoredRef.current = true;
      return;
    }

    const hasContent =
      Boolean(draft.prompt) ||
      Boolean(draft.image) ||
      Boolean(draft.imageUrls?.length);
    if (!hasContent) {
      clearGeneratorDraft();
      draftRestoredRef.current = true;
      return;
    }

    applyDraftToForm(draft);

    // 登录后自动生成：对齐 pixany generationRequested
    if (draft.generationRequested) {
      if (!session?.user) {
        // 保留草稿，等登录回来再清
        draftRestoredRef.current = true;
        return;
      }
      clearGeneratorDraft();
      draftRestoredRef.current = true;
      const refs =
        draft.imageUrls?.filter(Boolean) || (draft.image ? [draft.image] : []);
      setTimeout(() => {
        void submitGenerateRef.current({
          prompt: draft.prompt,
          tab: draft.tab,
          imageUrls: refs,
          modelId: draft.modelId,
          aspectRatio: draft.aspectRatio,
          resolution: draft.resolution,
        });
      }, 0);
      return;
    }

    // 普通回填（如 /prompts）：用完即清
    clearGeneratorDraft();
    draftRestoredRef.current = true;
    if (draft.image && !isTextOnly && session?.user) {
      applyReference(draft.image, draft.prompt || '');
    } else {
      document.getElementById('prompt-input')?.focus();
    }
    // Restore pending generator draft once after auth is ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, sessionPending, session?.user?.id]);

  const handleTabChange = (newTab: 'text' | 'image') => {
    if (mode !== 'default') return;
    setTab(newTab);
    const nextModels = getLandingGeneratorModels(newTab);
    setSelectedModel(
      newTab === 'image'
        ? nextModels.find((m) => m.id === 'nano-banana-pro') || nextModels[0]
        : nextModels[0]
    );
  };

  const focusPrompt = (nextPrompt: string) => {
    setPrompt(nextPrompt);
    const textarea = document.getElementById('prompt-input');
    if (textarea) {
      textarea.focus();
      textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleEditExampleClick = async (example: EditExampleItem) => {
    if (!ensureCanUpload()) return;
    setTab('image');
    const imageModels = getLandingGeneratorModels('image');
    if (!imageModels.some((item) => item.id === selectedModel.id)) {
      setSelectedModel(
        imageModels.find((item) => item.id === 'nano-banana-pro') ||
          imageModels[0]
      );
    }
    focusPrompt(example.prompt);
    setImageUrls([example.sourceImage]);
    try {
      const res = await fetch(example.sourceImage);
      const blob = await res.blob();
      if (blob.size > MAX_IMAGE_FILE_SIZE) {
        toast.error(m['landing.hero.upload_size_limit']());
        setImageUrls([]);
        return;
      }
      const file = new File([blob], `edit-example-${example.id}.webp`, {
        type: blob.type || 'image/webp',
      });
      await uploadFiles([file], 0);
    } catch {
      toast.error(m['landing.hero.upload_failed']());
      setImageUrls([]);
    }
  };

  const applyToolShowcase = (item: ToolShowcaseItem) => {
    if (!tool) return;
    setPrompt(item.prompt);
    if (tool.slug === 'transform-style') {
      const lower = item.prompt.toLowerCase();
      if (lower.includes('3d')) setToolOption('3d');
      else if (lower.includes('watercolor') || item.prompt.includes('水彩'))
        setToolOption('watercolor');
      else if (lower.includes('anime') || item.prompt.includes('动漫'))
        setToolOption('anime');
      else setToolOption('illustration');
    }
    if (tool.slug === 'image-upscaler') {
      setToolOption('4');
    }
    if (tool.slug === 'image-expand') {
      setToolOption('16:9');
    }
    document
      .getElementById('generator')
      ?.scrollIntoView({ behavior: 'smooth' });
    document.getElementById('prompt-input')?.focus();

    if (lastShowcaseIdRef.current === item.id && imageUrls.length > 0) {
      return;
    }
    lastShowcaseIdRef.current = item.id;

    void (async () => {
      if (!session?.user) {
        saveGeneratorDraft({
          prompt: item.prompt,
          image: item.before,
          imageUrls: [item.before],
          tab: 'image',
          modelId: selectedModel.id,
          aspectRatio: tool.optionKind === 'aspect_ratio' ? toolOption : 'auto',
          toolOption: toolOption || tool.optionDefault || undefined,
        });
        setImageUrls([item.before]);
        requireAuth();
        return;
      }
      try {
        const res = await fetch(item.before);
        const blob = await res.blob();
        if (blob.size > MAX_IMAGE_FILE_SIZE) {
          toast.error(m['landing.hero.upload_size_limit']());
          lastShowcaseIdRef.current = null;
          return;
        }
        const file = new File([blob], `tool-ref-${Date.now()}.webp`, {
          type: blob.type || 'image/webp',
        });
        await uploadFilesRef.current([file], 0);
      } catch {
        lastShowcaseIdRef.current = null;
        toast.error(toastUploadError());
      }
    })();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (isToolMode) lastShowcaseIdRef.current = null;
    void uploadFiles(files);
    e.target.value = '';
  };

  const handleReplaceFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && replaceIndex !== null) {
      if (isToolMode) lastShowcaseIdRef.current = null;
      void uploadFiles([file], replaceIndex);
    }
    setReplaceIndex(null);
    e.target.value = '';
  };

  const submitGenerate = async (overrides?: {
    prompt?: string;
    tab?: 'text' | 'image';
    imageUrls?: string[];
    modelId?: string;
    aspectRatio?: string;
    resolution?: string;
  }) => {
    const activeTab = overrides?.tab ?? tab;
    const rawPrompt = (overrides?.prompt ?? prompt).trim();
    let activePrompt = rawPrompt;
    const activeImages = overrides?.imageUrls ?? imageUrls;
    let activeModelId = overrides?.modelId ?? selectedModel.id;
    if (tool && !availableModels.some((model) => model.id === activeModelId)) {
      activeModelId = availableModels[0]?.id ?? selectedModel.id;
    }

    const toolParams = tool
      ? buildToolSubmitParams({
          tool,
          optionValue: toolOption || tool.optionDefault || '',
          modelId: activeModelId,
        })
      : null;
    const activeAspect = toolParams
      ? toolParams.aspectRatio
      : (overrides?.aspectRatio ?? aspectRatio);
    const activeResolution = toolParams
      ? toolParams.resolution
      : (overrides?.resolution ?? resolution);

    if (tool) {
      const ensureKey = getToolEnsureMessageKey(tool.slug, toolOption);
      let ensurePhrase = tDynamic(ensureKey, '');
      if (!ensurePhrase || ensurePhrase === ensureKey) {
        ensurePhrase = getToolEnsureFallback(tool.slug, toolOption);
      }
      if (tool.slug === 'image-expand' && toolOption) {
        ensurePhrase = ensurePhrase.replace(/\{ratio\}/g, toolOption);
      }
      activePrompt = enrichToolPrompt(
        {
          slug: tool.slug,
          prompt: rawPrompt,
          optionValue: toolOption || tool.optionDefault || undefined,
        },
        ensurePhrase
      ).trim();
    }

    setModelDropdownOpen(false);
    setSettingsPopoverOpen(false);

    if (isGenerating) return;
    if (isUploading) {
      toast.info(m['landing.hero.image_uploading_wait']());
      return;
    }

    const validImages =
      unifiedInput || activeTab === 'image'
        ? activeImages.filter((url) => isUsableImageUrl(url))
        : [];
    if (!unifiedInput && activeTab === 'image' && validImages.length === 0) {
      toast.error(m['landing.hero.alert_upload_first']());
      return;
    }
    // 工具页允许仅上传图片：ensure phrase 会补齐任务指令
    if (!activePrompt) {
      toast.error(m['landing.hero.alert_enter_text_prompt']());
      return;
    }
    // 工具页会自行拼接指令；只拦截用户直接输入、过短的中文提示词
    if (!tool && isCjkPromptTooShort(activePrompt)) {
      toast.error(
        m['landing.hero.prompt_too_short']({ min: MIN_CJK_PROMPT_LENGTH })
      );
      return;
    }

    const draftTab = unifiedInput
      ? validImages.length > 0
        ? 'image'
        : 'text'
      : activeTab;

    if (!session?.user) {
      saveGeneratorDraft({
        prompt: rawPrompt,
        imageUrls: validImages.length > 0 ? validImages : undefined,
        image: validImages[0],
        tab: draftTab,
        modelId: activeModelId,
        aspectRatio: activeAspect,
        resolution: activeResolution,
        toolOption: tool ? toolOption || tool.optionDefault : undefined,
        generationRequested: true,
      });
      requireAuth();
      return;
    }

    const effectiveMode =
      validImages.length > 0 ? 'image-to-image' : 'text-to-image';
    const creationMode = tool?.slug ?? effectiveMode;
    const options: Record<string, unknown> = {
      ...(toolParams?.options || {}),
    };
    if (activeAspect !== 'auto') {
      options.aspect_ratio = activeAspect;
    } else if (activeModelId === 'flux-2' && validImages.length > 0) {
      // FLUX i2i: pass auto so providers follow reference aspect
      options.aspect_ratio = 'auto';
    }
    if (activeResolution !== 'auto') options.resolution = activeResolution;

    setHasTriggeredGenerate(true);
    setIsGenerating(true);
    setGeneratedResult(null);

    try {
      const res = await apiPost<any>('/api/ai/generate', {
        mediaType: 'image',
        mode: creationMode,
        prompt: activePrompt,
        model: activeModelId,
        ...(validImages.length > 0 ? { imageUrls: validImages } : {}),
        ...(Object.keys(options).length > 0 ? { options } : {}),
      });

      const targetId =
        res?.taskId || res?.id || res?.dbId || String(Date.now());
      const dbId = res?.dbId || res?.id;

      if (
        res?.taskInfo?.userErrorCode ||
        res?.taskStatus === 'failed' ||
        res?.taskStatus === 'canceled'
      ) {
        saveLocalCreation({
          id: targetId,
          dbId,
          mediaType: 'image',
          mode: creationMode,
          pageKey,
          prompt: activePrompt,
          model: activeModelId,
          url: '',
          status: 'failed',
          errorCode: res?.taskInfo?.userErrorCode,
          aspectRatio: activeAspect,
          resolution: activeResolution,
        });
        toast.error(
          formatLocalizedErrorMessage(
            res?.taskInfo?.userErrorCode || 'generation_failed'
          )
        );
        setActiveTaskId(null);
        scrollToRecentCreations();
        return;
      }

      if (!res?.taskId && !res?.id && !res?.dbId) {
        toast.error(m['landing.hero.generation_failed']());
        return;
      }

      const immediateUrl = extractMediaUrl(res);
      if (res?.taskStatus === 'success' && immediateUrl) {
        saveLocalCreation({
          id: targetId,
          dbId,
          mediaType: 'image',
          mode: creationMode,
          pageKey,
          prompt: activePrompt,
          model: activeModelId,
          url: immediateUrl,
          status: 'success',
          aspectRatio: activeAspect,
          resolution: activeResolution,
        });
        setGeneratedResult(immediateUrl);
        setActiveTaskId(null);
        notifyCreationCompleted(targetId);
        scrollToRecentCreations();
        return;
      }

      setActiveTaskId(targetId);
      activeTaskIdRef.current = targetId;
      saveLocalCreation({
        id: targetId,
        dbId,
        mediaType: 'image',
        mode: creationMode,
        pageKey,
        prompt: activePrompt,
        model: activeModelId,
        url: '',
        status: 'processing',
        aspectRatio: activeAspect,
        resolution: activeResolution,
      });
      toast.success(m['stp.common.task_submitted_image']());
      pollPendingCreationTasks('image');
      scrollToRecentCreations();
    } catch (err: any) {
      activeTaskIdRef.current = null;
      setActiveTaskId(null);
      const message =
        err instanceof ApiError ? err.message : err?.message || '';
      toast.error(formatLocalizedErrorMessage(message));
    } finally {
      // 提交结束即解锁按钮；进行中任务由「近期创作」卡片展示
      setIsGenerating(false);
    }
  };
  submitGenerateRef.current = submitGenerate;

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    await submitGenerate();
  };

  const autoLabel = m['landing.generator.resolution.auto']();
  const resLabel = resolution === 'auto' ? autoLabel : resolution.toUpperCase();
  const ratioLabel = aspectRatio === 'auto' ? autoLabel : aspectRatio;
  const triggerLabel = `${resLabel} · ${ratioLabel}`;
  const toolOptionOptions =
    tool?.optionKind && tool.optionValues.length > 0
      ? tool.optionValues.map((value) => ({
          value,
          label: toolOptionLabel(tool.optionKind, value),
        }))
      : [];

  return (
    <section
      id="generator"
      className="relative scroll-mt-20 px-4 pt-12 pb-16 sm:pt-16"
    >
      <div className="mx-auto w-full max-w-3xl lg:max-w-4xl">
        {/* 不用 isolate：否则子级 z-index 无法越过 sticky 顶栏；背景靠 DOM 顺序压在内容下 */}
        <div className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 bottom-[-2rem] left-1/2 w-screen -translate-x-1/2 overflow-hidden opacity-90"
            style={{
              backgroundImage:
                'radial-gradient(circle, color-mix(in oklab, var(--primary) 18%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--primary) 6%, var(--background)) 0%, color-mix(in oklab, var(--primary) 1.5%, var(--background)) 62%, var(--background) 100%)',
              backgroundSize: '24px 24px, 100% 100%',
            }}
          />

          <div className="relative text-center">
            <h1 className="text-foreground font-serif text-3xl font-normal tracking-[-0.01em] sm:text-4xl lg:text-5xl">
              {title ||
                (isTextOnly
                  ? m['landing.t2i.hero_headline']()
                  : isImageOnly
                    ? m['landing.i2i.hero_headline']()
                    : m['landing.hero.headline']())}
            </h1>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-sm leading-relaxed sm:text-base">
              {subtitle ||
                (isTextOnly
                  ? m['landing.t2i.hero_subheadline']()
                  : isImageOnly
                    ? m['landing.i2i.hero_subheadline']()
                    : m['landing.hero.subheadline']())}
            </p>

            <div className="mt-10">
              <div className="mx-auto w-full max-w-3xl text-left lg:max-w-5xl xl:max-w-6xl">
                {showTabs && (
                  <div className="border-border bg-muted/50 flex items-center gap-1 rounded-t-3xl border border-b-0 px-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleTabChange('text')}
                      aria-pressed={tab === 'text'}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-medium transition-colors ${
                        tab === 'text'
                          ? 'bg-card text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Type className="size-3.5" />
                      {m['landing.hero.tab_text']()}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTabChange('image')}
                      aria-pressed={tab === 'image'}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-medium transition-colors ${
                        tab === 'image'
                          ? 'bg-card text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <ImagePlus className="size-3.5" />
                      {m['landing.hero.tab_image']()}
                    </button>
                  </div>
                )}

                <form
                  onSubmit={handleGenerate}
                  className={`border-border bg-card relative overflow-visible border shadow-sm transition-[border-color,box-shadow,background-color] focus-within:shadow-md ${
                    showTabs ? 'rounded-b-3xl border-t-0' : 'rounded-3xl'
                  }`}
                >
                  <textarea
                    id="prompt-input"
                    rows={3}
                    maxLength={2000}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={
                      tool
                        ? tDynamic(
                            `landing.tools.pages.${tool.slug}.prompt_placeholder`
                          )
                        : unifiedInput || tab === 'image'
                          ? m['landing.hero.placeholder_image']()
                          : m['landing.hero.placeholder_text']()
                    }
                    className="text-foreground placeholder:text-muted-foreground min-h-[96px] w-full resize-none rounded-3xl bg-transparent px-4 pt-4 pb-2 text-sm leading-relaxed focus:outline-none"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-3">
                    <div className="flex min-w-0 items-center gap-2">
                      {(unifiedInput || tab === 'image') && (
                        <ReferenceImageStrip
                          imageUrls={imageUrls}
                          uploadingItems={uploadingItems}
                          maxImages={maxImages}
                          isUploading={isUploading}
                          onUploadClick={() => {
                            if (!ensureCanUpload()) return;
                            fileInputRef.current?.click();
                          }}
                          onReplaceClick={(index) => {
                            if (!ensureCanUpload()) return;
                            setReplaceIndex(index);
                            replaceInputRef.current?.click();
                          }}
                          onRemove={(index) => {
                            if (isToolMode) lastShowcaseIdRef.current = null;
                            setImageUrls((prev) =>
                              prev.filter((_, i) => i !== index)
                            );
                          }}
                          fileInput={
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              multiple={maxImages > 1}
                              onChange={handleFileChange}
                              className="hidden"
                            />
                          }
                          replaceInput={
                            <input
                              ref={replaceInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleReplaceFileChange}
                              className="hidden"
                            />
                          }
                        />
                      )}
                    </div>

                    <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2">
                      <div className="relative" ref={modelDropdownRef}>
                        {unifiedInput ? (
                          <div
                            aria-label={selectedModel.name}
                            className="bg-muted/70 text-foreground inline-flex h-9 max-w-[min(100%,11rem)] items-center gap-1.5 rounded-md px-3 text-xs font-medium sm:max-w-none"
                          >
                            <ModelGlyph model={selectedModel} />
                            <span className="max-w-[7.5rem] truncate sm:max-w-[120px]">
                              {selectedModel.name}
                            </span>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setModelDropdownOpen(!modelDropdownOpen);
                                setSettingsPopoverOpen(false);
                              }}
                              className="bg-muted/70 text-foreground hover:bg-muted inline-flex h-9 max-w-[min(100%,11rem)] cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors sm:max-w-none"
                            >
                              <ModelGlyph model={selectedModel} />
                              <span className="max-w-[7.5rem] truncate sm:max-w-[120px]">
                                {selectedModel.name}
                              </span>
                              <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
                            </button>

                            {modelDropdownOpen && (
                              <div className="border-border bg-popover animate-in fade-in zoom-in-95 absolute right-0 bottom-full z-[80] mb-1 w-[min(18rem,calc(100vw-2rem))] rounded-xl border p-1.5 shadow-xl backdrop-blur-lg duration-150">
                                <div className="text-muted-foreground px-2 py-1 text-[10px] font-semibold tracking-wider uppercase">
                                  {m['landing.hero.select_model']()}
                                </div>
                                {availableModels.map((modelItem) => {
                                  const isSelected =
                                    selectedModel.id === modelItem.id;
                                  return (
                                    <button
                                      key={modelItem.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedModel(modelItem);
                                        setModelDropdownOpen(false);
                                      }}
                                      className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-xs transition-colors ${
                                        isSelected
                                          ? 'bg-accent text-accent-foreground font-medium'
                                          : 'text-popover-foreground hover:bg-muted'
                                      }`}
                                    >
                                      <div className="flex min-w-0 flex-1 items-center gap-2">
                                        <ModelGlyph model={modelItem} />
                                        <span className="truncate whitespace-nowrap">
                                          {modelItem.name}
                                        </span>
                                      </div>
                                      <span className="text-muted-foreground shrink-0 text-[10px] whitespace-nowrap">
                                        {m['config.ai_models.credits_label']({
                                          credits: getImageModelCredits(
                                            modelItem.id,
                                            resolution === 'auto'
                                              ? undefined
                                              : resolution
                                          ),
                                        })}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {isToolMode ? (
                        toolOptionOptions.length > 0 && (
                          <ToolOptionSelect
                            label={tDynamic(
                              `landing.tools.options.${tool!.optionKind}.label`
                            )}
                            value={toolOption}
                            options={toolOptionOptions}
                            onChange={setToolOption}
                          />
                        )
                      ) : (
                        <div className="relative" ref={settingsPopoverRef}>
                          <button
                            type="button"
                            onClick={() => {
                              setSettingsPopoverOpen(!settingsPopoverOpen);
                              setModelDropdownOpen(false);
                            }}
                            className="bg-muted/70 text-foreground hover:bg-muted focus-visible:ring-ring inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                          >
                            <span className="truncate tabular-nums">
                              {triggerLabel}
                            </span>
                            <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
                          </button>

                          {settingsPopoverOpen && (
                            <div className="border-border bg-popover animate-in fade-in zoom-in-95 absolute right-0 bottom-full z-[80] mb-1 w-[min(300px,calc(100vw-2rem))] rounded-xl border p-3 text-left shadow-xl backdrop-blur-lg duration-150">
                              <p className="text-foreground mb-2 text-xs font-medium">
                                {m['landing.hero.resolution']()}
                              </p>
                              <div className="bg-muted flex rounded-md p-0.5">
                                {availableResolutions.map((res) => {
                                  const isSelected = resolution === res.value;
                                  return (
                                    <button
                                      key={res.value}
                                      type="button"
                                      onClick={() => setResolution(res.value)}
                                      className={`flex-1 cursor-pointer rounded-[5px] py-1.5 text-xs transition-colors ${
                                        isSelected
                                          ? 'bg-background text-foreground font-medium shadow-sm'
                                          : 'text-muted-foreground hover:text-foreground'
                                      }`}
                                    >
                                      {res.value === 'auto'
                                        ? autoLabel
                                        : res.value.toUpperCase()}
                                    </button>
                                  );
                                })}
                              </div>

                              <p className="text-foreground mt-4 mb-2 text-xs font-medium">
                                {m['landing.hero.aspect_ratio']()}
                              </p>
                              <div className="grid grid-cols-4 gap-1.5">
                                {availableAspectRatios.map((r) => {
                                  const isSelected = aspectRatio === r;
                                  return (
                                    <button
                                      key={r}
                                      type="button"
                                      onClick={() => setAspectRatio(r)}
                                      className={`flex h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border text-[11px] transition-colors ${
                                        isSelected
                                          ? 'border-primary/40 bg-primary/10 text-primary font-medium'
                                          : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                                      }`}
                                    >
                                      {r === 'auto' ? (
                                        <span className="text-xs">
                                          {autoLabel}
                                        </span>
                                      ) : (
                                        <>
                                          <span
                                            aria-hidden="true"
                                            className="flex h-[18px] items-center justify-center"
                                          >
                                            <RatioIcon ratio={r} />
                                          </span>
                                          <span className="h-4 leading-4 tabular-nums">
                                            {r}
                                          </span>
                                        </>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={
                          isGenerating ||
                          isUploading ||
                          (isToolMode && imageUrls.length === 0)
                        }
                        aria-label={m['landing.hero.generate']()}
                        title={m['landing.hero.generate']()}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full shadow transition-all active:translate-y-px disabled:pointer-events-none disabled:opacity-40"
                      >
                        {isGenerating ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <ArrowUp className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </form>

                {showRecentCreations ? (
                  <WorkspaceRecentCreations
                    filterMediaType="image"
                    filterMode={recentFilterMode}
                    filterModel={recentFilterModel}
                    isGenerating={isGenerating}
                    generatingPrompt={prompt}
                    limit={8}
                  />
                ) : unifiedInput ? null : isToolMode && tool ? (
                  <div className="mt-6">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-muted-foreground text-sm font-medium">
                        {m['landing.tools.generator.examples']()}
                      </p>
                    </div>
                    <ToolExampleCards
                      slug={tool.slug}
                      items={toolShowcaseItems}
                      onSelect={applyToolShowcase}
                    />
                  </div>
                ) : (
                  <div className="mt-6">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-muted-foreground text-sm font-medium">
                        {tab === 'text'
                          ? m['landing.hero.quick_start']()
                          : m['landing.hero.edit_examples']()}
                      </p>
                    </div>

                    {tab === 'text' ? (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {(quickStartItems ?? QUICK_PROMPTS).map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => focusPrompt(item.prompt)}
                            title={item.prompt}
                            className="group cursor-pointer text-left focus:outline-none"
                          >
                            <span className="border-border bg-muted group-hover:border-primary/40 block aspect-square w-full overflow-hidden rounded-md border transition-all group-hover:shadow-md">
                              <img
                                src={item.image}
                                alt={tDynamic(
                                  `${quickStartMessageNs}.${item.id}.title`
                                )}
                                width={1024}
                                height={1024}
                                className="size-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                              />
                            </span>
                            <span className="text-muted-foreground group-hover:text-foreground mt-2 block truncate text-sm transition-colors">
                              {tDynamic(
                                `${quickStartMessageNs}.${item.id}.title`
                              )}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {(quickStartItems ?? EDIT_EXAMPLES).map((item) => {
                          const titleNs = quickStartItems
                            ? quickStartMessageNs
                            : 'landing.edit_examples';
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                if (quickStartItems) {
                                  const qs = item as FeatureQuickStartItem;
                                  void handleEditExampleClick({
                                    id: qs.id,
                                    prompt: qs.prompt,
                                    image: qs.image,
                                    sourceImage: qs.sourceImage ?? qs.image,
                                  });
                                } else {
                                  void handleEditExampleClick(
                                    item as EditExampleItem
                                  );
                                }
                              }}
                              title={item.prompt}
                              className="group cursor-pointer text-left focus:outline-none"
                            >
                              <span className="border-border bg-muted group-hover:border-primary/40 block aspect-square w-full overflow-hidden rounded-md border transition-all group-hover:shadow-md">
                                <img
                                  src={item.image}
                                  alt={tDynamic(`${titleNs}.${item.id}.title`)}
                                  width={800}
                                  height={800}
                                  className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                />
                              </span>
                              <span className="text-muted-foreground group-hover:text-foreground mt-2 block truncate text-sm transition-colors">
                                {tDynamic(`${titleNs}.${item.id}.title`)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <QuickAuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        callbackUrl={currentPathWithQuery()}
      />
    </section>
  );
}

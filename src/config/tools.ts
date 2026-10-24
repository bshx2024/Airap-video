/**
 * Tool detail pages (structural data only).
 * Display copy lives in messages under landing.tools.pages.*.
 */

import {
  DEFAULT_ASPECT_RATIOS,
  GENERATOR_IMAGE_MODELS,
  type ImageModelConfig,
} from '@/config/ai-models';

export const TOOL_MODEL_ID = 'nano-banana-pro';

/** Aspect ratios offered by image-expand (generator-supported, no `auto`). */
export const TOOL_EXPAND_ASPECT_RATIOS = DEFAULT_ASPECT_RATIOS.filter(
  (ratio) => ratio !== 'auto'
) as Exclude<(typeof DEFAULT_ASPECT_RATIOS)[number], 'auto'>[];

export type ToolOptionKind = 'scale' | 'aspect_ratio' | 'style';

export type ToolShowcaseItem = {
  id: string;
  prompt: string;
  before: string;
  after: string;
};

export type ToolPageConfig = {
  slug: string;
  optionKind: ToolOptionKind | null;
  optionDefault: string;
  optionValues: string[];
  showcaseIds: string[];
  stepKeys: string[];
  faqKeys: string[];
};

export const TOOL_SHOWCASE_ITEMS: Record<string, ToolShowcaseItem> = {
  'background-shoe': {
    id: 'background-shoe',
    prompt:
      '彻底移除背景，把橙色运动鞋输出为边缘干净的透明 PNG。保留商品轮廓、鞋带、材质、颜色和原始分辨率。',
    before: '/imgs/tools/background-shoe-before.webp',
    after: '/imgs/tools/background-shoe-after.webp',
  },
  'background-lamp': {
    id: 'background-lamp',
    prompt:
      '移除台灯照片的背景，并输出边缘干净的透明 PNG。保留灯罩、支架、细小边缘、颜色和完整商品。',
    before: '/imgs/tools/background-lamp-before.webp',
    after: '/imgs/tools/background-lamp-after.webp',
  },
  'upscale-butterfly': {
    id: 'upscale-butterfly',
    prompt:
      '将这张蝴蝶照片放大 4×，同时保留自然的翅膀细节、纤细触角、叶片纹理、颜色和清晰度，避免光晕与过度平滑。',
    before: '/imgs/tools/upscale-butterfly-before.webp',
    after: '/imgs/tools/upscale-butterfly-after.webp',
  },
  'upscale-vintage': {
    id: 'upscale-vintage',
    prompt:
      '将这张复古人像修复并放大 4×。恢复面部细节、织物纹理和明暗层次，同时保留原始表情与胶片质感。',
    before: '/imgs/tools/upscale-vintage-before.webp',
    after: '/imgs/tools/upscale-vintage-after.webp',
  },
  'expand-cabin': {
    id: 'expand-cabin',
    prompt:
      '把山谷场景自然扩展为 16:9 构图。保持红色小屋、湖面、山脉、光线、透视和摄影风格不变。',
    before: '/imgs/tools/expand-cabin-before.webp',
    after: '/imgs/tools/expand-cabin-after.webp',
  },
  'expand-product': {
    id: 'expand-product',
    prompt:
      '把这张方形商品图扩展为 16:9 活动构图。保留琥珀色瓶子、拱门、光线、阴影、台面和温暖极简的编辑风格。',
    before: '/imgs/tools/expand-product-before.webp',
    after: '/imgs/tools/expand-product-after.webp',
  },
  'style-portrait': {
    id: 'style-portrait',
    prompt:
      '以精致的插画风格重新绘制这张人像，使用克制的造型、细腻纹理和专业配色。保留人物身份特征、姿势、取景和关键颜色。',
    before: '/imgs/tools/style-portrait-before.webp',
    after: '/imgs/tools/style-portrait-after.webp',
  },
  'style-shop': {
    id: 'style-shop',
    prompt:
      '以精致的3D风格重新呈现这家店铺，使用有层次的材质和柔和影棚光。保留建筑、招牌、店面布局和观察角度。',
    before: '/imgs/tools/style-shop-before.webp',
    after: '/imgs/tools/style-shop-after.webp',
  },
};

export const TOOL_PAGES: Record<string, ToolPageConfig> = {
  'background-remover': {
    slug: 'background-remover',
    optionKind: null,
    optionDefault: '',
    optionValues: [],
    showcaseIds: ['background-shoe', 'background-lamp'],
    stepKeys: ['upload', 'detect', 'run'],
    faqKeys: ['format', 'cost', 'hair', 'privacy', 'formats', 'backgrounds'],
  },
  'image-upscaler': {
    slug: 'image-upscaler',
    optionKind: 'scale',
    optionDefault: '4',
    optionValues: ['2', '4'],
    showcaseIds: ['upscale-butterfly', 'upscale-vintage'],
    stepKeys: ['upload', 'scale', 'run'],
    faqKeys: ['how_much', 'cost', 'invent', 'privacy', 'best', 'text'],
  },
  'image-expand': {
    slug: 'image-expand',
    optionKind: 'aspect_ratio',
    optionDefault: '16:9',
    optionValues: [...TOOL_EXPAND_ASPECT_RATIOS],
    showcaseIds: ['expand-cabin', 'expand-product'],
    stepKeys: ['upload', 'ratio', 'run'],
    faqKeys: ['stretch', 'ratios', 'cost', 'privacy', 'outpainting', 'best'],
  },
  'transform-style': {
    slug: 'transform-style',
    optionKind: 'style',
    optionDefault: 'illustration',
    optionValues: ['illustration', 'watercolor', 'anime', '3d'],
    showcaseIds: ['style-portrait', 'style-shop'],
    stepKeys: ['upload', 'style', 'run'],
    faqKeys: ['preserve', 'styles', 'cost', 'privacy', 'vs_filter', 'face'],
  },
};

export function getToolPage(slug: string): ToolPageConfig | undefined {
  return TOOL_PAGES[slug];
}

export function getToolPageSlugs(): string[] {
  return Object.keys(TOOL_PAGES);
}

export function getToolShowcaseItems(slug: string): ToolShowcaseItem[] {
  const page = TOOL_PAGES[slug];
  if (!page) return [];
  return page.showcaseIds.map((id) => TOOL_SHOWCASE_ITEMS[id]).filter(Boolean);
}

export function getOtherToolPages(slug: string): ToolPageConfig[] {
  return Object.values(TOOL_PAGES).filter((page) => page.slug !== slug);
}

/**
 * Whether a generator model can fulfill this tool page's hard contracts.
 * Soft prompt-only skills (upscale / restyle) only need i2i + ≥1 ref image.
 * image-expand requires the model to expose every tool aspect ratio.
 * background-remover hides GPT Image 2 / 2.5: APIMart docs mark transparent
 * background unsupported on that family; page copy requires transparent PNG.
 */
export function modelSupportsToolPage(
  model: ImageModelConfig,
  tool: ToolPageConfig
): boolean {
  if (model.supportsImageToImage !== true) return false;
  if ((model.maxImages ?? 0) < 1) return false;

  if (tool.optionKind === 'aspect_ratio' && tool.optionValues.length > 0) {
    const ratios = model.supportedAspectRatios ?? [...DEFAULT_ASPECT_RATIOS];
    if (!tool.optionValues.every((ratio) => ratios.includes(ratio))) {
      return false;
    }
  }

  if (tool.slug === 'background-remover' && model.id.startsWith('gpt-image-')) {
    return false;
  }

  return true;
}

/** Image models shown in /tools/$slug generator dropdown. */
export function getToolGeneratorModels(
  tool: ToolPageConfig
): ImageModelConfig[] {
  return GENERATOR_IMAGE_MODELS.filter((model) =>
    modelSupportsToolPage(model, tool)
  );
}

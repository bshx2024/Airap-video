import {
  DEFAULT_ASPECT_RATIOS,
  GENERATOR_IMAGE_MODELS,
  getGeneratorModels,
  type ImageModelConfig,
} from '@/config/ai-models';

export interface QuickPrompt {
  id: string;
  prompt: string;
  image: string;
  width: number;
  height: number;
}

export interface EditExampleItem {
  id: string;
  prompt: string;
  image: string;
  sourceImage: string;
}

export interface ToolItem {
  id: string;
  href: string;
  beforeImage: string;
  afterImage: string;
}

export interface ModelItem {
  id: string;
  name: string;
  coverImage: string;
  href: string;
}

export interface ExampleItem {
  id: string;
  prompt: string;
  image: string;
  width: number;
  height: number;
}

export interface FeatureItem {
  id: string;
  icon:
    | 'message-square-text'
    | 'type'
    | 'layers'
    | 'images'
    | 'ratio'
    | 'library';
}

export interface FaqItem {
  id: number;
}

export interface WalkthroughItem {
  id: string;
  image: string;
  reverse?: boolean;
}

export interface GeneratorModel {
  id: string;
  name: string;
  icon: string;
  credits: number;
  supportsImageToImage?: boolean;
  maxImages?: number;
}

export interface NavLinkItem {
  id: string;
  href: string;
  icon: string;
  /** Brand model name when item is a model nav link */
  label?: string;
}

function toGeneratorModel(model: ImageModelConfig): GeneratorModel {
  return {
    id: model.id,
    name: model.name,
    icon: model.icon,
    credits: model.credits,
    supportsImageToImage: model.supportsImageToImage,
    maxImages: model.maxImages ?? 3,
  };
}

export const GENERATOR_MODELS: GeneratorModel[] =
  GENERATOR_IMAGE_MODELS.map(toGeneratorModel);

export function getLandingGeneratorModels(
  mode: 'text' | 'image' = 'text'
): GeneratorModel[] {
  return getGeneratorModels(mode).map(toGeneratorModel);
}

/** Full catalog; prefer `getModelResolutionOptions(modelId)` in the generator UI. */
export const GENERATOR_RESOLUTIONS: {
  value: string;
}[] = [
  { value: 'auto' },
  { value: '1k' },
  { value: '1.5k' },
  { value: '2k' },
  { value: '4k' },
];

/** Full catalog; prefer `getModelSupportedAspectRatios(modelId)` in the generator UI. */
export const GENERATOR_ASPECT_RATIOS = DEFAULT_ASPECT_RATIOS;

export const NAV_FEATURES: NavLinkItem[] = [
  {
    id: 'text-to-image',
    href: '/text-to-image',
    icon: 'type',
  },
  {
    id: 'image-to-image',
    href: '/image-to-image',
    icon: 'image-plus',
  },
  {
    id: 'prompts',
    href: '/prompts',
    icon: 'library',
  },
  {
    id: 'templates',
    href: '/templates',
    icon: 'layout-template',
  },
  {
    id: 'styles',
    href: '/styles',
    icon: 'palette',
  },
];

export const NAV_MODELS: NavLinkItem[] = GENERATOR_IMAGE_MODELS.map(
  (model) => ({
    id: model.id,
    href: `/models/${model.id}`,
    label: model.name,
    icon: model.icon,
  })
);

export const NAV_TOOLS: NavLinkItem[] = [
  {
    id: 'background-remover',
    href: '/tools/background-remover',
    icon: 'eraser',
  },
  {
    id: 'image-upscaler',
    href: '/tools/image-upscaler',
    icon: 'maximize-2',
  },
  {
    id: 'image-expand',
    href: '/tools/image-expand',
    icon: 'expand',
  },
  {
    id: 'transform-style',
    href: '/tools/transform-style',
    icon: 'palette',
  },
];

export const QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: 'studio-portrait',
    prompt:
      'Studio portrait of a woman in a cream knit sweater by a window, soft daylight, shallow depth of field, natural skin texture.',
    image: '/imgs/examples/hero/studio-portrait.webp',
    width: 1024,
    height: 1024,
  },
  {
    id: 'product-still-life',
    prompt:
      'A ceramic coffee cup on a pale stone surface, morning side light, soft shadow, minimal product photography.',
    image: '/imgs/examples/hero/product-still-life.webp',
    width: 1024,
    height: 1024,
  },
  {
    id: 'storybook-scene',
    prompt:
      'A hand-painted watercolour countryside scene with a small cottage, soft pastel palette, storybook illustration, gentle light.',
    image: '/imgs/examples/hero/storybook-scene.webp',
    width: 1024,
    height: 1024,
  },
  {
    id: 'collectible-figurine',
    prompt:
      'A collectible vinyl figurine of a young traveller with a backpack on a neutral grey backdrop, soft studio light, glossy finish.',
    image: '/imgs/examples/hero/collectible-figurine.webp',
    width: 1024,
    height: 1024,
  },
];

export const EDIT_EXAMPLES: EditExampleItem[] = [
  {
    id: 'product-color',
    prompt:
      'Recolor the ivory headphones to rich cobalt blue. Keep their exact shape, materials, position, lighting, backdrop, and natural shadow unchanged.',
    image: '/imgs/examples/edit/product-color-after.webp',
    sourceImage: '/imgs/examples/edit/product-color-before.webp',
  },
  {
    id: 'object-removal',
    prompt:
      'Remove the red bicycle and reconstruct the garden naturally. Keep the bench, plants, path, framing, colors, lighting, and shadows unchanged.',
    image: '/imgs/examples/edit/object-removal-after.webp',
    sourceImage: '/imgs/examples/edit/object-removal-before.webp',
  },
  {
    id: 'day-to-night',
    prompt:
      'Change this cafe scene from sunny late afternoon to blue hour after light rain. Add warm interior glow and subtle pavement reflections while preserving the architecture and composition.',
    image: '/imgs/examples/edit/day-to-night-after.webp',
    sourceImage: '/imgs/examples/edit/day-to-night-before.webp',
  },
  {
    id: 'portrait-illustration',
    prompt:
      "Transform this portrait into a sophisticated hand-painted gouache editorial illustration. Preserve the subject's identity, expression, pose, hairstyle, clothing, and composition.",
    image: '/imgs/examples/edit/portrait-illustration-after.webp',
    sourceImage: '/imgs/examples/edit/portrait-illustration-before.webp',
  },
];

export const AI_TOOLS: ToolItem[] = [
  {
    id: 'background-remover',
    href: '/tools/background-remover',
    beforeImage: '/imgs/tools/background-shoe-before.webp',
    afterImage: '/imgs/tools/background-shoe-after.webp',
  },
  {
    id: 'image-upscaler',
    href: '/tools/image-upscaler',
    beforeImage: '/imgs/tools/upscale-butterfly-before.webp',
    afterImage: '/imgs/tools/upscale-butterfly-after.webp',
  },
  {
    id: 'image-expand',
    href: '/tools/image-expand',
    beforeImage: '/imgs/tools/expand-cabin-before.webp',
    afterImage: '/imgs/tools/expand-cabin-after.webp',
  },
  {
    id: 'transform-style',
    href: '/tools/transform-style',
    beforeImage: '/imgs/tools/style-portrait-before.webp',
    afterImage: '/imgs/tools/style-portrait-after.webp',
  },
];

const MODEL_COVER_IMAGES: Record<string, string> = {
  'flux-2': '/imgs/models/covers/flux-2.webp',
  'gpt-image-2': '/imgs/models/covers/gpt-image-2.webp',
  'gpt-image-2-5-flare': '/imgs/models/covers/gpt-image-2.5-flare.webp',
  'gpt-image-2-5-sunburst': '/imgs/models/covers/gpt-image-2.5-sunburst.webp',
  'nano-banana-2': '/imgs/models/covers/nano-banana-2.webp',
  'nano-banana-pro': '/imgs/models/covers/nano-banana-pro.webp',
  'qwen-image-3-0': '/imgs/models/covers/qwen-image-3.webp',
  'seedream-5-0-pro': '/imgs/models/covers/seedream-5-0-pro.webp',
};

export const AI_MODELS: ModelItem[] = GENERATOR_IMAGE_MODELS.map((model) => ({
  id: model.id,
  name: model.name,
  coverImage:
    MODEL_COVER_IMAGES[model.id] ?? '/imgs/models/covers/gpt-image-2.webp',
  href: `/models/${model.id}`,
}));

export const EXAMPLES: ExampleItem[] = [
  {
    id: 'aperture-comparison',
    prompt:
      'Canon 85mm portrait of a woman during the blue hour after sunset in a city, a four-panel comparison shot at f/1.8, f/2.8, f/10 and f/14, background blur changing across the panels, natural skin tones.',
    image: '/imgs/examples/showcase/aperture-comparison.webp',
    width: 1200,
    height: 655,
  },
  {
    id: 'sale-poster',
    prompt:
      'A modern, playful graphic poster for a Christmas sale — bold typography, vibrant festive colours, clean layout with room for a discount badge.',
    image: '/imgs/examples/showcase/sale-poster.webp',
    width: 896,
    height: 1200,
  },
  {
    id: 'product-still-life',
    prompt:
      'A ceramic coffee cup on a pale stone surface, morning side light, soft shadow, minimal product photography.',
    image: '/imgs/examples/hero/product-still-life.webp',
    width: 600,
    height: 600,
  },
  {
    id: 'collectible-figurine',
    prompt:
      'A collectible vinyl figurine of a young traveller with a backpack on a neutral grey backdrop, soft studio light, glossy finish.',
    image: '/imgs/examples/hero/collectible-figurine.webp',
    width: 600,
    height: 600,
  },
  {
    id: 'macro-detail',
    prompt:
      'Macro photograph of a wristwatch face, brushed metal texture, fine engraving, dramatic reflections, dark background.',
    image: '/imgs/examples/showcase/macro-detail.webp',
    width: 600,
    height: 600,
  },
  {
    id: 'group-photo',
    prompt:
      'Three friends laughing together at an outdoor table, candid group photograph, warm late afternoon light, all faces sharp.',
    image: '/imgs/examples/showcase/group-photo.webp',
    width: 600,
    height: 600,
  },
  {
    id: 'cover-layout',
    prompt:
      'A minimal magazine cover layout: a large headline area at the top, a single centred object below, generous margins, two-colour palette.',
    image: '/imgs/examples/showcase/cover-layout.webp',
    width: 600,
    height: 600,
  },
  {
    id: 'city-courier',
    prompt:
      'A bicycle courier in a cobalt jacket crossing a rain-slick city intersection just after sunset, subject sharply rendered against controlled motion blur, warm storefront reflections, cinematic editorial photography, realistic fabric and street texture.',
    image: '/imgs/models/samples/flux-schnell-city-courier.webp',
    width: 1200,
    height: 800,
  },
  {
    id: 'robot-workshop',
    prompt:
      'Four palm-sized ceramic robots collaborating in a warm tabletop workshop to build three oversized coral and saffron paper flowers, tactile stop-motion craft style, visible paper fibres, glazed ceramic and soft morning studio light.',
    image: '/imgs/models/samples/flux-schnell-robot-workshop.webp',
    width: 800,
    height: 1200,
  },
  {
    id: 'tea-packaging',
    prompt:
      'Premium product photograph of a cream paper tea box and matching cylindrical tin with precise botanical line engraving on a dark walnut table. Labels read "LUMA TEA" and "JASMINE · No. 04", crisp fine detail, forest green ink, brass accents and soft directional studio light.',
    image: '/imgs/models/samples/nano-banana-pro-tea-packaging.webp',
    width: 1200,
    height: 800,
  },
  {
    id: 'workflow-infographic',
    prompt:
      'A clean four-step product design workflow infographic titled "FROM IDEA TO LAUNCH". Four equal blocks connected left to right and labelled "IDEA", "SKETCH", "BUILD", "SHIP", with the footer "A SIMPLE CREATIVE WORKFLOW", polished vector style, precise alignment and generous whitespace.',
    image: '/imgs/models/samples/gpt-image-2-workflow.webp',
    width: 1200,
    height: 800,
  },
  {
    id: 'material-atlas',
    prompt:
      'A premium landscape editorial infographic titled "MATERIAL ATLAS". Arrange four precise material studies in a clean modular grid: translucent glass, brushed metal, folded ivory textile and deep cobalt ceramic. Add the exact labels "GLASS", "METAL", "TEXTILE" and "CERAMIC" beneath the matching samples, generous warm-white margins, subtle measurement marks, refined studio lighting and a sophisticated contemporary design-magazine art direction.',
    image: '/imgs/models/samples/seedream-5-pro-cover.webp',
    width: 1536,
    height: 1024,
  },
  {
    id: 'spectrum-futures',
    prompt:
      'A finished vertical bilingual design festival poster set in a dark gallery, featuring a monumental translucent glass ribbon sculpture refracting cyan, violet, coral and amber light. Render the exact headline "光谱未来 · SPECTRUM FUTURES", supporting lines "SHANGHAI DESIGN WEEK" and "08—14 OCT 2026", and footer "WEST BUND ART CENTER". Cinematic photorealism, refined cultural-poster typography, polished black floor reflections, clear hierarchy and no extra text.',
    image: '/imgs/models/samples/seedream-5-0-pro-spectrum-futures.webp',
    width: 1024,
    height: 1536,
  },
  {
    id: 'three-cities',
    prompt:
      'A polished landscape editorial fashion triptych with exactly three equal vertical panels showing the same fictional East Asian woman with the same short black bob, facial features and cobalt blue trench coat in rainy Shanghai at blue hour, quiet Paris in soft morning light and neon Tokyo at night. Keep her identity and outfit clearly consistent while changing only pose, city, weather and lighting. Render the exact headline "ONE STORY · THREE CITIES" once, perfectly legible, with a clean structured grid, cinematic photography and no other text.',
    image: '/imgs/models/samples/seedream-5-0-pro-three-cities.webp',
    width: 1536,
    height: 1024,
  },
  {
    id: 'dense-infographic',
    prompt:
      'A dense infographic poster explaining how an AI video generator works: labelled diagram blocks, connecting arrows, small captions, legible typography, muted technical colour palette.',
    image: '/imgs/examples/showcase/dense-infographic.webp',
    width: 1200,
    height: 896,
  },
  {
    id: 'study-cards',
    prompt:
      'A set of study cards explaining how Git works: one concept per card, large heading, three bullet points, a simple icon, consistent grid layout.',
    image: '/imgs/examples/showcase/study-cards.webp',
    width: 766,
    height: 863,
  },
  {
    id: 'crowded-scene',
    prompt:
      'A busy night market street with many stalls, lanterns and people, every stall readable, deep detail throughout, cinematic light.',
    image: '/imgs/examples/showcase/crowded-scene.webp',
    width: 600,
    height: 600,
  },
  {
    id: 'packaging-shot',
    prompt:
      'A craft coffee bag on a wooden counter, warm morning light, the brand name printed clearly on the label, shallow depth of field.',
    image: '/imgs/examples/showcase/packaging-shot.webp',
    width: 600,
    height: 600,
  },
  {
    id: 'flow-diagram',
    prompt:
      'A flow diagram of four labelled blocks connected by arrows on an off-white background, muted blue and grey palette, technical illustration.',
    image: '/imgs/examples/showcase/flow-diagram.webp',
    width: 600,
    height: 600,
  },
  {
    id: 'flat-illustration',
    prompt:
      'Flat isometric illustration of a person working at a desk with plants and a laptop, pastel palette, white background.',
    image: '/imgs/examples/showcase/flat-illustration.webp',
    width: 600,
    height: 600,
  },
  {
    id: 'night-market',
    prompt:
      'A refined vertical travel poster for an evening food market, a richly detailed night market with many coherent stalls, lanterns, diners and steam below a clear headline. Render "NIGHT MARKET" and "FRIDAY · 6 PM" exactly once, premium editorial illustration, deep indigo and warm vermilion.',
    image: '/imgs/models/samples/nano-banana-pro-night-market.webp',
    width: 800,
    height: 1200,
  },
  {
    id: 'design-magazine',
    prompt:
      'An architecture magazine cover with exactly one sculptural cobalt chair in a quiet concrete gallery, rigorous Swiss-influenced layout and generous margins. Headline "FORM & FUNCTION", supporting lines "ISSUE 08" and "OBJECTS WITH PURPOSE", warm off-white paper and one vermilion rule.',
    image: '/imgs/models/samples/gpt-image-2-editorial-cover.webp',
    width: 800,
    height: 1200,
  },
  {
    id: 'shanghai-night-market',
    prompt:
      'A sophisticated vertical cultural travel poster for a Shanghai night market, dense but carefully structured composition with red lanterns, steaming food stalls, handwritten menu boards, diners and wet street reflections. Render the exact headline "夜市 · NIGHT MARKET" and the exact footer "SHANGHAI · 19:00". Deep ink blue, lacquer red and warm gold palette, cinematic photorealism with premium editorial typography and clear visual hierarchy.',
    image: '/imgs/models/samples/seedream-5-pro-night-market.webp',
    width: 1024,
    height: 1536,
  },
  {
    id: 'lumen-serum',
    prompt:
      'A premium landscape skincare campaign with exactly three frosted glass serum bottles on pale limestone, translucent plum and warm coral liquids, brushed silver caps, soft directional studio daylight, convincing glass refraction and tactile stone detail. Compose it as a sophisticated advertising layout with generous cream negative space. Render the exact large headline "LUMEN · 光" and the exact small line "DAILY SERUM", perfectly legible, with refined international design-magazine art direction and no extra text.',
    image: '/imgs/models/samples/seedream-5-0-pro-lumen-serum.webp',
    width: 1536,
    height: 1024,
  },
  {
    id: 'tidal-house',
    prompt:
      'A polished landscape architectural presentation board for a compact coastal retreat named "TIDAL HOUSE". Use a rigorous warm-white modular grid with one large photorealistic exterior rendering and three precise supporting panels: a floor plan, a section drawing and a material palette of oak, brushed aluminium, linen and sea stone. Render the exact labels "PLAN", "SECTION", "MATERIALS" and footer "COASTAL RETREAT · 2026". Contemporary Swiss editorial design, convincing materials, generous margins and no extra text.',
    image: '/imgs/models/samples/seedream-5-0-pro-tidal-house.webp',
    width: 1536,
    height: 1024,
  },
];

export const EXAMPLE_LAYOUT = {
  twoCol: [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    [14, 15, 2, 16, 17, 18, 19, 20, 21, 22, 23, 24],
  ],
  threeCol: [
    [0, 15, 16, 4, 18, 7, 20, 11, 12],
    [14, 2, 3, 17, 6, 8, 10, 22, 24],
    [1, 2, 16, 5, 19, 9, 21, 23, 13],
  ],
};

export const FEATURES: FeatureItem[] = [
  { id: 'text-to-image', icon: 'message-square-text' },
  { id: 'readable-text', icon: 'type' },
  { id: 'multiple-models', icon: 'layers' },
  { id: 'four-images', icon: 'images' },
  { id: 'aspect-ratio', icon: 'ratio' },
  { id: 'private-history', icon: 'library' },
];

export const WALKTHROUGH: WalkthroughItem[] = [
  { id: 'models', image: '/imgs/home/models-v2.webp' },
  { id: 'reference', image: '/imgs/home/reference-v2.webp', reverse: true },
  { id: 'library', image: '/imgs/home/library-v2.webp' },
];

export const FAQS: FaqItem[] = [
  { id: 1 },
  { id: 2 },
  { id: 3 },
  { id: 4 },
  { id: 5 },
  { id: 6 },
];

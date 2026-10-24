/**
 * Image templates catalog (structural data only).
 * Display copy lives in messages under landing.templates.*.
 *
 * `ratio` must be a generator-supported aspect ratio
 * (see GENERATOR_ASPECT_RATIOS, excluding `auto`).
 */

import { GENERATOR_ASPECT_RATIOS } from '@/config/landing-data';

export type TemplateMode = 'text_to_image' | 'image_to_image';

export type TemplateAspectRatio = Exclude<
  (typeof GENERATOR_ASPECT_RATIOS)[number],
  'auto'
>;

export type TemplateTypeKey =
  | 'marketing'
  | 'editorial'
  | 'event'
  | 'diagram'
  | 'ecommerce'
  | 'social';

export type TemplateItem = {
  slug: string;
  image: string;
  width: number;
  height: number;
  ratio: TemplateAspectRatio;
  typeKey: TemplateTypeKey;
  category: string;
  tags: string[];
  mode: TemplateMode;
  guide?: string;
  model: string;
  isNew?: boolean;
  prompt: string;
};

export type TemplateFilterId = string;

export const TEMPLATE_CATEGORY_IDS: TemplateFilterId[] = [
  'all',
  'design',
  'social',
  'product',
  'portrait',
  'scenery',
];

export const TEMPLATE_TAG_IDS: TemplateFilterId[] = [
  'all',
  'sale',
  'cover',
  'event',
  'infographic',
  'packaging',
  'cards',
  'illustration',
  'lighting',
  'interior',
  'fashion',
  'seasonal',
  'recolor',
  'rendering',
];

export const TEMPLATE_MODEL_IDS: TemplateFilterId[] = [
  'all',
  'nano-banana-pro',
  'gpt-image-2',
];

export const TEMPLATES_DATA: TemplateItem[] = [
  {
    slug: 'seasonal-sale-poster',
    image: '/imgs/examples/showcase/sale-poster.webp',
    width: 896,
    height: 1200,
    ratio: '3:4',
    typeKey: 'marketing',
    category: 'design',
    tags: ['sale'],
    mode: 'text_to_image',
    guide: 'replace_copy',
    model: 'nano-banana-pro',
    isNew: true,
    prompt:
      'A bold seasonal sale poster in a clean vertical layout. Large headline "WINTER SALE", one clear discount badge reading "40% OFF", a compact supporting line, vibrant festive colours, generous spacing, polished retail campaign design.',
  },
  {
    slug: 'architecture-magazine-cover',
    image: '/imgs/models/samples/gpt-image-2-editorial-cover.webp',
    width: 800,
    height: 1200,
    ratio: '2:3',
    typeKey: 'editorial',
    category: 'design',
    tags: ['cover'],
    mode: 'text_to_image',
    guide: 'replace_copy',
    model: 'gpt-image-2',
    prompt:
      'An architecture magazine cover with one sculptural cobalt chair in a quiet concrete gallery, rigorous editorial grid and generous margins. Headline "FORM & FUNCTION", supporting lines "ISSUE 08" and "OBJECTS WITH PURPOSE", warm off-white paper and one vermilion rule.',
  },
  {
    slug: 'night-market-event-flyer',
    image: '/imgs/models/samples/nano-banana-pro-night-market.webp',
    width: 800,
    height: 1200,
    ratio: '2:3',
    typeKey: 'event',
    category: 'design',
    tags: ['event'],
    mode: 'text_to_image',
    guide: 'replace_copy',
    model: 'nano-banana-pro',
    prompt:
      'A refined vertical event flyer for an evening food market, richly detailed stalls, lanterns, diners and steam below a clear headline. Render "NIGHT MARKET" and "FRIDAY · 6 PM" exactly once, premium travel-poster illustration, deep indigo and warm vermilion.',
  },
  {
    slug: 'creative-workflow-infographic',
    image: '/imgs/models/samples/gpt-image-2-workflow.webp',
    width: 1200,
    height: 800,
    ratio: '3:2',
    typeKey: 'diagram',
    category: 'social',
    tags: ['infographic'],
    mode: 'text_to_image',
    guide: 'replace_copy',
    model: 'gpt-image-2',
    prompt:
      'A clean four-step workflow infographic titled "FROM IDEA TO LAUNCH". Four equal blocks connected left to right and labelled "IDEA", "SKETCH", "BUILD", "SHIP", polished vector style, precise alignment, restrained blue and coral palette, generous whitespace.',
  },
  {
    slug: 'botanical-product-launch',
    image: '/imgs/models/samples/nano-banana-pro-tea-packaging.webp',
    width: 1200,
    height: 800,
    ratio: '3:2',
    typeKey: 'ecommerce',
    category: 'product',
    tags: ['packaging'],
    mode: 'text_to_image',
    guide: 'replace_copy',
    model: 'nano-banana-pro',
    prompt:
      'Premium product launch visual for a cream paper tea box and matching cylindrical tin with botanical line engraving on a dark walnut table. Labels read "LUMA TEA" and "JASMINE · No. 04", forest green ink, brass accents, soft directional studio light and room for campaign copy.',
  },
  {
    slug: 'educational-card-set',
    image: '/imgs/examples/showcase/study-cards.webp',
    width: 766,
    height: 863,
    ratio: '3:4',
    typeKey: 'social',
    category: 'social',
    tags: ['cards'],
    mode: 'text_to_image',
    guide: 'replace_copy',
    model: 'gpt-image-2',
    prompt:
      'A coordinated set of educational social cards explaining how Git works: one concept per card, large heading, three concise bullet points, one simple icon, consistent grid, accessible contrast and a restrained technical colour palette.',
  },
  {
    slug: 'portrait-to-editorial-illustration',
    image: '/imgs/examples/edit/portrait-illustration-after.webp',
    width: 1254,
    height: 1254,
    ratio: '1:1',
    typeKey: 'editorial',
    category: 'portrait',
    tags: ['illustration'],
    mode: 'image_to_image',
    guide: 'upload_portrait',
    model: 'nano-banana-pro',
    isNew: true,
    prompt:
      "Transform this portrait into a sophisticated hand-painted gouache editorial illustration. Preserve the subject's identity, expression, pose, hairstyle, clothing and composition.",
  },
  {
    slug: 'cafe-day-to-night',
    image: '/imgs/examples/edit/day-to-night-after.webp',
    width: 1254,
    height: 1254,
    ratio: '1:1',
    typeKey: 'marketing',
    category: 'scenery',
    tags: ['lighting'],
    mode: 'image_to_image',
    guide: 'upload_scene',
    model: 'nano-banana-pro',
    prompt:
      'Change this cafe scene from sunny late afternoon to blue hour after light rain. Add warm interior glow and subtle pavement reflections while preserving the architecture and composition.',
  },
  {
    slug: 'product-color-variant',
    image: '/imgs/examples/edit/product-color-after.webp',
    width: 1254,
    height: 1254,
    ratio: '1:1',
    typeKey: 'ecommerce',
    category: 'product',
    tags: ['recolor'],
    mode: 'image_to_image',
    guide: 'upload_product',
    model: 'nano-banana-pro',
    prompt:
      'Recolour the product to a deep cobalt blue while preserving its material, highlights, shadows, shape, camera angle, background and realistic studio finish.',
  },
  {
    slug: 'warm-minimal-interior',
    image: '/imgs/features/image-to-image/interior-redesign-after.webp',
    width: 1024,
    height: 1024,
    ratio: '1:1',
    typeKey: 'editorial',
    category: 'scenery',
    tags: ['interior'],
    mode: 'image_to_image',
    guide: 'upload_interior',
    model: 'nano-banana-pro',
    prompt:
      'Redesign this room as a warm minimal interior with pale oak, textured linen, quiet cream walls and soft indirect daylight. Preserve the room structure, viewpoint and window positions.',
  },
  {
    slug: 'editorial-outfit-change',
    image: '/imgs/features/image-to-image/outfit-change-after.webp',
    width: 1024,
    height: 1024,
    ratio: '1:1',
    typeKey: 'editorial',
    category: 'portrait',
    tags: ['fashion'],
    mode: 'image_to_image',
    guide: 'upload_outfit',
    model: 'nano-banana-pro',
    prompt:
      "Replace the subject's outfit with a refined contemporary editorial look in neutral tones. Preserve identity, face, hair, body proportions, pose, lighting and background.",
  },
  {
    slug: 'sketch-to-product-render',
    image: '/imgs/features/image-to-image/sketch-to-render-after.webp',
    width: 1024,
    height: 1024,
    ratio: '1:1',
    typeKey: 'ecommerce',
    category: 'design',
    tags: ['rendering'],
    mode: 'image_to_image',
    guide: 'upload_sketch',
    model: 'nano-banana-pro',
    prompt:
      'Turn this concept sketch into a polished photorealistic product render. Preserve the silhouette, proportions and key design details, then add believable materials, studio light and grounded shadows.',
  },
  {
    slug: 'summer-to-winter-landscape',
    image: '/imgs/features/image-to-image/summer-to-winter-after.webp',
    width: 1024,
    height: 1024,
    ratio: '1:1',
    typeKey: 'marketing',
    category: 'scenery',
    tags: ['seasonal'],
    mode: 'image_to_image',
    guide: 'upload_scene',
    model: 'nano-banana-pro',
    prompt:
      'Transform this summer landscape into a quiet winter scene with fresh snow, bare branches and cool overcast light. Preserve the terrain, architecture, viewpoint and overall composition.',
  },
];

export function getTemplateBySlug(slug: string): TemplateItem | undefined {
  return TEMPLATES_DATA.find((item) => item.slug === slug);
}

export function getRelatedTemplates(
  currentSlug: string,
  limit = 4
): TemplateItem[] {
  const current = getTemplateBySlug(currentSlug);
  if (!current) return [];

  const sameCategory = TEMPLATES_DATA.filter(
    (item) => item.slug !== currentSlug && item.category === current.category
  );

  if (sameCategory.length >= limit) {
    return sameCategory.slice(0, limit);
  }

  const existingSlugs = new Set([
    currentSlug,
    ...sameCategory.map((item) => item.slug),
  ]);
  const others = TEMPLATES_DATA.filter((item) => !existingSlugs.has(item.slug));

  return [...sameCategory, ...others].slice(0, limit);
}

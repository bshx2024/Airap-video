/**
 * Model detail pages (structural data only).
 * Display copy lives in messages under landing.models.pages.*.
 */

import {
  GENERATOR_IMAGE_MODELS,
  getImageModelById,
  IMAGE_MODELS,
} from '@/config/ai-models';
import { GENERATOR_ASPECT_RATIOS } from '@/config/landing-data';

export type ModelPageAspectRatio = Exclude<
  (typeof GENERATOR_ASPECT_RATIOS)[number],
  'auto'
>;

export type ModelShowcaseItem = {
  id: string;
  prompt: string;
  image: string;
  width: number;
  height: number;
  ratio: ModelPageAspectRatio;
};

export type ModelPageConfig = {
  slug: string;
  color: string; // accent hex for overview/guide
  cover: string;
  overviewImage: string;
  /** Ordered showcase item ids from MODEL_SHOWCASE_ITEMS */
  showcaseIds: string[];
  /** Capability keys used as i18n suffix: landing.models.pages.{slug}.capabilities.{key}.* */
  capabilityKeys: string[];
  /** Tip keys: landing.models.pages.{slug}.tips.{key}.* */
  tipKeys: string[];
  /** FAQ keys: landing.models.pages.{slug}.faqs.{key}.* */
  faqKeys: string[];
};

export const MODEL_SHOWCASE_ITEMS: Record<string, ModelShowcaseItem> = {
  'city-courier': {
    id: 'city-courier',
    prompt:
      'A bicycle courier in a cobalt jacket crossing a rain-slick city intersection just after sunset, subject sharply rendered against controlled motion blur, warm storefront reflections, cinematic editorial photography, realistic fabric and street texture.',
    image: '/imgs/models/samples/flux-schnell-city-courier.webp',
    width: 1200,
    height: 800,
    ratio: '3:2',
  },
  'robot-workshop': {
    id: 'robot-workshop',
    prompt:
      'Four palm-sized ceramic robots collaborating in a warm tabletop workshop to build three oversized coral and saffron paper flowers, tactile stop-motion craft style, visible paper fibres, glazed ceramic and soft morning studio light.',
    image: '/imgs/models/samples/flux-schnell-robot-workshop.webp',
    width: 800,
    height: 1200,
    ratio: '2:3',
  },
  'studio-portrait': {
    id: 'studio-portrait',
    prompt:
      'Studio portrait of a woman in a cream knit sweater by a window, soft daylight, shallow depth of field, natural skin texture.',
    image: '/imgs/examples/hero/studio-portrait.webp',
    width: 600,
    height: 600,
    ratio: '1:1',
  },
  'product-still-life': {
    id: 'product-still-life',
    prompt:
      'A ceramic coffee cup on a pale stone surface, morning side light, soft shadow, minimal product photography.',
    image: '/imgs/examples/hero/product-still-life.webp',
    width: 600,
    height: 600,
    ratio: '1:1',
  },
  'storybook-scene': {
    id: 'storybook-scene',
    prompt:
      'A hand-painted watercolour countryside scene with a small cottage, soft pastel palette, storybook illustration, gentle light.',
    image: '/imgs/examples/hero/storybook-scene.webp',
    width: 600,
    height: 600,
    ratio: '1:1',
  },
  'collectible-figurine': {
    id: 'collectible-figurine',
    prompt:
      'A collectible vinyl figurine of a young traveller with a backpack on a neutral grey backdrop, soft studio light, glossy finish.',
    image: '/imgs/examples/hero/collectible-figurine.webp',
    width: 600,
    height: 600,
    ratio: '1:1',
  },
  'night-market': {
    id: 'night-market',
    prompt:
      'A refined vertical travel poster for an evening food market, a richly detailed night market with many coherent stalls, lanterns, diners and steam below a clear headline. Render "NIGHT MARKET" and "FRIDAY · 6 PM" exactly once, premium editorial illustration, deep indigo and warm vermilion.',
    image: '/imgs/models/samples/nano-banana-pro-night-market.webp',
    width: 800,
    height: 1200,
    ratio: '2:3',
  },
  'tea-packaging': {
    id: 'tea-packaging',
    prompt:
      'Premium product photograph of a cream paper tea box and matching cylindrical tin with precise botanical line engraving on a dark walnut table. Labels read "LUMA TEA" and "JASMINE · No. 04", crisp fine detail, forest green ink, brass accents and soft directional studio light.',
    image: '/imgs/models/samples/nano-banana-pro-tea-packaging.webp',
    width: 1200,
    height: 800,
    ratio: '3:2',
  },
  'crowded-scene': {
    id: 'crowded-scene',
    prompt:
      'A busy night market street with many stalls, lanterns and people, every stall readable, deep detail throughout, cinematic light.',
    image: '/imgs/examples/showcase/crowded-scene.webp',
    width: 600,
    height: 600,
    ratio: '1:1',
  },
  'packaging-shot': {
    id: 'packaging-shot',
    prompt:
      'A craft coffee bag on a wooden counter, warm morning light, the brand name printed clearly on the label, shallow depth of field.',
    image: '/imgs/examples/showcase/packaging-shot.webp',
    width: 600,
    height: 600,
    ratio: '1:1',
  },
  'aperture-comparison': {
    id: 'aperture-comparison',
    prompt:
      'Canon 85mm portrait of a woman during the blue hour after sunset in a city, a four-panel comparison shot at f/1.8, f/2.8, f/10 and f/14, background blur changing across the panels, natural skin tones.',
    image: '/imgs/examples/showcase/aperture-comparison.webp',
    width: 1200,
    height: 655,
    ratio: '16:9',
  },
  'macro-detail': {
    id: 'macro-detail',
    prompt:
      'Macro photograph of a wristwatch face, brushed metal texture, fine engraving, dramatic reflections, dark background.',
    image: '/imgs/examples/showcase/macro-detail.webp',
    width: 600,
    height: 600,
    ratio: '1:1',
  },
  'design-magazine': {
    id: 'design-magazine',
    prompt:
      'An architecture magazine cover with exactly one sculptural cobalt chair in a quiet concrete gallery, rigorous Swiss-influenced layout and generous margins. Headline "FORM & FUNCTION", supporting lines "ISSUE 08" and "OBJECTS WITH PURPOSE", warm off-white paper and one vermilion rule.',
    image: '/imgs/models/samples/gpt-image-2-editorial-cover.webp',
    width: 800,
    height: 1200,
    ratio: '2:3',
  },
  'workflow-infographic': {
    id: 'workflow-infographic',
    prompt:
      'A clean four-step product design workflow infographic titled "FROM IDEA TO LAUNCH". Four equal blocks connected left to right and labelled "IDEA", "SKETCH", "BUILD", "SHIP", with the footer "A SIMPLE CREATIVE WORKFLOW", polished vector style, precise alignment and generous whitespace.',
    image: '/imgs/models/samples/gpt-image-2-workflow.webp',
    width: 1200,
    height: 800,
    ratio: '3:2',
  },
  'flat-illustration': {
    id: 'flat-illustration',
    prompt:
      'Flat isometric illustration of a person working at a desk with plants and a laptop, pastel palette, white background.',
    image: '/imgs/examples/showcase/flat-illustration.webp',
    width: 600,
    height: 600,
    ratio: '1:1',
  },
  'geometric-fashion': {
    id: 'geometric-fashion',
    prompt:
      'Editorial fashion portrait of a poised woman in a sculptural ivory coat, cobalt-blue arches and a burnt-orange circle, soft studio light, high-end photography.',
    image: '/imgs/features/text-to-image/geometric-fashion.webp',
    width: 900,
    height: 900,
    ratio: '1:1',
  },
  'cover-layout': {
    id: 'cover-layout',
    prompt:
      'A minimal magazine cover layout: a large headline area at the top, a single centred object below, generous margins, two-colour palette.',
    image: '/imgs/examples/showcase/cover-layout.webp',
    width: 600,
    height: 600,
    ratio: '1:1',
  },
  'study-cards': {
    id: 'study-cards',
    prompt:
      'A set of study cards explaining how Git works: one concept per card, large heading, three bullet points, a simple icon, consistent grid layout.',
    image: '/imgs/examples/showcase/study-cards.webp',
    width: 766,
    height: 863,
    ratio: '3:4',
  },
  'material-atlas': {
    id: 'material-atlas',
    prompt:
      'A premium landscape editorial infographic titled "MATERIAL ATLAS". Arrange four precise material studies in a clean modular grid: translucent glass, brushed metal, folded ivory textile and deep cobalt ceramic. Add the exact labels "GLASS", "METAL", "TEXTILE" and "CERAMIC" beneath the matching samples, generous warm-white margins, subtle measurement marks, refined studio lighting and a sophisticated contemporary design-magazine art direction.',
    image: '/imgs/models/samples/seedream-5-pro-cover.webp',
    width: 1536,
    height: 1024,
    ratio: '3:2',
  },
  'spectrum-futures': {
    id: 'spectrum-futures',
    prompt:
      'A finished vertical bilingual design festival poster set in a dark gallery, featuring a monumental translucent glass ribbon sculpture refracting cyan, violet, coral and amber light. Render the exact headline "光谱未来 · SPECTRUM FUTURES", supporting lines "SHANGHAI DESIGN WEEK" and "08—14 OCT 2026", and footer "WEST BUND ART CENTER". Cinematic photorealism, refined cultural-poster typography, polished black floor reflections, clear hierarchy and no extra text.',
    image: '/imgs/models/samples/seedream-5-0-pro-spectrum-futures.webp',
    width: 1024,
    height: 1536,
    ratio: '2:3',
  },
  'three-cities': {
    id: 'three-cities',
    prompt:
      'A polished landscape editorial fashion triptych with exactly three equal vertical panels showing the same fictional East Asian woman with the same short black bob, facial features and cobalt blue trench coat in rainy Shanghai at blue hour, quiet Paris in soft morning light and neon Tokyo at night. Keep her identity and outfit clearly consistent while changing only pose, city, weather and lighting. Render the exact headline "ONE STORY · THREE CITIES" once, perfectly legible, with a clean structured grid, cinematic photography and no other text.',
    image: '/imgs/models/samples/seedream-5-0-pro-three-cities.webp',
    width: 1536,
    height: 1024,
    ratio: '3:2',
  },
  'shanghai-night-market': {
    id: 'shanghai-night-market',
    prompt:
      'A sophisticated vertical cultural travel poster for a Shanghai night market, dense but carefully structured composition with red lanterns, steaming food stalls, handwritten menu boards, diners and wet street reflections. Render the exact headline "夜市 · NIGHT MARKET" and the exact footer "SHANGHAI · 19:00". Deep ink blue, lacquer red and warm gold palette, cinematic photorealism with premium editorial typography and clear visual hierarchy.',
    image: '/imgs/models/samples/seedream-5-pro-night-market.webp',
    width: 1024,
    height: 1536,
    ratio: '2:3',
  },
  'lumen-serum': {
    id: 'lumen-serum',
    prompt:
      'A premium landscape skincare campaign with exactly three frosted glass serum bottles on pale limestone, translucent plum and warm coral liquids, brushed silver caps, soft directional studio daylight, convincing glass refraction and tactile stone detail. Compose it as a sophisticated advertising layout with generous cream negative space. Render the exact large headline "LUMEN · 光" and the exact small line "DAILY SERUM", perfectly legible, with refined international design-magazine art direction and no extra text.',
    image: '/imgs/models/samples/seedream-5-0-pro-lumen-serum.webp',
    width: 1536,
    height: 1024,
    ratio: '3:2',
  },
  'tidal-house': {
    id: 'tidal-house',
    prompt:
      'A polished landscape architectural presentation board for a compact coastal retreat named "TIDAL HOUSE". Use a rigorous warm-white modular grid with one large photorealistic exterior rendering and three precise supporting panels: a floor plan, a section drawing and a material palette of oak, brushed aluminium, linen and sea stone. Render the exact labels "PLAN", "SECTION", "MATERIALS" and footer "COASTAL RETREAT · 2026". Contemporary Swiss editorial design, convincing materials, generous margins and no extra text.',
    image: '/imgs/models/samples/seedream-5-0-pro-tidal-house.webp',
    width: 1536,
    height: 1024,
    ratio: '3:2',
  },
  'dense-infographic': {
    id: 'dense-infographic',
    prompt:
      'A dense infographic poster explaining how an AI video generator works: labelled diagram blocks, connecting arrows, small captions, legible typography, muted technical colour palette.',
    image: '/imgs/examples/showcase/dense-infographic.webp',
    width: 1200,
    height: 896,
    ratio: '4:3',
  },
  'flow-diagram': {
    id: 'flow-diagram',
    prompt:
      'A flow diagram of four labelled blocks connected by arrows on an off-white background, muted blue and grey palette, technical illustration.',
    image: '/imgs/examples/showcase/flow-diagram.webp',
    width: 600,
    height: 600,
    ratio: '1:1',
  },
  'sale-poster': {
    id: 'sale-poster',
    prompt:
      'A modern, playful graphic poster for a Christmas sale — bold typography, vibrant festive colours, clean layout with room for a discount badge.',
    image: '/imgs/examples/showcase/sale-poster.webp',
    width: 896,
    height: 1200,
    ratio: '3:4',
  },
  'floating-library': {
    id: 'floating-library',
    prompt:
      'A vast floating island library above sunlit clouds, stone stairways, arched book halls, hanging gardens, and a tiny explorer crossing a bridge, cinematic fantasy illustration.',
    image: '/imgs/features/text-to-image/floating-library.webp',
    width: 900,
    height: 900,
    ratio: '1:1',
  },
  'alpine-observatory': {
    id: 'alpine-observatory',
    prompt:
      'A futuristic glass observatory perched on a snowy mountain ridge at dawn, a lone astronomer in a red parka, warm interior glow, cinematic architectural photography.',
    image: '/imgs/features/text-to-image/alpine-observatory.webp',
    width: 900,
    height: 900,
    ratio: '1:1',
  },
  'cobalt-perfume': {
    id: 'cobalt-perfume',
    prompt:
      'A sculptural cobalt-blue perfume bottle on a dark volcanic stone pedestal, a thin arc of water frozen behind it, premium editorial product photography.',
    image: '/imgs/features/text-to-image/cobalt-perfume.webp',
    width: 900,
    height: 900,
    ratio: '1:1',
  },
  'group-photo': {
    id: 'group-photo',
    prompt:
      'Three friends laughing together at an outdoor table, candid group photograph, warm late afternoon light, all faces sharp.',
    image: '/imgs/examples/showcase/group-photo.webp',
    width: 600,
    height: 600,
    ratio: '1:1',
  },
  'outfit-change': {
    id: 'outfit-change',
    prompt:
      "Replace only the beige linen blouse with a deep emerald-green tailored blazer over an ivory silk top. Preserve the person's identity, face, hair, expression, pose, framing, background, and lighting.",
    image: '/imgs/features/image-to-image/outfit-change-after.webp',
    width: 1024,
    height: 1024,
    ratio: '1:1',
  },
  'summer-to-winter': {
    id: 'summer-to-winter',
    prompt:
      'Transform this lakeside cabin from late summer to a snowy winter evening. Add fresh snow, a partly frozen lake, blue-hour light, and a warm glow inside while preserving the cabin, trees, shoreline, and camera angle.',
    image: '/imgs/features/image-to-image/summer-to-winter-after.webp',
    width: 1024,
    height: 1024,
    ratio: '1:1',
  },
  'interior-redesign': {
    id: 'interior-redesign',
    prompt:
      'Furnish this empty room with a low rust-colored sofa, a sculptural walnut coffee table, two cream lounge chairs, an indoor olive tree, and one abstract artwork. Preserve the architecture, window, fireplace, rug, floor, camera angle, and morning light.',
    image: '/imgs/features/image-to-image/interior-redesign-after.webp',
    width: 1024,
    height: 1024,
    ratio: '1:1',
  },
  'sketch-to-product': {
    id: 'sketch-to-product',
    prompt:
      'Turn this desk lamp sketch into a photorealistic product made from matte cobalt-blue anodized aluminum with a warm LED ring. Preserve the exact silhouette, proportions, base, head shape, and viewing angle.',
    image: '/imgs/features/image-to-image/sketch-to-render-after.webp',
    width: 1024,
    height: 1024,
    ratio: '1:1',
  },
  'style-portrait': {
    id: 'style-portrait',
    prompt:
      "Transform this portrait into a refined editorial illustration with clean shapes and soft flat colour while preserving the subject's identity and pose.",
    image: '/imgs/tools/style-portrait-after.webp',
    width: 800,
    height: 800,
    ratio: '1:1',
  },
  'product-color': {
    id: 'product-color',
    prompt:
      'Recolor the ivory headphones to rich cobalt blue. Keep their exact shape, materials, position, lighting, backdrop, and natural shadow unchanged.',
    image: '/imgs/examples/edit/product-color-after.webp',
    width: 1254,
    height: 1254,
    ratio: '1:1',
  },
  'day-to-night': {
    id: 'day-to-night',
    prompt:
      'Change this cafe scene from sunny late afternoon to blue hour after light rain. Add warm interior glow and subtle pavement reflections while preserving the architecture and composition.',
    image: '/imgs/examples/edit/day-to-night-after.webp',
    width: 1254,
    height: 1254,
    ratio: '1:1',
  },
  'object-removal': {
    id: 'object-removal',
    prompt:
      'Remove the red bicycle and reconstruct the garden naturally. Keep the bench, plants, path, framing, colors, lighting, and shadows unchanged.',
    image: '/imgs/examples/edit/object-removal-after.webp',
    width: 1254,
    height: 1254,
    ratio: '1:1',
  },
  'library-v2': {
    id: 'library-v2',
    prompt:
      'A photoreal sunlit library interior with tall oak shelves, a reading table by tall windows, warm wood floors and soft dust in the light.',
    image: '/imgs/home/library-v2.webp',
    width: 1200,
    height: 675,
    ratio: '16:9',
  },
  'reference-v2': {
    id: 'reference-v2',
    prompt:
      'Using the provided product and material references, restyle this bottle into a matte ceramic finish with a brushed-metal cap while preserving shape, label layout and camera angle.',
    image: '/imgs/home/reference-v2.webp',
    width: 1200,
    height: 675,
    ratio: '16:9',
  },
  'models-v2': {
    id: 'models-v2',
    prompt:
      'A clean editorial collage comparing AI video models side by side, equal panels, subtle labels, soft studio backdrop and precise alignment.',
    image: '/imgs/home/models-v2.webp',
    width: 1200,
    height: 675,
    ratio: '16:9',
  },
  'portrait-illustration': {
    id: 'portrait-illustration',
    prompt:
      "Transform this portrait into a sophisticated hand-painted gouache editorial illustration. Preserve the subject's identity, expression, pose, hairstyle, clothing, and composition.",
    image: '/imgs/examples/edit/portrait-illustration-after.webp',
    width: 1254,
    height: 1254,
    ratio: '1:1',
  },
  'expand-cabin': {
    id: 'expand-cabin',
    prompt:
      'Expand this cabin scene outward on all sides to reveal more of the surrounding forest, lake shoreline and sky while preserving the cabin, trees and existing lighting.',
    image: '/imgs/tools/expand-cabin-after.webp',
    width: 1200,
    height: 675,
    ratio: '16:9',
  },
  'background-shoe': {
    id: 'background-shoe',
    prompt:
      'Place this shoe on a clean seamless studio backdrop with soft directional light and a natural contact shadow, removing the original background completely.',
    image: '/imgs/tools/background-shoe-after.webp',
    width: 800,
    height: 800,
    ratio: '1:1',
  },
  'upscale-butterfly': {
    id: 'upscale-butterfly',
    prompt:
      'Upscale this butterfly photo with sharper wing-scale detail, cleaner edges and richer colour while preserving the exact composition, pose and background.',
    image: '/imgs/tools/upscale-butterfly-after.webp',
    width: 900,
    height: 900,
    ratio: '1:1',
  },
};

export const MODEL_PAGES: Record<string, ModelPageConfig> = {
  'flux-2': {
    slug: 'flux-2',
    color: '#d97706',
    cover: '/imgs/models/covers/flux-2.webp',
    overviewImage: '/imgs/models/samples/flux-schnell-city-courier.webp',
    showcaseIds: [
      'city-courier',
      'robot-workshop',
      'studio-portrait',
      'product-still-life',
      'storybook-scene',
      'collectible-figurine',
      'alpine-observatory',
      'cobalt-perfume',
      'floating-library',
    ],
    capabilityKeys: [
      'photoreal',
      'reference_edits',
      'aspect_control',
      'materials',
      'drafts',
      'quality',
    ],
    tipKeys: ['subject_first', 'style_one', 'batch_explore'],
    faqKeys: [
      'what',
      'cost',
      'when',
      'photoreal_or_draft',
      'account',
      'batch_or_refs',
    ],
  },
  'nano-banana-pro': {
    slug: 'nano-banana-pro',
    color: '#10b981',
    cover: '/imgs/models/covers/nano-banana-pro.webp',
    overviewImage: '/imgs/models/samples/nano-banana-pro-night-market.webp',
    showcaseIds: [
      'night-market',
      'tea-packaging',
      'crowded-scene',
      'packaging-shot',
      'aperture-comparison',
      'macro-detail',
      'sale-poster',
      'cover-layout',
      'dense-infographic',
    ],
    capabilityKeys: [
      'legible_text',
      'dense_scenes',
      'fine_detail',
      'subject_consistency',
      'aspect_control',
      'google_model',
    ],
    tipKeys: ['quote_text', 'hierarchy', 'references'],
    faqKeys: [
      'what',
      'cost',
      'when',
      'text_or_detail',
      'account',
      'batch_or_refs',
    ],
  },
  'gpt-image-2': {
    slug: 'gpt-image-2',
    color: '#6366f1',
    cover: '/imgs/models/covers/gpt-image-2.webp',
    overviewImage: '/imgs/models/samples/gpt-image-2-editorial-cover.webp',
    showcaseIds: [
      'design-magazine',
      'workflow-infographic',
      'flat-illustration',
      'geometric-fashion',
      'cover-layout',
      'study-cards',
      'sale-poster',
      'dense-infographic',
      'flow-diagram',
    ],
    capabilityKeys: [
      'instruction_following',
      'layouts',
      'diagrams',
      'product_shots',
      'flat_illustration',
      'aspect_control',
    ],
    tipKeys: ['counts', 'separate_layers', 'lock_copy'],
    faqKeys: [
      'what',
      'cost',
      'when',
      'layouts_or_diagrams',
      'account',
      'batch_or_refs',
    ],
  },
  'seedream-5-0-pro': {
    slug: 'seedream-5-0-pro',
    color: '#ec4899',
    cover: '/imgs/models/covers/seedream-5-0-pro.webp',
    overviewImage: '/imgs/models/samples/seedream-5-pro-cover.webp',
    showcaseIds: [
      'material-atlas',
      'spectrum-futures',
      'three-cities',
      'shanghai-night-market',
      'lumen-serum',
      'tidal-house',
      'night-market',
      'tea-packaging',
      'cobalt-perfume',
    ],
    capabilityKeys: [
      'prompt_understanding',
      'multilingual',
      'dense_layouts',
      'photoreal_materials',
      'multi_reference',
      'resolution',
    ],
    tipKeys: ['layout', 'multilingual_copy', 'reference_jobs'],
    faqKeys: [
      'what',
      'cost',
      'when',
      'multilingual_or_detail',
      'account',
      'batch_or_refs',
    ],
  },
  'nano-banana-2': {
    slug: 'nano-banana-2',
    color: '#34d399',
    cover: '/imgs/models/covers/nano-banana-2.webp',
    overviewImage: '/imgs/examples/showcase/group-photo.webp',
    showcaseIds: [
      'group-photo',
      'outfit-change',
      'summer-to-winter',
      'interior-redesign',
      'sketch-to-product',
      'style-portrait',
      'product-color',
      'day-to-night',
      'object-removal',
    ],
    capabilityKeys: [
      'daily_speed',
      'aesthetic',
      'light_edits',
      'aspect_control',
      'affordable',
      'versatile',
    ],
    tipKeys: ['simple_brief', 'one_style', 'iterate'],
    faqKeys: [
      'what',
      'cost',
      'when',
      'speed_or_quality',
      'account',
      'batch_or_refs',
    ],
  },
  'gpt-image-2-5-flare': {
    slug: 'gpt-image-2-5-flare',
    color: '#818cf8',
    cover: '/imgs/models/covers/gpt-image-2.5-flare.webp',
    overviewImage: '/imgs/examples/edit/product-color-after.webp',
    showcaseIds: [
      'product-color',
      'day-to-night',
      'object-removal',
      'library-v2',
      'reference-v2',
      'models-v2',
      'portrait-illustration',
      'expand-cabin',
      'background-shoe',
    ],
    capabilityKeys: [
      'fast_quality',
      'layouts',
      'editing_speed',
      'references',
      'transparent',
      'aspect_control',
    ],
    tipKeys: ['short_brief', 'keep_stable', 'escalate'],
    faqKeys: [
      'what',
      'cost',
      'when',
      'edit_or_layout',
      'account',
      'batch_or_refs',
    ],
  },
  'gpt-image-2-5-sunburst': {
    slug: 'gpt-image-2-5-sunburst',
    color: '#a78bfa',
    cover: '/imgs/models/covers/gpt-image-2.5-sunburst.webp',
    overviewImage: '/imgs/examples/edit/portrait-illustration-after.webp',
    showcaseIds: [
      'portrait-illustration',
      'expand-cabin',
      'background-shoe',
      'upscale-butterfly',
      'product-color',
      'day-to-night',
      'object-removal',
      'library-v2',
      'reference-v2',
    ],
    capabilityKeys: [
      'precision_detail',
      'multi_turn_edit',
      'production',
      'references',
      'quality_tiers',
      'aspect_control',
    ],
    tipKeys: ['lock_unchanged', 'material_detail', 'multi_round'],
    faqKeys: [
      'what',
      'cost',
      'when',
      'precision_or_tiers',
      'account',
      'batch_or_refs',
    ],
  },
  'qwen-image-3-0': {
    slug: 'qwen-image-3-0',
    color: '#0ea5e9',
    cover: '/imgs/models/covers/qwen-image-3.webp',
    overviewImage: '/imgs/examples/showcase/dense-infographic.webp',
    showcaseIds: [
      'dense-infographic',
      'flow-diagram',
      'sale-poster',
      'floating-library',
      'alpine-observatory',
      'cobalt-perfume',
      'cover-layout',
      'study-cards',
      'workflow-infographic',
    ],
    capabilityKeys: [
      'dense_layouts',
      'small_text',
      'multilingual',
      'long_prompts',
      'knowledge',
      'aspect_control',
    ],
    tipKeys: ['structure', 'quote_small', 'language'],
    faqKeys: [
      'what',
      'cost',
      'when',
      'text_or_dense',
      'account',
      'batch_or_refs',
    ],
  },
};

export function getModelPage(slug: string): ModelPageConfig | undefined {
  return MODEL_PAGES[slug];
}

export function getModelPageSlugs(): string[] {
  return GENERATOR_IMAGE_MODELS.filter((model) => MODEL_PAGES[model.id]).map(
    (model) => model.id
  );
}

export function getModelShowcaseItems(slug: string): ModelShowcaseItem[] {
  const page = MODEL_PAGES[slug];
  if (!page) return [];
  return page.showcaseIds.map((id) => MODEL_SHOWCASE_ITEMS[id]).filter(Boolean);
}

export function getOtherModelPages(slug: string): ModelPageConfig[] {
  return Object.values(MODEL_PAGES)
    .filter((page) => page.slug !== slug)
    .sort((a, b) => {
      const aCredits =
        getImageModelById(a.slug)?.credits ??
        IMAGE_MODELS[a.slug]?.credits ??
        0;
      const bCredits =
        getImageModelById(b.slug)?.credits ??
        IMAGE_MODELS[b.slug]?.credits ??
        0;
      return aCredits - bCredits || a.slug.localeCompare(b.slug);
    });
}

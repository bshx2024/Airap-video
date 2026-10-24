'use client';

import { tDynamic } from '@/core/i18n/dynamic';
import { getImageModelById } from '@/config/ai-models';
import {
  getModelShowcaseItems,
  getOtherModelPages,
  type ModelPageConfig,
} from '@/config/model-pages';
import { HeroGenerator } from '@/components/sites/root/HeroGenerator';

import { ModelCapabilities } from './ModelCapabilities';
import { ModelCta } from './ModelCta';
import { ModelFaq } from './ModelFaq';
import { ModelOtherModels } from './ModelOtherModels';
import { ModelOverview } from './ModelOverview';
import { ModelPromptGuide } from './ModelPromptGuide';
import { ModelShowcase } from './ModelShowcase';

export function ModelDetailPage({ model }: { model: ModelPageConfig }) {
  const catalog = getImageModelById(model.slug);
  const name = catalog?.name || model.slug;
  const showcaseItems = getModelShowcaseItems(model.slug);
  const otherModels = getOtherModelPages(model.slug).slice(0, 6);
  const ns = `landing.models.pages.${model.slug}`;

  const handleUsePrompt = (promptText: string) => {
    window.dispatchEvent(new CustomEvent('use-prompt', { detail: promptText }));
    document
      .getElementById('generator')
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="w-full">
      <HeroGenerator
        key={model.slug}
        mode="default"
        title={tDynamic(`${ns}.hero_title`, `${name} Video Lite`)}
        subtitle={tDynamic(`${ns}.hero_desc`)}
        initialModelId={model.slug}
        unifiedInput
      />

      <ModelShowcase
        title={tDynamic(`${ns}.showcase_title`)}
        description={tDynamic(`${ns}.showcase_desc`)}
        items={showcaseItems}
        onUsePrompt={handleUsePrompt}
      />

      <ModelCapabilities
        slug={model.slug}
        title={tDynamic(`${ns}.capabilities_title`)}
        capabilityKeys={model.capabilityKeys}
      />

      <ModelOverview
        title={tDynamic(`${ns}.overview_title`)}
        description={tDynamic(`${ns}.overview_desc`)}
        imageSrc={model.overviewImage}
        imageAlt={tDynamic(`${ns}.overview_image_alt`, name)}
        accentColor={model.color}
      />

      <ModelPromptGuide
        slug={model.slug}
        title={tDynamic(`${ns}.guide_title`)}
        description={tDynamic(`${ns}.guide_desc`)}
        tipKeys={model.tipKeys}
        accentColor={model.color}
      />

      <ModelOtherModels models={otherModels} />

      <ModelFaq
        slug={model.slug}
        title={tDynamic(`${ns}.faq_title`)}
        description={tDynamic(`${ns}.faq_desc`)}
        faqKeys={model.faqKeys}
      />

      <ModelCta
        title={tDynamic(`${ns}.cta_title`)}
        description={tDynamic(`${ns}.cta_desc`)}
      />
    </div>
  );
}

'use client';

import { tDynamic } from '@/core/i18n/dynamic';
import { getOtherToolPages, type ToolPageConfig } from '@/config/tools';
import { HeroGenerator } from '@/components/sites/root/HeroGenerator';

import { ToolCta } from './ToolCta';
import { ToolFaq } from './ToolFaq';
import { ToolHowItWorks } from './ToolHowItWorks';
import { ToolOtherTools } from './ToolOtherTools';

export function ToolDetailPage({ tool }: { tool: ToolPageConfig }) {
  const ns = `landing.tools.pages.${tool.slug}`;
  const otherTools = getOtherToolPages(tool.slug);

  return (
    <div className="w-full">
      <HeroGenerator
        key={tool.slug}
        mode="image-only"
        tool={tool}
        title={tDynamic(`${ns}.hero_title`)}
        subtitle={tDynamic(`${ns}.hero_desc`)}
      />

      <ToolHowItWorks
        slug={tool.slug}
        title={tDynamic(`${ns}.how_title`)}
        description={tDynamic(`${ns}.how_desc`)}
        stepKeys={tool.stepKeys}
      />

      <ToolOtherTools tools={otherTools} />

      <ToolFaq
        slug={tool.slug}
        title={tDynamic(`${ns}.faq_title`)}
        description={tDynamic(`${ns}.faq_desc`)}
        faqKeys={tool.faqKeys}
      />

      <ToolCta
        title={tDynamic(`${ns}.cta_title`)}
        description={tDynamic(`${ns}.cta_desc`)}
        buttonLabel={tDynamic(`${ns}.cta_button`)}
      />
    </div>
  );
}

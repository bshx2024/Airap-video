import {
  Gauge,
  Layers,
  Maximize,
  PencilLine,
  Ratio,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import {
  TEXT_TO_IMAGE_FAQS,
  TEXT_TO_IMAGE_FEATURES,
  TEXT_TO_IMAGE_QUICKSTART,
  TEXT_TO_IMAGE_SPOTLIGHTS,
  TEXT_TO_IMAGE_STEPS,
} from '@/config/feature-pages';
import { EXAMPLES, type ExampleItem } from '@/config/landing-data';
import { m } from '@/paraglide/messages.js';
import { LandingCta, LandingFaq } from '@/components/sites/root/FaqCta';
import { HeroGenerator } from '@/components/sites/root/HeroGenerator';

import { FeatureSpotlightList } from './feature-spotlight';

const STEP_ICONS = [PencilLine, Ratio, Sparkles];
const FEATURE_ICONS = [
  WandSparkles,
  Gauge,
  Layers,
  ShieldCheck,
  Maximize,
  Ratio,
];

export function TextToImagePage() {
  const showcaseExamples = EXAMPLES.slice(0, 12);

  const handleUsePrompt = (item: ExampleItem) => {
    window.dispatchEvent(
      new CustomEvent('use-prompt', { detail: item.prompt })
    );
    document
      .getElementById('generator')
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="w-full">
      <HeroGenerator
        mode="text-only"
        quickStartItems={TEXT_TO_IMAGE_QUICKSTART}
        quickStartMessageNs="landing.text_to_image.quickstart"
      />

      <section id="how-it-works" className="scroll-mt-20 px-4 py-16">
        <div className="mx-auto w-full max-w-5xl">
          <h2 className="text-foreground text-center font-serif text-2xl font-normal sm:text-3xl">
            {m['landing.t2i.how_title']()}
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed">
            {m['landing.t2i.how_description']()}
          </p>
          <ol className="mt-10 grid list-none gap-6 p-0 md:grid-cols-3">
            {TEXT_TO_IMAGE_STEPS.map((step, index) => {
              const Icon = STEP_ICONS[index];
              return (
                <li
                  key={step.step}
                  className="border-border bg-card rounded-2xl border p-6"
                >
                  <div className="flex items-center gap-3">
                    <span className="border-border text-muted-foreground flex size-6 items-center justify-center rounded-md border text-xs tabular-nums">
                      {step.step}
                    </span>
                    <Icon className="text-primary size-5" />
                  </div>
                  <h3 className="text-foreground mt-4 text-sm font-medium">
                    {tDynamic(`landing.text_to_image.steps.${step.step}.title`)}
                  </h3>
                  <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                    {tDynamic(
                      `landing.text_to_image.steps.${step.step}.description`
                    )}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section id="showcase" className="scroll-mt-20 px-4 py-16">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="text-foreground text-center font-serif text-2xl font-normal sm:text-3xl">
            {m['landing.t2i.showcase_title']()}
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed">
            {m['landing.t2i.showcase_description']()}
          </p>
          <div className="mt-10 columns-2 gap-4 sm:columns-3 lg:columns-4 [&>*]:mb-4">
            {showcaseExamples.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleUsePrompt(item)}
                title={item.prompt}
                className="group border-border bg-card focus-visible:ring-ring relative block w-full cursor-pointer break-inside-avoid overflow-hidden rounded-2xl border text-left focus-visible:ring-2 focus-visible:outline-none"
              >
                <img
                  src={item.image}
                  alt={tDynamic(`landing.examples.items.${item.id}.title`)}
                  width={item.width}
                  height={item.height}
                  loading="lazy"
                  className="h-auto w-full object-cover"
                />
                <span className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
                  <span className="line-clamp-2 text-xs leading-relaxed text-white/80">
                    {item.prompt}
                  </span>
                  <span className="mt-2 text-xs font-medium text-white">
                    {m['landing.examples.use_prompt']()}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-20 px-4 py-16">
        <div className="mx-auto w-full max-w-5xl">
          <h2 className="text-foreground text-center font-serif text-2xl font-normal sm:text-3xl">
            {m['landing.t2i.features_title']()}
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TEXT_TO_IMAGE_FEATURES.map((item, index) => {
              const Icon = FEATURE_ICONS[index];
              return (
                <div
                  key={item.id}
                  className="border-border bg-card rounded-2xl border p-5"
                >
                  <Icon className="text-primary size-5" />
                  <h3 className="text-foreground mt-3 text-sm font-medium">
                    {tDynamic(
                      `landing.text_to_image.features.${item.id}.title`
                    )}
                  </h3>
                  <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                    {tDynamic(
                      `landing.text_to_image.features.${item.id}.description`
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <FeatureSpotlightList
        title={m['landing.t2i.spotlight_title']()}
        description={m['landing.t2i.spotlight_description']()}
        items={TEXT_TO_IMAGE_SPOTLIGHTS}
        messageNs="landing.text_to_image.spotlights"
      />

      <LandingFaq
        items={TEXT_TO_IMAGE_FAQS}
        messageNs="landing.text_to_image.faq"
        title={m['landing.t2i.faq_title']()}
        description={m['landing.t2i.faq_description']()}
      />
      <LandingCta
        headline={m['landing.t2i.cta_headline']()}
        subheadline={m['landing.t2i.cta_subheadline']()}
        generateLabel={m['landing.t2i.cta_generate']()}
      />
    </div>
  );
}

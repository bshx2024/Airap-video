import {
  ArrowRight,
  Blend,
  Brush,
  ImageMinus,
  ImageUp,
  Palette,
  PencilLine,
  Repeat2,
  Sparkles,
  Users,
} from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import {
  IMAGE_TO_IMAGE_FAQS,
  IMAGE_TO_IMAGE_FEATURES,
  IMAGE_TO_IMAGE_QUICKSTART,
  IMAGE_TO_IMAGE_SPOTLIGHTS,
  IMAGE_TO_IMAGE_STEPS,
} from '@/config/feature-pages';
import { EDIT_EXAMPLES, type EditExampleItem } from '@/config/landing-data';
import { m } from '@/paraglide/messages.js';
import { LandingCta, LandingFaq } from '@/components/sites/root/FaqCta';
import { HeroGenerator } from '@/components/sites/root/HeroGenerator';

import { FeatureSpotlightList } from './feature-spotlight';

const STEP_ICONS = [ImageUp, PencilLine, Sparkles];
const FEATURE_ICONS = [Brush, Repeat2, Palette, ImageMinus, Users, Blend];

export function ImageToImagePage() {
  const handleTryEdit = (example: EditExampleItem) => {
    window.dispatchEvent(
      new CustomEvent('use-reference', {
        detail: { image: example.sourceImage, prompt: example.prompt },
      })
    );
    document
      .getElementById('generator')
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="w-full">
      <HeroGenerator
        mode="image-only"
        quickStartItems={IMAGE_TO_IMAGE_QUICKSTART}
        quickStartMessageNs="landing.image_to_image.quickstart"
      />

      <section id="how-it-works" className="scroll-mt-20 px-4 py-16">
        <div className="mx-auto w-full max-w-5xl">
          <h2 className="text-foreground text-center font-serif text-2xl font-normal sm:text-3xl">
            {m['landing.i2i.how_title']()}
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed">
            {m['landing.i2i.how_description']()}
          </p>
          <ol className="mt-10 grid list-none gap-6 p-0 md:grid-cols-3">
            {IMAGE_TO_IMAGE_STEPS.map((step, index) => {
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
                    {tDynamic(
                      `landing.image_to_image.steps.${step.step}.title`
                    )}
                  </h3>
                  <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                    {tDynamic(
                      `landing.image_to_image.steps.${step.step}.description`
                    )}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section id="showcase" className="scroll-mt-20 px-4 py-16">
        <div className="mx-auto w-full max-w-5xl">
          <h2 className="text-foreground text-center font-serif text-2xl font-normal sm:text-3xl">
            {m['landing.i2i.showcase_title']()}
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed">
            {m['landing.i2i.showcase_description']()}
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {EDIT_EXAMPLES.map((item) => {
              const title = tDynamic(`landing.edit_examples.${item.id}.title`);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTryEdit(item)}
                  className="group border-border bg-card focus-visible:ring-ring hover:border-primary/40 cursor-pointer overflow-hidden rounded-2xl border text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span className="bg-muted grid aspect-[2/1] grid-cols-2 gap-px overflow-hidden">
                    <span className="bg-background relative min-w-0 overflow-hidden">
                      <img
                        src={item.sourceImage}
                        alt={`${title} — ${m['landing.i2i.reference']()}`}
                        className="size-full object-cover"
                      />
                      <span className="absolute bottom-2 left-2 rounded-full bg-black/65 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                        {m['landing.i2i.reference']()}
                      </span>
                    </span>
                    <span className="bg-background relative min-w-0 overflow-hidden">
                      <img
                        src={item.image}
                        alt={`${title} — ${m['landing.i2i.result']()}`}
                        className="size-full object-cover"
                      />
                      <span className="absolute bottom-2 left-2 rounded-full bg-black/65 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                        {m['landing.i2i.result']()}
                      </span>
                    </span>
                  </span>
                  <span className="block p-5">
                    <span className="text-foreground text-sm font-medium">
                      {title}
                    </span>
                    <span className="text-muted-foreground mt-2 line-clamp-2 block text-sm leading-relaxed">
                      {item.prompt}
                    </span>
                    <span className="text-primary mt-4 inline-flex items-center gap-1 text-xs font-medium">
                      {m['landing.i2i.try_edit']()}
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-20 px-4 py-16">
        <div className="mx-auto w-full max-w-5xl">
          <h2 className="text-foreground text-center font-serif text-2xl font-normal sm:text-3xl">
            {m['landing.i2i.features_title']()}
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {IMAGE_TO_IMAGE_FEATURES.map((item, index) => {
              const Icon = FEATURE_ICONS[index];
              return (
                <div
                  key={item.id}
                  className="border-border bg-card rounded-2xl border p-5"
                >
                  <Icon className="text-primary size-5" />
                  <h3 className="text-foreground mt-3 text-sm font-medium">
                    {tDynamic(
                      `landing.image_to_image.features.${item.id}.title`
                    )}
                  </h3>
                  <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                    {tDynamic(
                      `landing.image_to_image.features.${item.id}.description`
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <FeatureSpotlightList
        title={m['landing.i2i.spotlight_title']()}
        description={m['landing.i2i.spotlight_description']()}
        items={IMAGE_TO_IMAGE_SPOTLIGHTS}
        messageNs="landing.image_to_image.spotlights"
      />

      <LandingFaq
        items={IMAGE_TO_IMAGE_FAQS}
        messageNs="landing.image_to_image.faq"
        title={m['landing.i2i.faq_title']()}
        description={m['landing.i2i.faq_description']()}
      />
      <LandingCta
        headline={m['landing.i2i.cta_headline']()}
        subheadline={m['landing.i2i.cta_subheadline']()}
        generateLabel={m['landing.i2i.cta_generate']()}
      />
    </div>
  );
}

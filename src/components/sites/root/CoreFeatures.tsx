import {
  Images,
  Layers,
  Library,
  MessageSquareText,
  Ratio,
  Type,
} from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { FEATURES, type FeatureItem } from '@/config/landing-data';
import { m } from '@/paraglide/messages.js';

const iconMap = {
  'message-square-text': MessageSquareText,
  type: Type,
  layers: Layers,
  images: Images,
  ratio: Ratio,
  library: Library,
};

export function CoreFeatures() {
  return (
    <section id="features" className="scroll-mt-20 px-4 py-16">
      <div className="mx-auto w-full max-w-5xl">
        <h2 className="text-foreground text-center font-serif text-2xl font-normal sm:text-3xl">
          {m['landing.features.title']()}
        </h2>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((item: FeatureItem) => {
            const Icon = iconMap[item.icon];
            return (
              <div
                key={item.id}
                className="border-border bg-card hover:border-primary/30 rounded-2xl border p-5 shadow-xs transition-colors"
              >
                <Icon className="text-primary size-5" />
                <h3 className="text-foreground mt-3 text-sm font-medium">
                  {tDynamic(`landing.home.features.${item.id}.title`)}
                </h3>
                <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                  {tDynamic(`landing.home.features.${item.id}.description`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import {
  CreditCard,
  Layers,
  LayoutGrid,
  ListChecks,
  Microscope,
  Package,
  Palette,
  RefreshCw,
  Sparkles,
  Type,
  UserCheck,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';

const ICONS_BY_SLUG: Record<string, LucideIcon[]> = {
  'flux-2': [Zap, Layers, Palette, Microscope, Sparkles, RefreshCw],
  'nano-banana-pro': [
    Type,
    LayoutGrid,
    Microscope,
    UserCheck,
    RefreshCw,
    Sparkles,
  ],
  'gpt-image-2': [ListChecks, LayoutGrid, Layers, Package, Palette, RefreshCw],
  'seedream-5-0-pro': [
    Sparkles,
    Type,
    LayoutGrid,
    Microscope,
    Layers,
    RefreshCw,
  ],
  'nano-banana-2': [Zap, Palette, RefreshCw, LayoutGrid, CreditCard, Sparkles],
  'gpt-image-2-5-flare': [
    Zap,
    LayoutGrid,
    RefreshCw,
    Layers,
    Sparkles,
    ListChecks,
  ],
  'gpt-image-2-5-sunburst': [
    Microscope,
    ListChecks,
    Package,
    Layers,
    Sparkles,
    RefreshCw,
  ],
  'qwen-image-3-0': [LayoutGrid, Type, Sparkles, ListChecks, Layers, RefreshCw],
};

export function ModelCapabilities({
  slug,
  title,
  capabilityKeys,
}: {
  slug: string;
  title: string;
  capabilityKeys: string[];
}) {
  if (capabilityKeys.length === 0) return null;
  const icons = ICONS_BY_SLUG[slug] || [
    Sparkles,
    Zap,
    Layers,
    Palette,
    RefreshCw,
    Package,
  ];

  return (
    <section id="features" className="scroll-mt-20 px-4 py-16">
      <div className="mx-auto w-full max-w-5xl">
        <h2 className="text-foreground text-center font-serif text-2xl font-normal sm:text-3xl">
          {title}
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {capabilityKeys.map((key, index) => {
            const Icon = icons[index % icons.length];
            return (
              <div
                key={key}
                className="border-border bg-card rounded-2xl border p-5"
              >
                <Icon className="text-primary size-5" />
                <h3 className="text-foreground mt-3 text-sm font-medium">
                  {tDynamic(
                    `landing.models.pages.${slug}.capabilities.${key}.title`
                  )}
                </h3>
                <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                  {tDynamic(
                    `landing.models.pages.${slug}.capabilities.${key}.description`
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

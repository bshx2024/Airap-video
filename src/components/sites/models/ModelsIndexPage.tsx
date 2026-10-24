'use client';

import { ArrowUpRight } from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { Link } from '@/core/i18n/navigation';
import { getImageModelById } from '@/config/ai-models';
import { getModelPageSlugs, MODEL_PAGES } from '@/config/model-pages';
import { m } from '@/paraglide/messages.js';

export function ModelsIndexPage() {
  const models = getModelPageSlugs()
    .map((slug) => MODEL_PAGES[slug])
    .filter(Boolean)
    .sort((a, b) => {
      const ca = getImageModelById(a.slug)?.credits ?? 99;
      const cb = getImageModelById(b.slug)?.credits ?? 99;
      return ca - cb || a.slug.localeCompare(b.slug);
    });

  return (
    <div className="w-full px-4 py-14 sm:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <div>
          <h1 className="text-foreground font-serif text-3xl font-normal sm:text-4xl">
            {m['landing.models.title']()}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
            {m['landing.models.index_description']()}
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {models.map((model) => {
            const catalog = getImageModelById(model.slug);
            const name = catalog?.name || model.slug;
            const credits = catalog?.credits;
            return (
              <Link
                key={model.slug}
                href={`/models/${model.slug}`}
                className="border-border bg-card hover:border-primary/40 group flex min-w-0 flex-col overflow-hidden rounded-2xl border transition-colors"
              >
                <div className="bg-muted aspect-[8/5] overflow-hidden">
                  <img
                    src={model.cover}
                    alt={name}
                    width={800}
                    height={500}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-medium">{name}</span>
                    <ArrowUpRight className="text-muted-foreground group-hover:text-primary size-4 transition-colors" />
                  </div>
                  {credits != null && (
                    <span className="text-muted-foreground mt-1 text-xs tabular-nums">
                      {m['config.ai_models.credits_label']({ credits })}
                    </span>
                  )}
                  <p className="text-muted-foreground mt-2 flex-1 text-sm leading-relaxed">
                    {tDynamic(`landing.models.pages.${model.slug}.short_desc`)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

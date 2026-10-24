import { ArrowUpRight } from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { Link } from '@/core/i18n/navigation';
import { getImageModelById } from '@/config/ai-models';
import type { ModelPageConfig } from '@/config/model-pages';
import { m } from '@/paraglide/messages.js';

export function ModelOtherModels({ models }: { models: ModelPageConfig[] }) {
  if (models.length === 0) return null;

  return (
    <section className="px-4 py-16">
      <div className="mx-auto w-full max-w-5xl">
        <h2 className="text-foreground text-center font-serif text-2xl font-normal sm:text-3xl">
          {m['landing.models.other_title']()}
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed">
          {m['landing.models.other_description']()}
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((other) => {
            const catalog = getImageModelById(other.slug);
            const name = catalog?.name || other.slug;
            return (
              <Link
                key={other.slug}
                href={`/models/${other.slug}`}
                className="border-border bg-card hover:border-primary/40 group flex flex-col overflow-hidden rounded-2xl border transition-colors"
              >
                <div className="bg-muted aspect-[8/5] w-full overflow-hidden">
                  <img
                    src={other.cover}
                    alt={name}
                    width={800}
                    height={500}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-medium">{name}</span>
                    <ArrowUpRight className="text-muted-foreground group-hover:text-primary size-4 transition-colors" />
                  </div>
                  <p className="text-muted-foreground mt-2 flex-1 text-sm leading-relaxed">
                    {tDynamic(`landing.models.pages.${other.slug}.short_desc`)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

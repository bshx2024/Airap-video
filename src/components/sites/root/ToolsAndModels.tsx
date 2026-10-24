import { ArrowUpRight } from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { Link } from '@/core/i18n/navigation';
import { AI_MODELS, AI_TOOLS } from '@/config/landing-data';
import { m } from '@/paraglide/messages.js';

export function ToolsAndModels() {
  return (
    <section id="explore" className="scroll-mt-20 px-4 py-16">
      <div className="mx-auto w-full max-w-6xl">
        <h2 className="text-foreground font-serif text-2xl font-normal sm:text-3xl">
          {m['landing.tools.title']()}
        </h2>
        <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-relaxed">
          {m['landing.tools.description']()}
        </p>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {AI_TOOLS.map((tool) => (
            <Link
              key={tool.id}
              href={tool.href}
              className="group block cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
            >
              <span className="border-border bg-muted group-hover:border-primary/40 block aspect-[4/3] overflow-hidden rounded-2xl border shadow-xs transition-colors">
                <span className="grid size-full grid-cols-2">
                  <img
                    src={tool.beforeImage}
                    alt=""
                    width={800}
                    height={800}
                    loading="lazy"
                    className="border-border/30 size-full min-w-0 border-r object-cover"
                  />
                  <img
                    src={tool.afterImage}
                    alt=""
                    width={800}
                    height={800}
                    loading="lazy"
                    className="size-full min-w-0 object-cover"
                  />
                </span>
              </span>
              <span className="text-foreground group-hover:text-primary mt-3 block text-sm font-medium transition-colors">
                {tDynamic(`landing.tools.items.${tool.id}.title`)}
              </span>
              <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
                {tDynamic(`landing.tools.items.${tool.id}.description`)}
              </span>
            </Link>
          ))}
        </div>

        <h2 className="text-foreground mt-16 font-serif text-2xl font-normal sm:text-3xl">
          {m['landing.models.title']()}
        </h2>
        <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-relaxed">
          {m['landing.models.description']()}
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {AI_MODELS.map((model) => (
            <Link
              key={model.id}
              href={model.href}
              className="border-border bg-card hover:border-primary/40 group overflow-hidden rounded-2xl border shadow-xs transition-[border-color,transform] hover:-translate-y-0.5"
            >
              <span className="bg-muted block aspect-video overflow-hidden">
                <img
                  src={model.coverImage}
                  alt={model.name}
                  width={1672}
                  height={941}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                />
              </span>
              <span className="block p-4">
                <span className="flex items-center gap-1.5">
                  <span className="text-foreground block text-sm font-semibold">
                    {model.name}
                  </span>
                  <ArrowUpRight className="text-muted-foreground group-hover:text-primary size-3.5 transition-colors" />
                </span>
                <span className="text-muted-foreground mt-1.5 block text-xs leading-relaxed">
                  {tDynamic(`config.ai_models.${model.id}.description`)}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

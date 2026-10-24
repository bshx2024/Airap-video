'use client';

import {
  ArrowUpRight,
  Eraser,
  Expand,
  Maximize2,
  Palette,
  type LucideIcon,
} from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { Link } from '@/core/i18n/navigation';
import {
  getToolPageSlugs,
  getToolShowcaseItems,
  TOOL_PAGES,
} from '@/config/tools';
import { m } from '@/paraglide/messages.js';

const TOOL_ICONS: Record<string, LucideIcon> = {
  'background-remover': Eraser,
  'image-upscaler': Maximize2,
  'image-expand': Expand,
  'transform-style': Palette,
};

export function ToolsIndexPage() {
  const tools = getToolPageSlugs().map((slug) => TOOL_PAGES[slug]);

  return (
    <div className="w-full px-4 py-14 sm:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="text-foreground text-center font-serif text-3xl font-normal sm:text-4xl">
          {m['landing.tools.index_title']()}
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed">
          {m['landing.tools.index_description']()}
        </p>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {tools.map((tool) => {
            const showcase = getToolShowcaseItems(tool.slug)[0];
            const Icon = TOOL_ICONS[tool.slug] || Palette;
            return (
              <Link
                key={tool.slug}
                href={`/tools/${tool.slug}`}
                className="border-border bg-card hover:border-primary/40 group flex flex-col overflow-hidden rounded-2xl border transition-colors"
              >
                {showcase && (
                  <div className="bg-muted relative grid aspect-[8/5] w-full grid-cols-2 overflow-hidden">
                    <img
                      src={showcase.before}
                      alt=""
                      width={600}
                      height={500}
                      loading="lazy"
                      decoding="async"
                      className="size-full min-w-0 object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                    />
                    <img
                      src={showcase.after}
                      alt=""
                      width={600}
                      height={500}
                      loading="lazy"
                      decoding="async"
                      className="size-full min-w-0 object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                    />
                    <span className="bg-border/80 absolute inset-y-0 left-1/2 w-px -translate-x-1/2" />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center gap-2">
                    <Icon className="text-primary size-4" aria-hidden />
                    <span className="text-foreground font-medium">
                      {tDynamic(`landing.tools.items.${tool.slug}.title`)}
                    </span>
                    <ArrowUpRight className="text-muted-foreground group-hover:text-primary size-4 transition-colors" />
                  </div>
                  <p className="text-muted-foreground mt-2 flex-1 text-sm leading-relaxed">
                    {tDynamic(`landing.tools.items.${tool.slug}.description`)}
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

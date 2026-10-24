'use client';

import { tDynamic } from '@/core/i18n/dynamic';
import type { ToolShowcaseItem } from '@/config/tools';
import { m } from '@/paraglide/messages.js';

export function ToolExampleCards({
  slug,
  items,
  onSelect,
}: {
  slug: string;
  items: ToolShowcaseItem[];
  onSelect: (item: ToolShowcaseItem) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {items.map((item) => {
        const title = tDynamic(
          `landing.tools.pages.${slug}.showcase.${item.id}.title`,
          item.id
        );
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            title={item.prompt || title}
            className="group cursor-pointer text-left"
          >
            <span className="border-border bg-muted group-hover:border-primary/40 grid aspect-[16/9] grid-cols-2 overflow-hidden rounded-xl border transition-[border-color,box-shadow] group-hover:shadow-md">
              <span className="relative min-w-0 overflow-hidden">
                <img
                  src={item.before}
                  alt={`${title} — ${m['landing.tools.generator.before']()}`}
                  width={800}
                  height={450}
                  loading="lazy"
                  className="size-full object-cover"
                />
                <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                  {m['landing.tools.generator.before']()}
                </span>
              </span>
              <span className="relative min-w-0 overflow-hidden border-l border-white/10">
                <img
                  src={item.after}
                  alt={`${title} — ${m['landing.tools.generator.after']()}`}
                  width={800}
                  height={450}
                  loading="lazy"
                  className="size-full object-cover"
                />
                <span className="absolute right-2 bottom-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                  {m['landing.tools.generator.after']()}
                </span>
              </span>
            </span>
            <span className="text-muted-foreground group-hover:text-foreground mt-2 block truncate text-sm transition-colors">
              {title}
            </span>
          </button>
        );
      })}
    </div>
  );
}

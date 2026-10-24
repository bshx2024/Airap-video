'use client';

import { tDynamic } from '@/core/i18n/dynamic';
import type { ModelShowcaseItem } from '@/config/model-pages';

function showcaseTitle(id: string): string {
  const keys = [
    `landing.examples.items.${id}.title`,
    `landing.quick_prompts.${id}.title`,
    `landing.text_to_image.quickstart.${id}.title`,
    `landing.image_to_image.quickstart.${id}.title`,
    `landing.edit_examples.${id}.title`,
    `landing.models.showcase.${id}.title`,
  ];
  for (const key of keys) {
    const label = tDynamic(key, '');
    if (label && label !== key) return label;
  }
  return id;
}

function ShowcaseCard({
  item,
  onUse,
}: {
  item: ModelShowcaseItem;
  onUse: (prompt: string) => void;
}) {
  const title = showcaseTitle(item.id);

  return (
    <button
      type="button"
      title={item.prompt}
      onClick={() => onUse(item.prompt)}
      className="group border-border bg-card focus-visible:ring-ring relative block w-full cursor-pointer overflow-hidden rounded-2xl border text-left focus-visible:ring-2 focus-visible:outline-none"
    >
      <img
        src={item.image}
        alt={title}
        width={item.width}
        height={item.height}
        loading="lazy"
        className="h-auto w-full object-cover"
      />
      <span className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
        <span className="text-sm font-medium text-white">{title}</span>
        <span className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-white/75">
          {item.prompt}
        </span>
      </span>
    </button>
  );
}

function columnsOf<T>(items: T[], count: number): T[][] {
  return Array.from({ length: count }, (_, col) =>
    items.filter((_, index) => index % count === col)
  );
}

export function ModelShowcase({
  title,
  description,
  items,
  onUsePrompt,
}: {
  title: string;
  description: string;
  items: ModelShowcaseItem[];
  onUsePrompt: (prompt: string) => void;
}) {
  if (items.length === 0) return null;

  const two = columnsOf(items, 2);
  const three = columnsOf(items, 3);

  return (
    <section id="showcase" className="scroll-mt-20 px-4 py-16">
      <div className="mx-auto w-full max-w-6xl">
        <h2 className="text-foreground text-center font-serif text-2xl font-normal sm:text-3xl">
          {title}
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed">
          {description}
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row lg:hidden">
          {two.map((col, colIndex) => (
            <div key={colIndex} className="flex flex-1 flex-col gap-4">
              {col.map((item) => (
                <ShowcaseCard key={item.id} item={item} onUse={onUsePrompt} />
              ))}
            </div>
          ))}
        </div>

        <div className="mt-10 hidden gap-4 lg:flex">
          {three.map((col, colIndex) => (
            <div key={colIndex} className="flex flex-1 flex-col gap-4">
              {col.map((item) => (
                <ShowcaseCard key={item.id} item={item} onUse={onUsePrompt} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

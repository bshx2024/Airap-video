import { useState } from 'react';
import { ImagePlus, Wand2, X } from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { useRouter } from '@/core/i18n/navigation';
import { PROMPT_MODEL_TAGS } from '@/config/feature-pages';
import {
  EXAMPLE_LAYOUT,
  EXAMPLES,
  type ExampleItem,
} from '@/config/landing-data';
import { saveGeneratorDraft } from '@/modules/generator-draft';
import { m } from '@/paraglide/messages.js';

function layoutItems(indices: number[]) {
  return indices
    .map((i) => EXAMPLES[i])
    .filter((item): item is ExampleItem => Boolean(item));
}

export function PromptsPage() {
  const router = useRouter();
  const [selectedExample, setSelectedExample] = useState<ExampleItem | null>(
    null
  );

  const handleUsePrompt = (prompt: string) => {
    saveGeneratorDraft({ prompt, tab: 'text' });
    setSelectedExample(null);
    router.push('/text-to-image');
  };

  const handleUseReference = (image: string, prompt: string) => {
    saveGeneratorDraft({ prompt, image, tab: 'image' });
    setSelectedExample(null);
    router.push('/image-to-image');
  };

  const renderCard = (item: ExampleItem, idx: number) => {
    const modelTag = PROMPT_MODEL_TAGS[item.id] || 'Nano Banana Pro';
    return (
      <button
        key={`${item.id}-${idx}`}
        type="button"
        onClick={() => setSelectedExample(item)}
        className="group border-border bg-card focus-visible:ring-ring hover:border-primary/40 relative block cursor-pointer overflow-hidden rounded-2xl border text-left transition-all duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:outline-none"
      >
        <img
          src={item.image}
          alt={tDynamic(`landing.examples.items.${item.id}.title`)}
          width={item.width}
          height={item.height}
          loading={idx < 4 ? 'eager' : 'lazy'}
          className="h-auto w-full object-cover"
        />
        <span className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
          <span className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">
              {tDynamic(`landing.examples.items.${item.id}.title`)}
            </span>
            <span className="rounded-full border border-white/30 px-2 py-0.5 text-[10px] text-white/80">
              {modelTag}
            </span>
          </span>
          <span className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-white/75">
            {item.prompt}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div className="w-full px-4 py-16">
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="text-foreground text-center font-serif text-3xl font-normal sm:text-4xl">
          {m['landing.prompts.title']()}
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed">
          {m['landing.prompts.description']()}
        </p>

        <div className="mt-12 flex flex-col gap-4 sm:flex-row lg:hidden">
          {EXAMPLE_LAYOUT.twoCol.map((col, colIdx) => (
            <div key={colIdx} className="flex flex-1 flex-col gap-4">
              {layoutItems(col).map((item, i) => renderCard(item, i))}
            </div>
          ))}
        </div>

        <div className="mt-12 hidden gap-4 lg:flex">
          {EXAMPLE_LAYOUT.threeCol.map((col, colIdx) => (
            <div key={colIdx} className="flex flex-1 flex-col gap-4">
              {layoutItems(col).map((item, i) => renderCard(item, i))}
            </div>
          ))}
        </div>
      </div>

      {selectedExample && (
        <div
          className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs duration-200"
          onClick={() => setSelectedExample(null)}
        >
          <div
            className="border-border bg-card animate-in zoom-in-95 relative max-h-[90dvh] w-full max-w-3xl overflow-hidden rounded-2xl border shadow-2xl duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-1 items-center md:grid-cols-2">
              <div className="bg-muted/70 flex h-full items-center justify-center p-3">
                <img
                  src={selectedExample.image}
                  alt={tDynamic(
                    `landing.examples.items.${selectedExample.id}.title`
                  )}
                  className="h-auto max-h-[75dvh] w-full rounded-xl object-contain shadow-xs"
                />
              </div>
              <div className="relative flex h-full flex-col justify-between p-6">
                <div>
                  <button
                    type="button"
                    onClick={() => setSelectedExample(null)}
                    className="text-muted-foreground hover:text-foreground absolute top-4 right-4 cursor-pointer rounded-md p-1 transition-colors"
                    aria-label={m['landing.examples.close']()}
                  >
                    <X className="size-4" />
                  </button>
                  <div className="flex items-center gap-2 pr-6">
                    <h3 className="text-foreground text-base font-semibold">
                      {tDynamic(
                        `landing.examples.items.${selectedExample.id}.title`
                      )}
                    </h3>
                    <span className="border-border text-muted-foreground rounded-full border px-2 py-0.5 text-[10px]">
                      {PROMPT_MODEL_TAGS[selectedExample.id] ||
                        'Nano Banana Pro'}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-4 text-xs font-medium tracking-wider uppercase">
                    {m['landing.examples.prompt']()}
                  </p>
                  <div className="text-foreground mt-2 max-h-[42dvh] overflow-y-auto pr-1 text-sm leading-relaxed select-text">
                    {selectedExample.prompt}
                  </div>
                </div>
                <div className="mt-8 flex flex-wrap items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleUsePrompt(selectedExample.prompt)}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg px-3.5 text-xs font-medium shadow transition-all active:translate-y-px"
                  >
                    <Wand2 className="size-3.5" />
                    {m['landing.examples.use_prompt']()}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleUseReference(
                        selectedExample.image,
                        selectedExample.prompt
                      )
                    }
                    className="border-border text-foreground hover:bg-muted inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3.5 text-xs font-medium transition-all active:translate-y-px"
                  >
                    <ImagePlus className="size-3.5" />
                    {m['landing.examples.use_reference']()}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { Download, Sliders, Upload } from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';

const STEP_ICONS = [Upload, Sliders, Download];

export function ToolHowItWorks({
  slug,
  title,
  description,
  stepKeys,
}: {
  slug: string;
  title: string;
  description: string;
  stepKeys: string[];
}) {
  if (stepKeys.length === 0) return null;

  return (
    <section id="how-it-works" className="scroll-mt-20 px-4 py-16">
      <div className="mx-auto w-full max-w-5xl">
        <h2 className="text-foreground text-center font-serif text-2xl font-normal sm:text-3xl">
          {title}
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed">
          {description}
        </p>
        <ol className="mt-10 grid gap-6 sm:grid-cols-3">
          {stepKeys.map((key, index) => {
            const Icon = STEP_ICONS[index % STEP_ICONS.length];
            return (
              <li
                key={key}
                className="border-border bg-card rounded-2xl border p-5"
              >
                <div className="flex items-center justify-between">
                  <Icon className="text-primary size-5" />
                  <span className="text-muted-foreground text-xs tabular-nums">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="text-foreground mt-4 text-sm font-medium">
                  {tDynamic(`landing.tools.pages.${slug}.steps.${key}.title`)}
                </h3>
                <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                  {tDynamic(
                    `landing.tools.pages.${slug}.steps.${key}.description`
                  )}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

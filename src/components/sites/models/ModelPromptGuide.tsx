import { tDynamic } from '@/core/i18n/dynamic';

export function ModelPromptGuide({
  slug,
  title,
  description,
  tipKeys,
  accentColor,
}: {
  slug: string;
  title: string;
  description: string;
  tipKeys: string[];
  accentColor: string;
}) {
  if (tipKeys.length === 0) return null;

  return (
    <section className="px-4 py-16">
      <div
        className="border-border mx-auto grid w-full max-w-6xl overflow-hidden rounded-[2rem] border lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
        style={{
          background: `linear-gradient(135deg, ${accentColor}14, transparent 48%)`,
        }}
      >
        <div className="border-border p-6 sm:p-8 lg:border-r lg:p-10">
          <h2 className="text-foreground font-serif text-2xl font-normal sm:text-3xl">
            {title}
          </h2>
          <p className="text-muted-foreground mt-4 text-sm leading-7">
            {description}
          </p>
        </div>
        <ol className="bg-background/60 divide-border divide-y">
          {tipKeys.map((key, index) => (
            <li key={key} className="flex gap-4 p-6 sm:p-8">
              <span
                aria-hidden
                className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                style={{
                  color: accentColor,
                  background: `${accentColor}15`,
                }}
              >
                {index + 1}
              </span>
              <div>
                <h3 className="text-foreground text-sm font-semibold">
                  {tDynamic(`landing.models.pages.${slug}.tips.${key}.title`)}
                </h3>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  {tDynamic(
                    `landing.models.pages.${slug}.tips.${key}.description`
                  )}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

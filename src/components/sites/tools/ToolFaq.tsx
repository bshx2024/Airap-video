import { tDynamic } from '@/core/i18n/dynamic';

export function ToolFaq({
  slug,
  title,
  description,
  faqKeys,
}: {
  slug: string;
  title: string;
  description: string;
  faqKeys: string[];
}) {
  if (faqKeys.length === 0) return null;

  return (
    <section id="faq" className="scroll-mt-20 px-4 py-16">
      <div className="mx-auto w-full max-w-5xl">
        <h2 className="text-foreground text-center font-serif text-2xl font-normal sm:text-3xl">
          {title}
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed">
          {description}
        </p>
        <ol className="mt-12 grid gap-x-12 gap-y-9 md:grid-cols-2">
          {faqKeys.map((key, index) => (
            <li key={key} className="flex gap-3">
              <span
                aria-hidden
                className="border-border text-muted-foreground mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border text-xs tabular-nums"
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <h3 className="text-foreground font-medium">
                  {tDynamic(`landing.tools.pages.${slug}.faqs.${key}.question`)}
                </h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {tDynamic(`landing.tools.pages.${slug}.faqs.${key}.answer`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

import { ArrowUpRight } from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { Link } from '@/core/i18n/navigation';
import { getToolShowcaseItems, type ToolPageConfig } from '@/config/tools';
import { m } from '@/paraglide/messages.js';

export function ToolOtherTools({ tools }: { tools: ToolPageConfig[] }) {
  if (tools.length === 0) return null;

  return (
    <section className="px-4 py-16">
      <div className="mx-auto w-full max-w-5xl">
        <h2 className="text-foreground text-center font-serif text-2xl font-normal sm:text-3xl">
          {m['landing.tools.other_title']()}
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed">
          {m['landing.tools.other_description']()}
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((other) => {
            const showcase = getToolShowcaseItems(other.slug)[0];
            return (
              <Link
                key={other.slug}
                href={`/tools/${other.slug}`}
                className="border-border bg-card hover:border-primary/40 group flex flex-col overflow-hidden rounded-2xl border transition-colors"
              >
                {showcase && (
                  <div className="bg-muted aspect-[8/5] w-full overflow-hidden">
                    <div className="bg-border grid size-full grid-cols-2 gap-px">
                      <img
                        src={showcase.before}
                        alt=""
                        width={400}
                        height={250}
                        loading="lazy"
                        className="size-full min-w-0 object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                      <img
                        src={showcase.after}
                        alt=""
                        width={400}
                        height={250}
                        loading="lazy"
                        className="size-full min-w-0 object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </div>
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-medium">
                      {tDynamic(`landing.tools.items.${other.slug}.title`)}
                    </span>
                    <ArrowUpRight className="text-muted-foreground group-hover:text-primary size-4 transition-colors" />
                  </div>
                  <p className="text-muted-foreground mt-2 flex-1 text-sm leading-relaxed">
                    {tDynamic(`landing.tools.items.${other.slug}.description`)}
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

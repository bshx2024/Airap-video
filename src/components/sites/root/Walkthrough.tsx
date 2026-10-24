import { tDynamic } from '@/core/i18n/dynamic';
import { WALKTHROUGH } from '@/config/landing-data';
import { m } from '@/paraglide/messages.js';

export function Walkthrough() {
  return (
    <section className="px-4 py-16">
      <div className="mx-auto w-full max-w-6xl">
        <h2 className="text-foreground text-center font-serif text-2xl font-normal sm:text-3xl">
          {m['landing.walkthrough.title']()}
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed">
          {m['landing.walkthrough.description']()}
        </p>

        <div className="mt-12 space-y-16 sm:mt-16 sm:space-y-24">
          {WALKTHROUGH.map((item) => (
            <div
              key={item.id}
              className="grid items-center gap-8 md:grid-cols-2 md:gap-14"
            >
              <img
                src={item.image}
                alt={tDynamic(`landing.walkthrough.items.${item.id}.alt`)}
                width={940}
                height={627}
                loading="lazy"
                className={`border-border bg-muted w-full rounded-2xl border object-cover shadow-sm ${
                  item.reverse ? 'md:order-2' : ''
                }`}
              />
              <div className={item.reverse ? 'md:order-1' : undefined}>
                <h3 className="text-foreground font-serif text-xl font-normal sm:text-2xl">
                  {tDynamic(`landing.walkthrough.items.${item.id}.title`)}
                </h3>
                <p className="text-muted-foreground mt-4 text-sm leading-relaxed sm:text-base">
                  {tDynamic(`landing.walkthrough.items.${item.id}.description`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

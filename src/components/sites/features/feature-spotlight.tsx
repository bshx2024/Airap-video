import { tDynamic } from '@/core/i18n/dynamic';
import type { SpotlightItem } from '@/config/feature-pages';

export function FeatureSpotlightList({
  title,
  description,
  items,
  messageNs,
}: {
  title: string;
  description: string;
  items: SpotlightItem[];
  messageNs: string;
}) {
  return (
    <section className="px-4 py-16">
      <div className="mx-auto w-full max-w-6xl">
        <h2 className="text-foreground text-center font-serif text-2xl font-normal sm:text-3xl">
          {title}
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed">
          {description}
        </p>
        <div className="mt-12 space-y-16 sm:mt-16 sm:space-y-24">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid items-center gap-8 md:grid-cols-2 md:gap-14"
            >
              <SpotlightMedia item={item} />
              <div className={item.reverse ? 'md:order-1' : undefined}>
                <h3 className="text-foreground font-serif text-xl font-normal sm:text-2xl">
                  {tDynamic(`${messageNs}.${item.id}.title`)}
                </h3>
                <p className="text-muted-foreground mt-4 text-sm leading-relaxed sm:text-base">
                  {tDynamic(`${messageNs}.${item.id}.description`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SpotlightMedia({ item }: { item: SpotlightItem }) {
  const reverseClass = item.reverse ? 'md:order-2' : '';
  if (item.collage === 'split' && item.images?.length === 2) {
    return (
      <div
        className={`border-border bg-muted grid aspect-[3/2] grid-cols-2 gap-px overflow-hidden rounded-2xl border ${reverseClass}`}
      >
        {item.images.map((src) => (
          <img key={src} src={src} alt="" className="size-full object-cover" />
        ))}
      </div>
    );
  }
  if (item.collage === 'triple' && item.images?.length === 3) {
    return (
      <div
        className={`border-border bg-muted/50 grid aspect-[3/2] grid-cols-3 gap-3 overflow-hidden rounded-2xl border p-3 sm:gap-4 sm:p-4 ${reverseClass}`}
      >
        {item.images.map((src, index) => (
          <div
            key={src}
            className={`min-h-0 overflow-hidden rounded-xl ${
              index === 1 ? 'translate-y-4' : ''
            }`}
          >
            <img src={src} alt="" className="size-full object-cover" />
          </div>
        ))}
      </div>
    );
  }
  if (item.collage === 'grid' && item.images?.length === 3) {
    return (
      <div
        className={`border-border bg-muted/50 grid aspect-[3/2] grid-cols-[1fr_0.72fr] gap-3 overflow-hidden rounded-2xl border p-3 sm:gap-4 sm:p-4 ${reverseClass}`}
      >
        <div className="min-h-0 overflow-hidden rounded-xl">
          <img src={item.images[0]} alt="" className="size-full object-cover" />
        </div>
        <div className="grid min-h-0 grid-rows-[0.72fr_1fr] gap-3 sm:gap-4">
          <div className="min-h-0 overflow-hidden rounded-xl">
            <img
              src={item.images[1]}
              alt=""
              className="size-full object-cover"
            />
          </div>
          <div className="min-h-0 overflow-hidden rounded-xl">
            <img
              src={item.images[2]}
              alt=""
              className="size-full object-cover object-top"
            />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div
      className={`border-border bg-muted aspect-[3/2] overflow-hidden rounded-2xl border ${reverseClass}`}
    >
      {item.image ? (
        <img src={item.image} alt="" className="size-full object-cover" />
      ) : null}
    </div>
  );
}

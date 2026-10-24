import { tDynamic } from '@/core/i18n/dynamic';
import { Link } from '@/core/i18n/navigation';
import type { StyleItem } from '@/config/styles';
import { m } from '@/paraglide/messages.js';

export function StyleCard({
  item,
  onUse,
}: {
  item: StyleItem;
  onUse: (item: StyleItem) => void;
}) {
  const title = tDynamic(`landing.styles.items.${item.slug}.title`);

  return (
    <article className="border-border bg-card flex min-w-0 flex-col overflow-hidden rounded-2xl border">
      <Link
        href={`/styles/${item.slug}`}
        className="bg-muted group relative block aspect-square cursor-pointer overflow-hidden text-left"
      >
        <img
          src={item.image}
          alt={title}
          width={item.width}
          height={item.height}
          loading="lazy"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
        />
        {item.isNew && (
          <span className="bg-primary text-primary-foreground absolute top-3 right-3 rounded-full px-2.5 py-1 text-xs font-medium">
            {m['landing.styles.badge.new']()}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link
          href={`/styles/${item.slug}`}
          className="text-foreground hover:text-primary cursor-pointer text-left font-medium transition-colors"
        >
          {title}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px]">
            {tDynamic(`landing.styles.type.${item.typeKey}`)}
          </span>
          <span className="text-muted-foreground text-[11px]">
            {item.ratio}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onUse(item)}
          className="border-border bg-background hover:bg-muted hover:text-foreground mt-4 inline-flex h-8 w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium transition-all"
        >
          {m['landing.styles.use']()}
        </button>
      </div>
    </article>
  );
}

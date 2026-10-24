import { CreditCard, Sparkles } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';

export function ModelCta({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="px-4 py-16">
      <div className="border-border bg-card mx-auto w-full max-w-5xl rounded-[2rem] border px-6 py-12 text-center shadow-sm sm:py-14">
        <h2 className="text-foreground font-serif text-3xl font-normal tracking-[-0.01em] sm:text-4xl">
          {title}
        </h2>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm leading-relaxed sm:text-base">
          {description}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/#generator"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-colors"
          >
            <Sparkles className="size-4" />
            {m['landing.models.cta_start']()}
          </Link>
          <Link
            href="/pricing"
            className="border-border bg-background hover:bg-muted inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-medium transition-colors"
          >
            <CreditCard className="size-4" />
            {m['landing.models.cta_pricing']()}
          </Link>
        </div>
      </div>
    </section>
  );
}

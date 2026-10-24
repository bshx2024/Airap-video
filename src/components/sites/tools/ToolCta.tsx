import { LayoutGrid, Sparkles } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { buttonVariants } from '@/components/ui/button';

export function ToolCta({
  title,
  description,
  buttonLabel,
}: {
  title: string;
  description: string;
  buttonLabel: string;
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
            className={cn(buttonVariants({ size: 'lg' }), 'gap-2')}
          >
            <Sparkles className="size-4" />
            {buttonLabel}
          </Link>
          <Link
            href="/tools"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'gap-2'
            )}
          >
            <LayoutGrid className="size-4" />
            {m['landing.tools.cta_view_all']()}
          </Link>
        </div>
      </div>
    </section>
  );
}

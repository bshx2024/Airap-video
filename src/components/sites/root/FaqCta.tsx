import { Images, Sparkles } from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { Link } from '@/core/i18n/navigation';
import { FAQS, type FaqItem } from '@/config/landing-data';
import { m } from '@/paraglide/messages.js';

export function LandingFaq({
  items = FAQS,
  messageNs = 'landing.home.faq',
  title,
  description,
}: {
  items?: FaqItem[];
  messageNs?: string;
  title?: string;
  description?: string;
}) {
  return (
    <section id="faq" className="scroll-mt-20 px-4 py-16">
      <div className="mx-auto w-full max-w-5xl">
        <h2 className="text-foreground text-center font-serif text-2xl font-normal sm:text-3xl">
          {title || m['landing.faq.title']()}
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed">
          {description || m['landing.faq.description']()}
        </p>

        <ol className="mt-12 grid list-none gap-x-12 gap-y-9 p-0 md:grid-cols-2">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3">
              <span
                aria-hidden="true"
                className="border-border text-muted-foreground mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border text-xs font-medium tabular-nums"
              >
                {item.id}
              </span>
              <div className="min-w-0">
                <h3 className="text-foreground text-base font-medium">
                  {tDynamic(`${messageNs}.faq_${item.id}.question`)}
                </h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {tDynamic(`${messageNs}.faq_${item.id}.answer`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function LandingCta({
  headline,
  subheadline,
  generateLabel,
}: {
  headline?: string;
  subheadline?: string;
  generateLabel?: string;
} = {}) {
  return (
    <section className="px-4 py-16">
      <div className="border-border bg-card mx-auto w-full max-w-5xl rounded-[2rem] border px-6 py-12 text-center shadow-sm sm:py-14">
        <h2 className="text-foreground font-serif text-3xl font-normal tracking-[-0.01em] sm:text-4xl">
          {headline || m['landing.cta.headline']()}
        </h2>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm leading-relaxed sm:text-base">
          {subheadline || m['landing.cta.subheadline']()}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/#generator"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium shadow transition-all active:translate-y-px"
          >
            <Sparkles className="size-4" />
            {generateLabel || m['landing.cta.generate']()}
          </Link>
          <Link
            href="/#showcase"
            className="border-border bg-background hover:bg-muted text-foreground inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition-all active:translate-y-px"
          >
            <Images className="size-4" />
            {m['landing.cta.examples']()}
          </Link>
        </div>
      </div>
    </section>
  );
}

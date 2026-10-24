import { createFileRoute } from '@tanstack/react-router';

import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Pricing } from '@/blocks/pricing';
import { VideoFooter } from '@/components/sites/video-lite/VideoFooter';
import { VideoHeader } from '@/components/sites/video-lite/VideoHeader';

export const Route = createFileRoute('/pricing')({
  loader: () => {
    const locale = getLocale();
    return {
      title: m['landing.pricing.title']({}, { locale }),
      description: m['landing.pricing.description']({}, { locale }),
    };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: loaderData.title },
          { name: 'description', content: loaderData.description },
        ]
      : [],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col transition-colors dark:bg-[#020617]">
      <VideoHeader />
      <main className="flex-1 pt-16">
        <Pricing />
      </main>
      <VideoFooter />
    </div>
  );
}

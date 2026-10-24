import { createFileRoute } from '@tanstack/react-router';

import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { SupportWidget } from '@/blocks/support-widget';
import { TextToImagePage } from '@/components/sites/features/TextToImagePage';

export const Route = createFileRoute('/text-to-image')({
  loader: () => {
    const locale = getLocale();
    return {
      title: m['landing.t2i.title']({}, { locale }),
      description: m['landing.t2i.description']({}, { locale }),
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
  component: TextToImageRoute,
});

function TextToImageRoute() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col antialiased">
      <Header />
      <main className="flex-1">
        <TextToImagePage />
      </main>
      <Footer />
      <SupportWidget />
    </div>
  );
}

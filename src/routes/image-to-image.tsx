import { createFileRoute } from '@tanstack/react-router';

import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { SupportWidget } from '@/blocks/support-widget';
import { ImageToImagePage } from '@/components/sites/features/ImageToImagePage';

export const Route = createFileRoute('/image-to-image')({
  loader: () => {
    const locale = getLocale();
    return {
      title: m['landing.i2i.title']({}, { locale }),
      description: m['landing.i2i.description']({}, { locale }),
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
  component: ImageToImageRoute,
});

function ImageToImageRoute() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col antialiased">
      <Header />
      <main className="flex-1">
        <ImageToImagePage />
      </main>
      <Footer />
      <SupportWidget />
    </div>
  );
}

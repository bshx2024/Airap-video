import { createFileRoute } from '@tanstack/react-router';

import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { SupportWidget } from '@/blocks/support-widget';
import { ModelsIndexPage } from '@/components/sites/models/ModelsIndexPage';

export const Route = createFileRoute('/models/')({
  loader: () => {
    const locale = getLocale();
    return {
      title: m['landing.models.meta_title']({}, { locale }),
      description: m['landing.models.meta_description']({}, { locale }),
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
  component: ModelsIndexRoute,
});

function ModelsIndexRoute() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col antialiased">
      <Header />
      <main className="flex-1">
        <ModelsIndexPage />
      </main>
      <Footer />
      <SupportWidget />
    </div>
  );
}

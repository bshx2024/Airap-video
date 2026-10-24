import { createFileRoute } from '@tanstack/react-router';

import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { SupportWidget } from '@/blocks/support-widget';
import { TemplatesPage } from '@/components/sites/templates/TemplatesPage';

export const Route = createFileRoute('/templates/')({
  loader: () => {
    const locale = getLocale();
    return {
      title: m['landing.templates.meta_title']({}, { locale }),
      description: m['landing.templates.meta_description']({}, { locale }),
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
  component: TemplatesRoute,
});

function TemplatesRoute() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col antialiased">
      <Header />
      <main className="flex-1">
        <TemplatesPage />
      </main>
      <Footer />
      <SupportWidget />
    </div>
  );
}

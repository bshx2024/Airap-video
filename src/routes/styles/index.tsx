import { createFileRoute } from '@tanstack/react-router';

import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { SupportWidget } from '@/blocks/support-widget';
import { StylesPage } from '@/components/sites/styles/StylesPage';

export const Route = createFileRoute('/styles/')({
  loader: () => {
    const locale = getLocale();
    return {
      title: m['landing.styles.meta_title']({}, { locale }),
      description: m['landing.styles.meta_description']({}, { locale }),
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
  component: StylesRoute,
});

function StylesRoute() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col antialiased">
      <Header />
      <main className="flex-1">
        <StylesPage />
      </main>
      <Footer />
      <SupportWidget />
    </div>
  );
}

import { createFileRoute } from '@tanstack/react-router';

import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { SupportWidget } from '@/blocks/support-widget';
import { ToolsIndexPage } from '@/components/sites/tools/ToolsIndexPage';

export const Route = createFileRoute('/tools/')({
  loader: () => {
    const locale = getLocale();
    return {
      title: m['landing.tools.index_meta_title']({}, { locale }),
      description: m['landing.tools.index_meta_description']({}, { locale }),
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
  component: ToolsIndexRoute,
});

function ToolsIndexRoute() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col antialiased">
      <Header />
      <main className="flex-1">
        <ToolsIndexPage />
      </main>
      <Footer />
      <SupportWidget />
    </div>
  );
}

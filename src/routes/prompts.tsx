import { createFileRoute } from '@tanstack/react-router';

import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { SupportWidget } from '@/blocks/support-widget';
import { PromptsPage } from '@/components/sites/features/PromptsPage';

export const Route = createFileRoute('/prompts')({
  loader: () => {
    const locale = getLocale();
    return {
      title: m['landing.prompts.title']({}, { locale }),
      description: m['landing.prompts.description']({}, { locale }),
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
  component: PromptsRoute,
});

function PromptsRoute() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col antialiased">
      <Header />
      <main className="flex-1">
        <PromptsPage />
      </main>
      <Footer />
      <SupportWidget />
    </div>
  );
}

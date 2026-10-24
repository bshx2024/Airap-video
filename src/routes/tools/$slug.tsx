import { createFileRoute, notFound } from '@tanstack/react-router';

import { tDynamic } from '@/core/i18n/dynamic';
import { getToolPage } from '@/config/tools';
import { getLocale } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { SupportWidget } from '@/blocks/support-widget';
import { ToolDetailPage } from '@/components/sites/tools/ToolDetailPage';

export const Route = createFileRoute('/tools/$slug')({
  loader: ({ params }) => {
    const tool = getToolPage(params.slug);
    if (!tool) throw notFound();
    const locale = getLocale();
    const ns = `landing.tools.pages.${tool.slug}`;
    return {
      tool,
      title: tDynamic(`${ns}.meta_title`),
      description: tDynamic(`${ns}.meta_description`),
      locale,
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
  component: ToolDetailRoute,
});

function ToolDetailRoute() {
  const { tool } = Route.useLoaderData();

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col antialiased">
      <Header />
      <main className="flex-1">
        <ToolDetailPage tool={tool} />
      </main>
      <Footer />
      <SupportWidget />
    </div>
  );
}

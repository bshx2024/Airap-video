import { createFileRoute, notFound } from '@tanstack/react-router';

import { tDynamic } from '@/core/i18n/dynamic';
import { getImageModelById } from '@/config/ai-models';
import { getModelPage } from '@/config/model-pages';
import { getLocale } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { SupportWidget } from '@/blocks/support-widget';
import { ModelDetailPage } from '@/components/sites/models/ModelDetailPage';

export const Route = createFileRoute('/models/$slug')({
  loader: ({ params }) => {
    const model = getModelPage(params.slug);
    if (!model) throw notFound();
    const locale = getLocale();
    const catalog = getImageModelById(model.slug);
    const name = catalog?.name || model.slug;
    const ns = `landing.models.pages.${model.slug}`;
    return {
      model,
      title: tDynamic(`${ns}.meta_title`, `${name} Video Lite`),
      description: tDynamic(
        `${ns}.meta_description`,
        tDynamic(`${ns}.hero_desc`, '')
      ),
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
  component: ModelDetailRoute,
});

function ModelDetailRoute() {
  const { model } = Route.useLoaderData();

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col antialiased">
      <Header />
      <main className="flex-1">
        <ModelDetailPage model={model} />
      </main>
      <Footer />
      <SupportWidget />
    </div>
  );
}

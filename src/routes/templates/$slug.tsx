import { createFileRoute, notFound } from '@tanstack/react-router';

import { tDynamic } from '@/core/i18n/dynamic';
import { envConfigs } from '@/config';
import { getRelatedTemplates, getTemplateBySlug } from '@/config/templates';
import { getPublicSiteMetaFn } from '@/modules/config/server';
import { m } from '@/paraglide/messages.js';
import { getLocale, localizeUrl } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { SupportWidget } from '@/blocks/support-widget';
import { TemplateDetailPage } from '@/components/sites/templates/TemplateDetailPage';

export const Route = createFileRoute('/templates/$slug')({
  loader: async ({ params }) => {
    const template = getTemplateBySlug(params.slug);
    if (!template) throw notFound();
    const relatedTemplates = getRelatedTemplates(params.slug, 4);
    const locale = getLocale();
    const site = await getPublicSiteMetaFn();
    const appUrl = (site.appUrl || envConfigs.app_url).replace(/\/$/, '');
    const title = tDynamic(`landing.templates.items.${template.slug}.title`);
    const description = tDynamic(
      `landing.templates.items.${template.slug}.description`,
      template.prompt
    );
    const suffix = m['landing.templates.detail.meta_suffix']({}, { locale });
    const image = template.image.startsWith('http')
      ? template.image
      : `${appUrl}${template.image}`;
    const url = localizeUrl(`${appUrl}/templates/${template.slug}`, {
      locale: locale as any,
    }).href;
    return {
      template,
      relatedTemplates,
      title: `${title}${suffix}`,
      description,
      image,
      url,
      locale,
    };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: loaderData.title },
          { name: 'description', content: loaderData.description },
          { property: 'og:title', content: loaderData.title },
          { property: 'og:description', content: loaderData.description },
          { property: 'og:image', content: loaderData.image },
          { property: 'og:url', content: loaderData.url },
        ]
      : [],
  }),
  component: TemplateDetailRoute,
});

function TemplateDetailRoute() {
  const { template, relatedTemplates } = Route.useLoaderData();

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col antialiased">
      <Header />
      <main className="flex-1">
        <TemplateDetailPage
          template={template}
          relatedTemplates={relatedTemplates}
        />
      </main>
      <Footer />
      <SupportWidget />
    </div>
  );
}

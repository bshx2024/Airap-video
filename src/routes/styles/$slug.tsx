import { createFileRoute, notFound } from '@tanstack/react-router';

import { tDynamic } from '@/core/i18n/dynamic';
import { envConfigs } from '@/config';
import { getRelatedStyles, getStyleBySlug } from '@/config/styles';
import { getPublicSiteMetaFn } from '@/modules/config/server';
import { m } from '@/paraglide/messages.js';
import { getLocale, localizeUrl } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { SupportWidget } from '@/blocks/support-widget';
import { StyleDetailPage } from '@/components/sites/styles/StyleDetailPage';

export const Route = createFileRoute('/styles/$slug')({
  loader: async ({ params }) => {
    const style = getStyleBySlug(params.slug);
    if (!style) throw notFound();
    const relatedStyles = getRelatedStyles(params.slug, 4);
    const locale = getLocale();
    const site = await getPublicSiteMetaFn();
    const appUrl = (site.appUrl || envConfigs.app_url).replace(/\/$/, '');
    const title = tDynamic(`landing.styles.items.${style.slug}.title`);
    const description = tDynamic(
      `landing.styles.items.${style.slug}.description`,
      style.prompt
    );
    const suffix = m['landing.styles.detail.meta_suffix']({}, { locale });
    const image = style.image.startsWith('http')
      ? style.image
      : `${appUrl}${style.image}`;
    const url = localizeUrl(`${appUrl}/styles/${style.slug}`, {
      locale: locale as any,
    }).href;
    return {
      style,
      relatedStyles,
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
  component: StyleDetailRoute,
});

function StyleDetailRoute() {
  const { style, relatedStyles } = Route.useLoaderData();

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col antialiased">
      <Header />
      <main className="flex-1">
        <StyleDetailPage style={style} relatedStyles={relatedStyles} />
      </main>
      <Footer />
      <SupportWidget />
    </div>
  );
}

import { createFileRoute } from '@tanstack/react-router';
import { Calendar } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { getPublicSiteMetaFn } from '@/modules/config/server';
import { m } from '@/paraglide/messages.js';
import { getLocale, locales, localizeUrl } from '@/paraglide/runtime.js';
import { VideoFooter } from '@/components/sites/video-lite/VideoFooter';
import { VideoHeader } from '@/components/sites/video-lite/VideoHeader';
import { formatPostDate } from '@/content/posts';
import { getBlogPostsFn } from '@/content/posts/server';

export const Route = createFileRoute('/blog/')({
  loader: async () => {
    const locale = getLocale();
    const [posts, site] = await Promise.all([
      getBlogPostsFn({ data: { locale } }),
      getPublicSiteMetaFn(),
    ]);
    return {
      locale,
      posts,
      appName: site.appName,
      appUrl: site.appUrl,
    };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale;
    const appName = loaderData?.appName || envConfigs.app_name;
    const appUrl = loaderData?.appUrl || envConfigs.app_url;
    const urlFor = (loc: string) =>
      localizeUrl(`${appUrl}/blog`, { locale: loc as any }).href;
    return {
      meta: [
        {
          title: `${m['blog.title']({}, { locale: locale as any })} | ${appName}`,
        },
        {
          name: 'description',
          content: m['blog.description']({}, { locale: locale as any }),
        },
      ],
      links: [
        { rel: 'canonical', href: urlFor(locale ?? 'en') },
        ...locales.map((loc) => ({
          rel: 'alternate',
          hrefLang: loc,
          href: urlFor(loc),
        })),
      ],
    };
  },
  component: BlogPage,
});

function BlogPage() {
  const { locale, posts } = Route.useLoaderData();

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col transition-colors dark:bg-[#060a13]">
      <VideoHeader />
      <main className="relative flex-1 overflow-hidden px-6 pt-24 pb-20 sm:pt-28 sm:pb-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.12),transparent_68%)]"
        />
        <div className="relative mx-auto max-w-6xl">
          <div className="mx-auto mb-16 max-w-2xl text-center sm:mb-20">
            <h1 className="font-serif text-4xl leading-[1.05] font-normal tracking-[-0.035em] text-balance text-slate-900 sm:text-5xl md:text-6xl dark:text-white">
              {m['blog.title']()}
            </h1>
            <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-base leading-7">
              {m['blog.description']()}
            </p>
          </div>
          {posts.length === 0 ? (
            <p className="text-muted-foreground text-center">
              {m['blog.no_posts']()}
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group border-border bg-card hover:border-foreground/20 relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_70px_rgba(0,0,0,0.24)]"
                >
                  {post.image && (
                    <img
                      src={post.image}
                      alt={post.title}
                      width={640}
                      height={360}
                      loading="lazy"
                      className="aspect-video w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.025]"
                    />
                  )}
                  <div className="text-foreground flex flex-1 flex-col gap-3 p-6">
                    <h3 className="font-serif text-xl leading-snug font-normal tracking-[-0.015em] group-hover:underline group-hover:underline-offset-4">
                      {post.title}
                    </h3>
                    <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">
                      {post.description}
                    </p>
                    <div className="text-muted-foreground mt-auto flex items-center gap-2 pt-2 text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="size-3.5" />
                        {formatPostDate(post.createdAt, locale)}
                      </span>
                      <span className="flex-1" />
                      {(post.authorName || post.authorImage) && (
                        <span className="inline-flex items-center gap-2">
                          {post.authorImage && (
                            <img
                              src={post.authorImage}
                              alt={post.authorName || ''}
                              width={20}
                              height={20}
                              loading="lazy"
                              className="size-5 rounded-full object-cover"
                            />
                          )}
                          {post.authorName}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <VideoFooter />
    </div>
  );
}

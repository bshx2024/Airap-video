import { createFileRoute, notFound } from '@tanstack/react-router';
import { MDXProvider } from '@mdx-js/react';
import { ArrowLeft, Calendar } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { getPublicSiteMetaFn } from '@/modules/config/server';
import { m } from '@/paraglide/messages.js';
import { getLocale, localizeUrl } from '@/paraglide/runtime.js';
import { MarkdownContent } from '@/components/markdown-content';
import { mdxComponents } from '@/components/mdx-components';
import { VideoFooter } from '@/components/sites/video-lite/VideoFooter';
import { VideoHeader } from '@/components/sites/video-lite/VideoHeader';
import { formatPostDate, loadLocalPost } from '@/content/posts';
import { getBlogPostFn } from '@/content/posts/server';

export const Route = createFileRoute('/blog/$slug')({
  loader: async ({ params }) => {
    const locale = getLocale();
    const [post, site] = await Promise.all([
      getBlogPostFn({
        data: { slug: params.slug, locale },
      }),
      getPublicSiteMetaFn(),
    ]);
    if (!post) throw notFound();
    return {
      locale,
      post,
      appName: site.appName,
      appUrl: site.appUrl,
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { locale, post, appName, appUrl } = loaderData;
    const canonical = localizeUrl(
      `${appUrl || envConfigs.app_url}/blog/${post.slug}`,
      {
        locale: locale as any,
      }
    ).href;
    return {
      meta: [
        {
          title: `${post.title} | ${appName || envConfigs.app_name}`,
        },
        { name: 'description', content: post.description },
      ],
      links: [{ rel: 'canonical', href: canonical }],
    };
  },
  component: BlogPostPage,
});

function BlogPostPage() {
  const { locale, post } = Route.useLoaderData();

  // Local posts render their bundled MDX component; database posts render
  // raw markdown through MarkdownContent.
  const LocalContent =
    post.source === 'local' ? loadLocalPost(post.slug, locale)?.default : null;

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col transition-colors dark:bg-[#060a13]">
      <VideoHeader />
      <main className="relative flex-1 overflow-hidden px-6 pt-24 pb-14 md:px-8 md:pt-28 md:pb-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.1),transparent_68%)]"
        />
        <article className="relative mx-auto max-w-6xl">
          <Link
            href="/blog"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="size-4" />
            {m['blog.back_to_blog']()}
          </Link>

          <header className="border-border mt-10 border-b pb-10">
            <h1 className="max-w-5xl font-serif text-4xl leading-[1.08] font-normal tracking-[-0.035em] text-balance md:text-[46px] lg:text-[52px]">
              {post.title}
            </h1>
            {post.description && (
              <p className="text-muted-foreground mt-6 max-w-4xl text-lg leading-8 md:text-xl">
                {post.description}
              </p>
            )}
            <div className="text-muted-foreground mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-4" />
                {formatPostDate(post.createdAt, locale)}
              </span>
              {(post.authorName || post.authorImage) && (
                <span className="inline-flex items-center gap-2">
                  {post.authorImage && (
                    <img
                      src={post.authorImage}
                      alt=""
                      width={20}
                      height={20}
                      className="size-5 rounded-full object-cover"
                    />
                  )}
                  {post.authorName}
                </span>
              )}
            </div>
          </header>

          {post.image && (
            <img
              src={post.image}
              alt={post.title}
              width={1200}
              height={630}
              className="border-border mt-10 mb-14 aspect-video w-full rounded-[28px] border object-cover shadow-[0_24px_80px_rgba(0,0,0,0.32)]"
            />
          )}

          <div className="text-foreground/80 [&_blockquote]:text-foreground/90 [&_td]:border-border [&_th]:border-border [&_th]:text-foreground max-w-5xl text-[17px] leading-8 [&_a]:text-blue-400 [&_blockquote]:my-8 [&_blockquote]:rounded-2xl [&_blockquote]:border [&_blockquote]:border-blue-400/20 [&_blockquote]:bg-blue-400/[0.06] [&_blockquote]:px-5 [&_blockquote]:py-4 [&_blockquote]:not-italic sm:[&_blockquote]:px-6 sm:[&_blockquote]:py-5 [&_h1]:font-serif [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:font-serif [&_h2]:text-3xl [&_h2]:font-normal [&_h3]:mt-9 [&_h3]:mb-3 [&_h3]:text-xl [&_li]:leading-8 [&_p]:mt-5 [&_p]:leading-8 [&_table]:my-8 [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_td]:min-w-40 [&_td]:border [&_td]:px-4 [&_td]:py-3 [&_td]:align-top [&_th]:min-w-40 [&_th]:border [&_th]:bg-white/[0.04] [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-semibold">
            {LocalContent ? (
              <MDXProvider components={mdxComponents}>
                <LocalContent />
              </MDXProvider>
            ) : post.content ? (
              <MarkdownContent content={post.content} />
            ) : null}
          </div>
        </article>
      </main>
      <VideoFooter />
    </div>
  );
}

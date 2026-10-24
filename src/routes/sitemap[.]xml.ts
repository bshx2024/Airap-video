import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { getModelPageSlugs } from '@/config/model-pages';
import { STYLES_DATA } from '@/config/styles';
import { TEMPLATES_DATA } from '@/config/templates';
import { getToolPageSlugs } from '@/config/tools';
import { baseLocale, locales, localizeUrl } from '@/paraglide/runtime.js';
import { getLocalPosts, mergePosts } from '@/content/posts';

const STATIC_PATHS = [
  '',
  '/pricing',
  '/blog',
  '/text-to-image',
  '/image-to-image',
  '/prompts',
  '/models',
  '/styles',
  '/templates',
  '/tools',
  '/privacy-policy',
  '/terms-of-service',
  '/cookie-policy',
  '/refund-policy',
];

type Entry = {
  path: string;
  lastModified?: string;
  changeFrequency: string;
  priority: number;
};

function urlFor(path: string, locale: string, appUrl: string): string {
  return localizeUrl(`${appUrl}${path || '/'}`, {
    locale: locale as (typeof locales)[number],
  }).href;
}

function entryXml(e: Entry, appUrl: string): string {
  const alternates = locales
    .map(
      (loc) =>
        `    <xhtml:link rel="alternate" hreflang="${loc}" href="${urlFor(e.path, loc, appUrl)}"/>`
    )
    .join('\n');
  return [
    '  <url>',
    `    <loc>${urlFor(e.path, baseLocale, appUrl)}</loc>`,
    alternates,
    e.lastModified ? `    <lastmod>${e.lastModified}</lastmod>` : null,
    `    <changefreq>${e.changeFrequency}</changefreq>`,
    `    <priority>${e.priority}</priority>`,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const { getAllConfigs } = await import('@/modules/config/service');
        const configs = await getAllConfigs();
        const appUrl = configs.app_url?.trim() || envConfigs.app_url;

        const entries: Entry[] = STATIC_PATHS.map((path) => ({
          path,
          changeFrequency:
            path === '/blog' || path === '/prompts' ? 'daily' : 'weekly',
          priority: path === '' ? 1 : path.startsWith('/privacy') ? 0.3 : 0.8,
        }));

        for (const slug of getModelPageSlugs()) {
          entries.push({
            path: `/models/${slug}`,
            changeFrequency: 'weekly',
            priority: 0.7,
          });
        }
        for (const item of STYLES_DATA) {
          entries.push({
            path: `/styles/${item.slug}`,
            changeFrequency: 'weekly',
            priority: 0.7,
          });
        }
        for (const item of TEMPLATES_DATA) {
          entries.push({
            path: `/templates/${item.slug}`,
            changeFrequency: 'weekly',
            priority: 0.7,
          });
        }
        for (const slug of getToolPageSlugs()) {
          entries.push({
            path: `/tools/${slug}`,
            changeFrequency: 'weekly',
            priority: 0.7,
          });
        }

        // Blog posts: db posts merged with local MDX posts.
        try {
          const { listPublishedArticles } =
            await import('@/modules/posts/service');
          const rows = await listPublishedArticles().catch(() => []);
          const dbPosts = rows.map((row) => ({
            slug: row.slug,
            title: row.title || row.slug,
            description: row.description || '',
            createdAt: new Date(row.createdAt).toISOString(),
            source: 'db' as const,
          }));
          const posts = mergePosts(dbPosts, getLocalPosts(baseLocale));
          for (const post of posts) {
            entries.push({
              path: `/blog/${post.slug}`,
              lastModified: post.createdAt,
              changeFrequency: 'monthly',
              priority: 0.6,
            });
          }
        } catch {
          // Database unreachable — static paths + local posts still listed.
          for (const post of getLocalPosts(baseLocale)) {
            entries.push({
              path: `/blog/${post.slug}`,
              lastModified: post.createdAt,
              changeFrequency: 'monthly',
              priority: 0.6,
            });
          }
        }

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
          ...entries.map((e) => entryXml(e, appUrl)),
          '</urlset>',
          '',
        ].join('\n');

        return new Response(xml, {
          headers: { 'Content-Type': 'application/xml' },
        });
      },
    },
  },
});

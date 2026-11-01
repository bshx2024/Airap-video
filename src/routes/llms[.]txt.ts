import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { getModelPageSlugs } from '@/config/model-pages';
import { STYLES_DATA } from '@/config/styles';
import { TEMPLATES_DATA } from '@/config/templates';
import { getToolPageSlugs } from '@/config/tools';
import { baseLocale } from '@/paraglide/runtime.js';
import { getLocalPosts, mergePosts } from '@/content/posts';

const STATIC_PAGES: { path: string; title: string; description: string }[] = [
  {
    path: '',
    title: 'AI Rap Video Studio',
    description:
      'The #1 AI Rap Video Generator. Transform photos into viral Migos orange studio rap battles, TikTok meme raps, and synced music videos in 60 seconds.',
  },
  {
    path: '/pricing',
    title: 'Pricing & Credit Packages',
    description:
      'Transparent single-use passes and creator subscriptions for AI rap video generation with 100% royalty-free commercial rights.',
  },
  {
    path: '/templates',
    title: 'Rap Video Templates',
    description:
      'Iconic templates including Migos Orange Studio, Underground Cypher, Trap Duel, and TikTok Meme Battles.',
  },
  {
    path: '/models',
    title: 'AI Video & Audio Models',
    description:
      'High-energy diffusion models (Kling 4.0 Studio, Wan 2.6 Flash, Seedance 2.5 Pro) with Suno v4 audio engine optimized for hip-hop flow, dynamic head nods, and viseme lip-sync.',
  },
  {
    path: '/my-creations',
    title: 'Creations & Download',
    description:
      'Manage and download rendered 9:16 vertical MP4 rap videos with animated lyrics.',
  },
  {
    path: '/blog',
    title: 'Guides & Tutorials',
    description:
      'Step-by-step guides on creating viral TikTok rap videos, prompt inspirations, and lyric generation tips.',
  },
];

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET: async () => {
        const { getAllConfigs } = await import('@/modules/config/service');
        const configs = await getAllConfigs();
        const app_url = configs.app_url?.trim() || envConfigs.app_url;
        const app_name = configs.app_name?.trim() || envConfigs.app_name;
        const app_description =
          configs.app_description?.trim() || envConfigs.app_description;

        let posts = getLocalPosts(baseLocale);
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
          posts = mergePosts(dbPosts, posts);
        } catch {
          // Database unreachable — local posts still listed.
        }

        const lines: string[] = [
          `# ${app_name}`,
          '',
          `> ${app_description}`,
          '',
          '## Pages',
          '',
          ...STATIC_PAGES.map(
            (p) => `- [${p.title}](${app_url}${p.path}): ${p.description}`
          ),
        ];

        const modelSlugs = getModelPageSlugs();
        if (modelSlugs.length > 0) {
          lines.push('', '## Models', '');
          for (const slug of modelSlugs) {
            lines.push(`- [${slug}](${app_url}/models/${slug})`);
          }
        }

        if (STYLES_DATA.length > 0) {
          lines.push('', '## Styles', '');
          for (const item of STYLES_DATA) {
            lines.push(`- [${item.slug}](${app_url}/styles/${item.slug})`);
          }
        }

        if (TEMPLATES_DATA.length > 0) {
          lines.push('', '## Templates', '');
          for (const item of TEMPLATES_DATA) {
            lines.push(`- [${item.slug}](${app_url}/templates/${item.slug})`);
          }
        }

        const toolSlugs = getToolPageSlugs();
        if (toolSlugs.length > 0) {
          lines.push('', '## Tools', '');
          for (const slug of toolSlugs) {
            lines.push(`- [${slug}](${app_url}/tools/${slug})`);
          }
        }

        if (posts.length > 0) {
          lines.push('', '## Blog Posts', '');
          for (const post of posts) {
            lines.push(
              `- [${post.title}](${app_url}/blog/${post.slug}): ${post.description}`
            );
          }
        }

        lines.push('');

        return new Response(lines.join('\n'), {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      },
    },
  },
});

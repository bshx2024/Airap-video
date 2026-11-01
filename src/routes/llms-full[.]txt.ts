import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
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

export const Route = createFileRoute('/llms-full.txt')({
  server: {
    handlers: {
      GET: async () => {
        const { getAllConfigs } = await import('@/modules/config/service');
        const configs = await getAllConfigs();
        const app_url = configs.app_url?.trim() || envConfigs.app_url;
        const app_name = configs.app_name?.trim() || envConfigs.app_name;
        const app_description =
          configs.app_description?.trim() || envConfigs.app_description;

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

        let posts = getLocalPosts(baseLocale);
        try {
          const { listPublishedArticles, findPublishedBySlug } =
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

          if (posts.length > 0) {
            lines.push('', '## Blog Posts', '');

            for (const post of posts) {
              lines.push(`### ${post.title}`, '');
              lines.push(`URL: ${app_url}/blog/${post.slug}`);
              if (post.description)
                lines.push(`Description: ${post.description}`);
              lines.push('');

              if (post.source === 'db') {
                const detail = await findPublishedBySlug(post.slug).catch(
                  () => null
                );
                if (detail?.content) {
                  lines.push(detail.content, '');
                }
              }

              lines.push('---', '');
            }
          }
        } catch {
          // Database unreachable — list local posts without content.
          if (posts.length > 0) {
            lines.push('', '## Blog Posts', '');
            for (const post of posts) {
              lines.push(`### ${post.title}`, '');
              lines.push(`URL: ${app_url}/blog/${post.slug}`);
              if (post.description)
                lines.push(`Description: ${post.description}`);
              lines.push('', '---', '');
            }
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

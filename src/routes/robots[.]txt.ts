import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: async () => {
        const { getAllConfigs } = await import('@/modules/config/service');
        const configs = await getAllConfigs();
        const appUrl = configs.app_url?.trim() || envConfigs.app_url;
        const body = [
          'User-Agent: *',
          'Allow: /',
          'Disallow: /admin',
          'Disallow: /admin/',
          'Disallow: /api/',
          'Disallow: /tools/workflow',
          'Disallow: /mobile-rap-upload',
          'Disallow: /mobile-video-download',
          '',
          '# Allow and welcome AI assistants & search crawlers',
          'User-Agent: GPTBot',
          'Allow: /',
          'Disallow: /admin/',
          'Disallow: /api/',
          '',
          'User-Agent: ChatGPT-User',
          'Allow: /',
          'Disallow: /admin/',
          'Disallow: /api/',
          '',
          'User-Agent: ClaudeBot',
          'Allow: /',
          'Disallow: /admin/',
          'Disallow: /api/',
          '',
          'User-Agent: Claude-Web',
          'Allow: /',
          'Disallow: /admin/',
          'Disallow: /api/',
          '',
          'User-Agent: PerplexityBot',
          'Allow: /',
          'Disallow: /admin/',
          'Disallow: /api/',
          '',
          'User-Agent: Googlebot',
          'Allow: /',
          'Disallow: /admin/',
          'Disallow: /api/',
          '',
          'User-Agent: Google-Extended',
          'Allow: /',
          'Disallow: /admin/',
          'Disallow: /api/',
          '',
          'User-Agent: Bingbot',
          'Allow: /',
          'Disallow: /admin/',
          'Disallow: /api/',
          '',
          'User-Agent: Applebot',
          'Allow: /',
          'Disallow: /admin/',
          'Disallow: /api/',
          '',
          'User-Agent: Applebot-Extended',
          'Allow: /',
          'Disallow: /admin/',
          'Disallow: /api/',
          '',
          `Sitemap: ${appUrl}/sitemap.xml`,
        ].join('\n');
        return new Response(body, {
          headers: { 'Content-Type': 'text/plain' },
        });
      },
    },
  },
});

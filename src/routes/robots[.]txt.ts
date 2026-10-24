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
          'Disallow: /settings',
          'Disallow: /api/',
          'Disallow: /*?*',
          '',
          'User-Agent: GPTBot',
          'Allow: /',
          '',
          'User-Agent: ChatGPT-User',
          'Allow: /',
          '',
          'User-Agent: PerplexityBot',
          'Allow: /',
          '',
          'User-Agent: ClaudeBot',
          'Allow: /',
          '',
          `Sitemap: ${appUrl}/sitemap.xml`,
          `LLMs: ${appUrl}/llms.txt`,
          '',
        ].join('\n');
        return new Response(body, {
          headers: { 'Content-Type': 'text/plain' },
        });
      },
    },
  },
});

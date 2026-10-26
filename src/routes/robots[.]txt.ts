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
          '# Debugging Mode: Crawlers & AI bots blocked temporarily',
          'User-Agent: *',
          'Disallow: /',
          '',
          'User-Agent: Googlebot',
          'Disallow: /',
          '',
          'User-Agent: Googlebot-Image',
          'Disallow: /',
          '',
          'User-Agent: Google-Extended',
          'Disallow: /',
          '',
          'User-Agent: Bingbot',
          'Disallow: /',
          '',
          'User-Agent: GPTBot',
          'Disallow: /',
          '',
          'User-Agent: ChatGPT-User',
          'Disallow: /',
          '',
          'User-Agent: ClaudeBot',
          'Disallow: /',
          '',
          'User-Agent: Claude-Web',
          'Disallow: /',
          '',
          'User-Agent: Anthropic-ai',
          'Disallow: /',
          '',
          'User-Agent: PerplexityBot',
          'Disallow: /',
          '',
          'User-Agent: Bytespider',
          'Disallow: /',
          '',
          'User-Agent: CCBot',
          'Disallow: /',
          '',
          'User-Agent: Applebot',
          'Disallow: /',
          '',
          'User-Agent: Applebot-Extended',
          'Disallow: /',
          '',
          'User-Agent: FacebookBot',
          'Disallow: /',
          '',
          'User-Agent: cohere-ai',
          'Disallow: /',
          '',
        ].join('\n');
        return new Response(body, {
          headers: { 'Content-Type': 'text/plain' },
        });
      },
    },
  },
});

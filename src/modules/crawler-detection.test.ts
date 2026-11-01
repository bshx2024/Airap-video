import { describe, expect, it } from 'vitest';

// Test detection functions
function isContentRequest(pathname: string): boolean {
  const p = pathname.toLowerCase();
  if (
    p === '/robots.txt' ||
    p === '/sitemap.xml' ||
    p === '/sitemap.txt' ||
    p === '/favicon.ico' ||
    p === '/llms.txt' ||
    p.startsWith('/.well-known/') ||
    p.startsWith('/api/')
  ) {
    return false;
  }
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|mjs|map|woff|woff2|ttf|otf|mp4|webm)$/i.test(p)) {
    return false;
  }
  return true;
}

function detectBotType(ua: string, path: string): string | null {
  const lPath = path.toLowerCase();
  if (['.php', '.env', 'wp-admin', 'shell', 'backup', '.git', 'composer.json', 'xmlrpc', 'setup.cgi'].some((s) => lPath.includes(s))) {
    return 'scanner';
  }
  const lUa = ua.toLowerCase();
  if (lUa.includes('googlebot')) return 'googlebot';
  if (lUa.includes('bingbot')) return 'bingbot';
  if (lUa.includes('oai-searchbot') || lUa.includes('chatgpt-user') || lUa.includes('gptbot')) return 'openai';
  if (lUa.includes('claudebot') || lUa.includes('anthropic-ai')) return 'claude';
  if (lUa.includes('applebot')) return 'apple';
  if (lUa.includes('perplexitybot')) return 'perplexity';
  if (lUa.includes('ahrefs')) return 'ahrefs';
  if (lUa.includes('semrush')) return 'semrush';
  if (lUa.includes('bytespider')) return 'bytespider';
  if (lUa.includes('yandex')) return 'yandex';
  if (lUa.includes('duckduckbot') || lUa.includes('duckduckgo')) return 'duckduckgo';
  if (lUa.includes('baiduspider')) return 'baidu';
  if (lUa.includes('bot') || lUa.includes('spider') || lUa.includes('crawler') || lUa.includes('slurp')) return 'other_bot';
  return null;
}

function isVerifiedBot(botType: string, ip: string): boolean {
  if (botType === 'scanner' || botType === 'other_bot') return false;
  if (botType === 'googlebot') return ip.startsWith('66.249.') || ip.startsWith('192.178.');
  if (botType === 'bingbot') return ip.startsWith('40.77.') || ip.startsWith('157.55.');
  if (botType === 'openai') return ip.startsWith('20.15.') || ip.startsWith('20.171.') || ip.startsWith('23.98.');
  if (botType === 'claude') return ip.startsWith('54.') || ip.startsWith('3.');
  if (botType === 'apple') return ip.startsWith('17.');
  return false;
}

describe('APIVALE-Aligned Crawler & AI Bot Engine', () => {
  it('correctly classifies search engines and modern AI crawlers', () => {
    expect(detectBotType('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', '/')).toBe('googlebot');
    expect(detectBotType('Mozilla/5.0 (compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)', '/')).toBe('openai');
    expect(detectBotType('Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)', '/blog/migos-rap')).toBe('claude');
    expect(detectBotType('Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)', '/showcase')).toBe('bytespider');
    expect(detectBotType('Mozilla/5.0 (Macintosh; Applebot/0.1)', '/')).toBe('apple');
    expect(detectBotType('Mozilla/5.0 (compatible; PerplexityBot/1.0)', '/pricing')).toBe('perplexity');
    expect(detectBotType('python-requests/2.28', '/.env')).toBe('scanner');
  });

  it('distinguishes content crawls from protocol probes', () => {
    expect(isContentRequest('/')).toBe(true);
    expect(isContentRequest('/showcase/drill-rap')).toBe(true);
    expect(isContentRequest('/pricing')).toBe(true);
    expect(isContentRequest('/blog/post-1')).toBe(true);

    // Protocol & assets
    expect(isContentRequest('/robots.txt')).toBe(false);
    expect(isContentRequest('/sitemap.xml')).toBe(false);
    expect(isContentRequest('/favicon.ico')).toBe(false);
    expect(isContentRequest('/logo.svg')).toBe(false);
    expect(isContentRequest('/api/auth/session')).toBe(false);
  });

  it('validates verified bot official subnets', () => {
    expect(isVerifiedBot('googlebot', '66.249.66.1')).toBe(true);
    expect(isVerifiedBot('googlebot', '1.2.3.4')).toBe(false);
    expect(isVerifiedBot('openai', '20.171.12.5')).toBe(true);
    expect(isVerifiedBot('claude', '54.210.1.2')).toBe(true);
    expect(isVerifiedBot('apple', '17.58.100.1')).toBe(true);
    expect(isVerifiedBot('scanner', '66.249.66.1')).toBe(false);
  });
});

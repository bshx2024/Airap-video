import { afterEach, describe, expect, it } from 'vitest';

describe('envConfigs Cloudflare wrangler vars', () => {
  afterEach(() => {
    delete (globalThis as any).__CF_ENV__;
    delete (globalThis as any).__env__;
  });

  it('reads VITE_APP_URL from __CF_ENV__ lazily (not frozen at module init)', async () => {
    (globalThis as any).__CF_ENV__ = {
      VITE_APP_URL: 'https://app.example.com',
    };
    const { envConfigs } = await import('@/config');
    expect(envConfigs.app_url).toBe('https://app.example.com');
  });
});

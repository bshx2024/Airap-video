import { createServerFn } from '@tanstack/react-start';

import { envConfigs } from '@/config';

/**
 * Public site brand meta for route heads/loaders.
 * Must stay behind createServerFn so drizzle/db never enter the client bundle.
 */
export const getPublicSiteMetaFn = createServerFn().handler(async () => {
  try {
    const { getAllConfigs } = await import('@/modules/config/service');
    const configs = await getAllConfigs();
    return {
      appName: configs.app_name?.trim() || envConfigs.app_name,
      appDescription:
        configs.app_description?.trim() || envConfigs.app_description,
      appUrl: configs.app_url?.trim() || envConfigs.app_url,
    };
  } catch {
    return {
      appName: envConfigs.app_name,
      appDescription: envConfigs.app_description,
      appUrl: envConfigs.app_url,
    };
  }
});

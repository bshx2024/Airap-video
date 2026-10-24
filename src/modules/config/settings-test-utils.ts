import { envConfigs } from '@/config';

export function need(
  configs: Record<string, string>,
  keys: string[]
): string | null {
  const missing = keys.filter((k) => !configs[k]);
  return missing.length ? `Missing config: ${missing.join(', ')}` : null;
}

export function configuredAppName(configs: Record<string, string>) {
  return configs.app_name || envConfigs.app_name;
}

export function configuredSuccessUrl(
  group: string,
  configs: Record<string, string>
) {
  return `${configs.app_url || envConfigs.app_url || 'http://localhost:3000'}/admin/settings?test=${group}`;
}

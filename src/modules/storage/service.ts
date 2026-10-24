import { R2Provider, StorageManager } from '@/core/storage';
import { getAllConfigs, type ConfigMap } from '@/modules/config/service';

/**
 * Storage config is DB-driven (like auth/payment/email): values come from the
 * admin "Storage" settings, merged over env via getAllConfigs(). Keys mirror the
 * original ShipAny Two (`r2_*`).
 */
function trimConfig(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isConfigured(configs: ConfigMap): boolean {
  return Boolean(
    trimConfig(configs.r2_access_key) &&
    trimConfig(configs.r2_secret_key) &&
    trimConfig(configs.r2_bucket_name)
  );
}

function buildManager(configs: ConfigMap): StorageManager {
  const manager = new StorageManager();
  manager.addProvider(
    new R2Provider({
      accountId: trimConfig(configs.r2_account_id),
      accessKeyId: trimConfig(configs.r2_access_key),
      secretAccessKey: trimConfig(configs.r2_secret_key),
      bucket: trimConfig(configs.r2_bucket_name),
      uploadPath: trimConfig(configs.r2_upload_path) || undefined,
      region: 'auto',
      endpoint: trimConfig(configs.r2_endpoint) || undefined,
      publicDomain: trimConfig(configs.r2_domain) || undefined,
    }),
    true
  );
  return manager;
}

export async function isStorageConfigured(): Promise<boolean> {
  return isConfigured(await getAllConfigs());
}

/**
 * Returns a configured StorageManager, or null when storage is not configured
 * (caller should fall back to local/inline handling).
 */
export async function getStorage(): Promise<StorageManager | null> {
  const configs = await getAllConfigs();
  if (!isConfigured(configs)) return null;
  return buildManager(configs);
}

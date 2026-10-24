export const AUTH_SECRET_PLACEHOLDER =
  'shipany-dev-secret-change-in-production';

// Isomorphic env access:
// - Public (client-visible) vars are VITE_-prefixed and read from
//   import.meta.env (statically injected into the client bundle by Vite).
// - Server-only vars (secrets) are read from process.env and resolve to ''
//   in the browser — they never reach the client bundle.
// - On Cloudflare Workers, wrangler.jsonc `vars` / secrets live on
//   `cloudflare:workers` env (stashed as globalThis.__CF_ENV__), NOT on
//   process.env at module init — so values must be read lazily per access.
const metaEnv: Record<string, string | undefined> =
  (import.meta as any).env ?? {};
const procEnv: Record<string, string | undefined> =
  typeof process !== 'undefined' && process.env ? process.env : {};

function cloudflareEnvValue(key: string): string | undefined {
  if (typeof globalThis === 'undefined') return undefined;
  const g = globalThis as any;
  const cf = g.__CF_ENV__ ?? g.__env__;
  const value = cf?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function processEnvValue(key: string): string | undefined {
  const value = procEnv[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function metaEnvValue(key: string): string | undefined {
  const value = metaEnv[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * Public VITE_* / NEXT_PUBLIC_* values.
 * Server/Workers: wrangler runtime env → process.env → Vite build inline.
 * Browser: Vite inline → process.env (usually empty).
 */
const publicEnv = (key: string) => {
  if (typeof window === 'undefined') {
    return cloudflareEnvValue(key) ?? processEnvValue(key) ?? metaEnvValue(key);
  }
  return metaEnvValue(key) ?? processEnvValue(key) ?? cloudflareEnvValue(key);
};

/** Server-only secrets (never from import.meta.env). */
const secretEnv = (key: string) =>
  cloudflareEnvValue(key) ?? processEnvValue(key) ?? '';

/**
 * Lazy getters so Cloudflare wrangler `vars` (e.g. VITE_APP_URL) are visible
 * after `globalThis.__CF_ENV__` is stashed on the first request — a one-shot
 * object literal at module load would freeze `http://localhost:3000` forever.
 */
export const envConfigs: Record<string, string> = {
  get app_url() {
    return publicEnv('VITE_APP_URL') ?? 'http://localhost:3000';
  },
  get app_name() {
    return publicEnv('VITE_APP_NAME') ?? 'Video Lite';
  },
  get app_description() {
    return publicEnv('VITE_APP_DESCRIPTION') ?? 'Ship your SaaS faster';
  },
  get app_logo() {
    return publicEnv('VITE_APP_LOGO') ?? '/logo.svg';
  },

  get database_url() {
    return secretEnv('DATABASE_URL');
  },
  get database_auth_token() {
    return secretEnv('DATABASE_AUTH_TOKEN');
  },
  get database_provider() {
    return secretEnv('DATABASE_PROVIDER') || 'sqlite';
  },
  get db_schema() {
    return secretEnv('DB_SCHEMA') || 'public';
  },
  get db_singleton_enabled() {
    return secretEnv('DB_SINGLETON_ENABLED') || 'false';
  },
  get db_max_connections() {
    return secretEnv('DB_MAX_CONNECTIONS') || '1';
  },

  get auth_url() {
    return secretEnv('AUTH_URL') || publicEnv('VITE_APP_URL') || '';
  },
  get auth_secret() {
    return secretEnv('AUTH_SECRET');
  },

  get stripe_secret_key() {
    return secretEnv('STRIPE_SECRET_KEY');
  },
  get stripe_publishable_key() {
    return secretEnv('STRIPE_PUBLISHABLE_KEY');
  },
  get stripe_signing_secret() {
    return secretEnv('STRIPE_SIGNING_SECRET');
  },

  get paypal_client_id() {
    return secretEnv('PAYPAL_CLIENT_ID');
  },
  get paypal_client_secret() {
    return secretEnv('PAYPAL_CLIENT_SECRET');
  },
  get paypal_webhook_id() {
    return secretEnv('PAYPAL_WEBHOOK_ID');
  },
  get paypal_environment() {
    return secretEnv('PAYPAL_ENVIRONMENT') || 'production';
  },

  get alipay_app_id() {
    return secretEnv('ALIPAY_APP_ID');
  },
  get alipay_private_key() {
    return secretEnv('ALIPAY_PRIVATE_KEY');
  },
  get alipay_public_key() {
    return secretEnv('ALIPAY_PUBLIC_KEY');
  },
  get alipay_notify_url() {
    return secretEnv('ALIPAY_NOTIFY_URL');
  },

  get wechat_app_id() {
    return secretEnv('WECHAT_APP_ID');
  },
  get wechat_mch_id() {
    return secretEnv('WECHAT_MCH_ID');
  },
  get wechat_api_v3_key() {
    return secretEnv('WECHAT_API_V3_KEY');
  },
  get wechat_private_key() {
    return secretEnv('WECHAT_PRIVATE_KEY');
  },
  get wechat_serial_no() {
    return secretEnv('WECHAT_SERIAL_NO');
  },
  get wechat_notify_url() {
    return secretEnv('WECHAT_NOTIFY_URL');
  },
  get wechat_platform_cert() {
    return secretEnv('WECHAT_PLATFORM_CERT');
  },

  get resend_api_key() {
    return secretEnv('RESEND_API_KEY');
  },
  get resend_sender_email() {
    return secretEnv('RESEND_SENDER_EMAIL') || secretEnv('RESEND_EMAIL_FROM');
  },

  get storage_endpoint() {
    return secretEnv('STORAGE_ENDPOINT') || secretEnv('R2_ENDPOINT');
  },
  get storage_region() {
    return secretEnv('STORAGE_REGION') || 'auto';
  },
  get storage_access_key() {
    return secretEnv('STORAGE_ACCESS_KEY') || secretEnv('R2_ACCESS_KEY');
  },
  get storage_secret_key() {
    return secretEnv('STORAGE_SECRET_KEY') || secretEnv('R2_SECRET_KEY');
  },
  get storage_bucket() {
    return secretEnv('STORAGE_BUCKET') || secretEnv('R2_BUCKET_NAME');
  },
  get storage_public_domain() {
    return secretEnv('STORAGE_PUBLIC_DOMAIN') || secretEnv('R2_DOMAIN');
  },
  get inline_image_max_kb() {
    return secretEnv('INLINE_IMAGE_MAX_KB') || '2048';
  },

  get r2_account_id() {
    return secretEnv('R2_ACCOUNT_ID');
  },
  get r2_access_key() {
    return secretEnv('R2_ACCESS_KEY');
  },
  get r2_secret_key() {
    return secretEnv('R2_SECRET_KEY');
  },
  get r2_bucket_name() {
    return secretEnv('R2_BUCKET_NAME');
  },
  get r2_domain() {
    return secretEnv('R2_DOMAIN');
  },
  get r2_endpoint() {
    return secretEnv('R2_ENDPOINT');
  },

  // AI
  // OpenAI / Anthropic are admin-panel-only (like Gemini/Fal). No env fallback:
  // OPENAI_API_KEY / ANTHROPIC_API_KEY are common ambient vars, and falling back
  // to them would let the admin "Test" silently pass on the machine's own key.
  get replicate_api_token() {
    return secretEnv('REPLICATE_API_TOKEN');
  },
  get kie_api_key() {
    return secretEnv('KIE_API_KEY');
  },
  get kie_base_url() {
    return secretEnv('KIE_BASE_URL') || 'https://api.kie.ai/api/v1';
  },

  get locale() {
    return publicEnv('VITE_DEFAULT_LOCALE') ?? 'en';
  },
};

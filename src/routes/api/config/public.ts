import { createFileRoute } from '@tanstack/react-router';

import { isEmailConfigured } from '@/core/email/resolve-provider';
import { pickAiProvider } from '@/config/ai-models';
import { filterPublicConfigs, getAllConfigs } from '@/modules/config/service';
import { respData } from '@/lib/resp';

const noStore = {
  headers: {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  },
};

const publicKeys = [
  'app_name',
  'app_description',
  'app_url',
  'app_logo',
  'email_auth_enabled',
  'google_auth_enabled',
  'google_one_tap_enabled',
  'google_client_id',
  'github_auth_enabled',
  'invite_code_required',
  // Custom URL schemes /auth-callback may hand a session token to.
  'desktop_auth_schemes',
  'select_payment_enabled',
  'default_payment_provider',
  'stripe_enabled',
  'creem_enabled',
  'waffo_enabled',
  'dodo_enabled',
  'paypal_enabled',
  'alipay_enabled',
  'wechat_enabled',
  'google_analytics_id',
  'plausible_domain',
  'plausible_src',
  'mock',
  'top_banner_enabled',
  'top_banner_items',
  'top_banner_stay_duration',
  'top_banner_scroll_duration',
];

async function GET(_request: { request: Request }) {
  const configs = await getAllConfigs();
  const result = filterPublicConfigs(configs, publicKeys);
  result.mock =
    configs.mock?.trim() === '1' || process.env.MOCK?.trim() === '1'
      ? '1'
      : '0';
  const emailConfigured = isEmailConfigured(configs);
  result.password_reset_enabled =
    configs.email_auth_enabled !== 'false' && emailConfigured
      ? 'true'
      : 'false';
  result.email_verification_enabled =
    configs.email_verification_enabled === 'true' && emailConfigured
      ? 'true'
      : 'false';

  result.active_ai_provider =
    configs.apimart_api_key?.trim() || configs.kie_api_key?.trim()
      ? pickAiProvider(configs)
      : '';

  return respData(result, noStore);
}

export const Route = createFileRoute('/api/config/public')({
  server: {
    handlers: { GET },
  },
});

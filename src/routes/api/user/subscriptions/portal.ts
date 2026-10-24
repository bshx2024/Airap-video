import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getAllConfigs } from '@/modules/config/service';
import {
  createCustomerPortalUrl,
  CustomerPortalError,
  PORTAL_FAILED_ERROR,
} from '@/modules/payment/customer-portal';
import { respData, respErr, respJson } from '@/lib/resp';
import { baseLocale, locales, localizeUrl } from '@/paraglide/runtime.js';

/**
 * POST → { url } of the payment provider's customer portal for the caller's
 * current subscription, used to resume a canceling plan. Port of tinyship
 * /api/subscription/portal; provider and customer come from the caller's own
 * subscription, the return URL is always our billing page.
 */
async function POST({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized');

    const body = await request.json().catch(() => ({}));
    const locale = (
      typeof body?.locale === 'string' && locales.includes(body.locale)
        ? body.locale
        : baseLocale
    ) as typeof baseLocale;
    const configs = await getAllConfigs();
    const baseUrl = configs.app_url || 'http://localhost:3000';
    const returnUrl = localizeUrl(`${baseUrl}/settings/billing`, {
      locale,
    }).href;

    const { url, provider } = await createCustomerPortalUrl(
      session.user.id,
      returnUrl
    );
    return respData({ url, provider });
  } catch (error: any) {
    if (error instanceof CustomerPortalError) {
      return respJson(-1, error.message, { code: error.code });
    }
    console.error('customer portal error:', error);
    return respErr(PORTAL_FAILED_ERROR);
  }
}

export const Route = createFileRoute('/api/user/subscriptions/portal')({
  server: {
    handlers: { POST },
  },
});

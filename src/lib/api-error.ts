import { tDynamic } from '@/core/i18n/dynamic';
import { m } from '@/paraglide/messages.js';

/** Map common admin/API English error messages → i18n keys in messages/*.json */
const API_ERROR_MESSAGE_KEYS: Record<string, string> = {
  Unauthorized: 'common.error.unauthorized',
  Forbidden: 'common.error.forbidden',
  'Internal error': 'common.error.internal',
  'Invalid body': 'common.error.invalid_body',
  'ID is required': 'common.error.id_required',
  'Missing userId': 'common.error.missing_user_id',
  'User not found': 'common.error.user_not_found',
  'Invalid action': 'common.error.invalid_action',
  'Invalid credits': 'common.error.invalid_credits',
  'Insufficient balance': 'common.error.insufficient_balance',
  'Ticket not found': 'common.error.ticket_not_found',
  'Content is required': 'common.error.content_required',
  'Content is too long': 'common.error.content_too_long',
  'Invalid attachments': 'common.error.invalid_attachments',
  'Invalid status': 'common.error.invalid_status',
  'orderNo is required': 'common.error.order_no_required',
  'No fields to update': 'common.error.no_fields_to_update',
  'group is required': 'common.error.group_required',
  'Name and title are required': 'common.error.name_title_required',
  'code, resource, action, and title are required':
    'common.error.permission_fields_required',
  'slug and title are required': 'common.error.slug_title_required',
  'roleId is required': 'common.error.role_id_required',
  'userId and roleId are required': 'common.error.user_role_required',
  'Post not found': 'common.error.post_not_found',
  'Failed to fetch dashboard data': 'common.error.fetch_dashboard_failed',
  'Failed to fetch credits': 'common.error.fetch_credits_failed',
  'Failed to fetch AI tasks': 'common.error.fetch_ai_tasks_failed',
  'Request failed': 'common.error.request_failed',
  'Payment product mapping not configured':
    'common.error.payment_product_mapping_missing',
  'Alipay and WeChat Pay are only available for one-time credit packs':
    'common.error.payment_provider_cny_only',
  'This payment method does not support the selected currency':
    'common.error.payment_currency_unsupported',
  'Missing product_id': 'common.error.missing_product_id',
  'Unknown product': 'common.error.unknown_product',
};

/**
 * Resolve API / toast error text via messages JSON when the message is a
 * known English API string; otherwise keep the original message.
 */
export function apiErrorMessage(err: unknown, fallback?: string): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as any).message)
          : '';
  const key = raw ? API_ERROR_MESSAGE_KEYS[raw] : undefined;
  if (key) return tDynamic(key);
  // Waffo/Creem raw errors when catalog id was sent without Admin mapping.
  if (
    raw &&
    (/Invalid productId: expected Product Short ID format/i.test(raw) ||
      /expected Product Short ID format \(PROD_xxx\)/i.test(raw) ||
      /\bProduct\s+\S+\s+does not exist\b/i.test(raw))
  ) {
    return tDynamic('common.error.payment_product_mapping_missing');
  }
  if (raw && /^Payment provider '.+' is not configured$/.test(raw)) {
    return tDynamic('common.error.payment_provider_not_configured');
  }
  if (raw) return raw;
  return fallback || m['common.error.failed']();
}

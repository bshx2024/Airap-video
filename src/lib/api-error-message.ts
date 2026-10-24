import { PROVIDER_TIMEOUT_PATTERN } from '@/core/payment/timeout';
import { m } from '@/paraglide/messages.js';

import { WAFFO_PLAN_CHANGE_ERROR_PATTERNS as WAFFO } from './safe-error-message';

/**
 * Map known English API error strings (and a few client fallbacks) to the
 * active locale. Unknown messages pass through unchanged.
 */
export function apiErrorMessage(raw: unknown): string {
  const message = String(
    raw instanceof Error
      ? raw.message
      : typeof raw === 'object' && raw !== null && 'message' in raw
        ? (raw as { message?: unknown }).message
        : (raw ?? '')
  ).trim();
  if (!message) return m['errors.request_failed']();

  switch (message) {
    case 'Public storage is not configured. Configure Storage in Admin Settings before adding reference media.':
      return m['errors.public_storage_not_configured']();
    case 'Reference uploads are limited to 200MB per request':
      return m['errors.reference_batch_limit']();
    case 'No files provided':
      return m['errors.no_files']();
    case 'Unauthorized':
      return m['errors.unauthorized']();
    case 'Checkout failed':
      return m['errors.checkout_failed']();
    case 'Missing product_id':
      return m['errors.missing_product_id']();
    case 'Unknown product':
      return m['errors.unknown_product']();
    case 'An active subscription is required to buy credits':
      return m['errors.subscription_required_for_credits']();
    case 'Payment product mapping not configured':
      return m['errors.payment_product_mapping_missing']();
    case 'Alipay and WeChat Pay are only available for one-time credit packs':
      return m['errors.payment_provider_cny_only']();
    case 'This payment method does not support the selected currency':
      return m['errors.payment_currency_unsupported']();
    case 'You already have this plan. Manage it in Billing.':
      return m['errors.already_on_plan']();
    case 'To downgrade, cancel or change your plan in Billing first.':
      return m['errors.downgrade_via_billing']();
    case 'Downgrades are scheduled from the pricing page.':
      return m['errors.downgrade_use_change']();
    case 'A plan change is already scheduled. Undo it first.':
      return m['errors.plan_change_pending']();
    case 'A plan change is already scheduled and cannot be undone. It takes effect at the end of the current period.':
      return m['errors.plan_change_pending_locked']();
    case 'Your current plan is ending. You can subscribe to a lower plan after it ends.':
      return m['errors.downgrade_after_period_end']();
    case 'Your current plan is canceled and ends at the end of this period. You can subscribe to another plan after it ends.':
      return m['errors.subscription_ending']();
    case 'Resume failed':
      return m['errors.resume_failed']();
    case 'This subscription cannot be resumed.':
      return m['errors.resume_unavailable']();
    case 'No active subscription':
      return m['errors.no_active_subscription']();
    case 'Subscription management is not available for this payment method.':
      return m['errors.portal_unsupported']();
    case 'Could not open subscription management. Please try again.':
      return m['errors.portal_failed']();
    case 'Plan changes are not supported for this payment method.':
      return m['errors.plan_change_unsupported']();
    case 'This plan change cannot be undone.':
      return m['errors.plan_change_not_undoable']();
    case 'No scheduled plan change.':
      return m['errors.plan_change_nothing_pending']();
    case 'Choose how to switch: upgrade to the yearly plan now, or switch to the monthly plan when your current yearly period ends.':
      return m['errors.plan_change_choice_required']();
    case 'Plan changes are not available during a trial.':
      return m['errors.plan_change_trial']();
    case 'Your plan renews within 24 hours. Please try again after the renewal.':
      return m['errors.plan_change_too_close_to_renewal']();
    case 'The new plan is billed in a different currency.':
      return m['errors.plan_change_currency']();
    case 'This subscription already has a plan change or cancellation in progress at the payment provider. Check Billing for its status.':
      return m['errors.plan_change_not_active']();
    case 'Your last upgrade did not complete. You can upgrade again.':
      return m['errors.plan_change_previous_incomplete']();
    case 'Plan change failed':
      return m['errors.plan_change_failed']();
    case 'Cancellation failed':
      return m['errors.cancel_failed']();
    case 'Upgrade in progress. You can cancel once it completes.':
      return m['settings.billing.cancel_upgrade_in_progress']();
    case 'Upload failed':
    case 'upload image failed':
      return m['errors.upload_failed']();
    case 'Request failed':
      return m['errors.request_failed']();
    default:
      break;
  }

  // enforceMinIntervalRateLimit (429): "Please retry after 2s."
  if (/^Please retry after \d+s\.$/.test(message)) {
    return m['common.sign.too_many_requests']();
  }

  if (PROVIDER_TIMEOUT_PATTERN.test(message)) {
    return m['errors.provider_timeout']();
  }

  // Waffo/Creem raw provider errors when catalog id was sent unmapped.
  if (
    /Invalid productId: expected Product Short ID format/i.test(message) ||
    /expected Product Short ID format \(PROD_xxx\)/i.test(message) ||
    // Dodo (and similar) when catalog id / bad mapping was sent unmapped.
    /\bProduct\s+\S+\s+does not exist\b/i.test(message)
  ) {
    return m['errors.payment_product_mapping_missing']();
  }

  if (WAFFO.notImmediate.test(message)) {
    return m['errors.plan_change_not_immediate']();
  }
  if (WAFFO.tooClose.test(message)) {
    return m['errors.plan_change_too_close_to_renewal']();
  }
  if (WAFFO.trial.test(message)) {
    return m['errors.plan_change_trial']();
  }
  if (WAFFO.confirmedPending.test(message)) {
    return m['errors.plan_change_pending_locked']();
  }
  if (WAFFO.currency.test(message)) {
    return m['errors.plan_change_currency']();
  }
  if (WAFFO.notActive.test(message)) {
    return m['errors.plan_change_not_active']();
  }
  if (WAFFO.samePlan.test(message)) {
    return m['errors.already_on_plan']();
  }

  if (/^Payment provider '.+' is not configured$/.test(message)) {
    return m['errors.payment_provider_not_configured']();
  }

  const atMost = message.match(/^Upload at most (\d+) files at once$/);
  if (atMost) {
    return m['errors.upload_at_most']({ count: Number(atMost[1]) });
  }

  const exceed = message.match(/^File (.+) exceeds the (\d+)MB limit$/);
  if (exceed) {
    return m['errors.file_exceeds_limit']({
      name: exceed[1],
      limitMb: Number(exceed[2]),
    });
  }

  const referenceType = message.match(
    /^File (.+) must be a supported image, audio, or video file$/
  );
  if (referenceType) {
    return m['errors.file_type_reference']({ name: referenceType[1] });
  }

  const imageType = message.match(
    /^File (.+) must be a JPEG, PNG, or WebP image$/
  );
  if (imageType) {
    return m['errors.file_type_image']({ name: imageType[1] });
  }

  const mismatch = message.match(
    /^File (.+) does not match its declared type$/
  );
  if (mismatch) {
    return m['errors.file_type_mismatch']({ name: mismatch[1] });
  }

  const uploadStatus = message.match(/^Upload failed \((\d+)\)$/);
  if (uploadStatus) {
    return m['errors.upload_failed_status']({
      status: Number(uploadStatus[1]),
    });
  }

  const exampleMedia = message.match(
    /^Unable to load example media \((\d+)\)$/
  );
  if (exampleMedia) {
    return m['errors.unable_load_example_media']({
      status: Number(exampleMedia[1]),
    });
  }

  return message;
}

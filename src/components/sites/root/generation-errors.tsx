'use client';

import React from 'react';

import { sanitizeUserErrorMessage } from '@/core/ai/types';
import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';

export function formatLocalizedErrorMessage(errMsg?: string): React.ReactNode {
  if (!errMsg) return m['landing.hero.generation_failed']();
  const errorCodeMap: Record<string, () => string> = {
    copyright_restricted: () => m['landing.hero.copyright_restricted'](),
    content_safety_rejected: () => m['landing.hero.content_safety_rejected'](),
    too_many_images: () => m['landing.hero.too_many_images'](),
    prompt_too_long: () => m['landing.hero.prompt_too_long'](),
    service_busy: () => m['landing.hero.service_busy'](),
    reference_media_invalid: () => m['landing.hero.reference_media_invalid'](),
    task_canceled: () => m['landing.hero.task_canceled'](),
    generation_failed: () => m['landing.hero.generation_failed'](),
    storage_required: () => m['landing.hero.upload_storage_required'](),
  };
  if (errorCodeMap[errMsg]) return errorCodeMap[errMsg]();

  if (
    errMsg.includes('storage_required') ||
    /public storage|r2 storage is not configured|cloudflare r2 storage is not configured/i.test(
      errMsg
    )
  ) {
    return m['landing.hero.upload_storage_required']();
  }

  const creditMatch = errMsg.match(
    /insufficient\s+credits\s*\(requires\s*(\d+)[^,]*,\s*current\s*balance:?\s*(\d+)\)/i
  );
  if (creditMatch) {
    return (
      <span>
        {m['landing.hero.insufficient_credits_prefix']({
          cost: creditMatch[1],
          balance: creditMatch[2],
        })}
        <Link
          href="/pricing"
          className="font-medium underline transition-opacity hover:opacity-80"
        >
          {m['landing.hero.purchase_credits_action']()}
        </Link>
        {m['landing.hero.insufficient_credits_suffix']()}
      </span>
    );
  }
  if (/insufficient\s+credits/i.test(errMsg)) {
    return (
      <span>
        {m['landing.hero.insufficient_credits_simple_prefix']()}
        <Link
          href="/pricing"
          className="font-medium underline transition-opacity hover:opacity-80"
        >
          {m['landing.hero.purchase_credits_action']()}
        </Link>
        {m['landing.hero.insufficient_credits_suffix']()}
      </span>
    );
  }

  const map: Array<[RegExp, () => string]> = [
    [
      /copyright|copyright restrictions/i,
      () => m['landing.hero.copyright_restricted'](),
    ],
    [
      /content safety|sensitive content|flagged as sensitive|policy\s*violation|moderation|safety system|content policy/i,
      () => m['landing.hero.content_safety_rejected'](),
    ],
    [/too\s+many\s+input\s+images/i, () => m['landing.hero.too_many_images']()],
    [/prompt\s+is\s+too\s+long/i, () => m['landing.hero.prompt_too_long']()],
    [
      /prompt\s+or\s+image\s+is\s+required|enter\s+(a\s+)?(text\s+)?prompt/i,
      () => m['landing.hero.alert_enter_text_prompt'](),
    ],
    [
      /invalid\s+image\s+url|reference\s+media\s+invalid/i,
      () => m['landing.hero.reference_media_invalid'](),
    ],
    [
      /does\s+not\s+support\s+image\s+input|image\s+input\s+not\s+supported/i,
      () => m['landing.hero.model_no_image_support'](),
    ],
    [
      /no\s+ai\s+provider\s+configured/i,
      () => m['landing.hero.no_ai_provider'](),
    ],
    [
      /failed\s+to\s+deduct\s+credits/i,
      () => m['landing.hero.failed_deduct_credits'](),
    ],
    [
      /active\s+generation\s+tasks/i,
      () => m['landing.hero.too_many_active_tasks'](),
    ],
    [
      /unsupported\s+model|model\s+is\s+required|unsupported\s+media\s+type/i,
      () => m['landing.hero.unsupported_model'](),
    ],
    [/unauthorized/i, () => m['landing.hero.sign_in_to_generate']()],
  ];
  for (const [pattern, getMsg] of map) {
    if (pattern.test(errMsg)) return getMsg();
  }
  if (
    /ECONNREFUSED|ETIMEDOUT|fetch\s+failed|temporarily\s+busy|please\s+wait|try\s+again|rate\s*limit|too\s+many\s+requests|queue\s+is\s+full|service\s+unavailable|overloaded/i.test(
      errMsg
    )
  ) {
    return m['landing.hero.service_busy']();
  }
  const cleaned = sanitizeUserErrorMessage(errMsg);
  if (
    !cleaned ||
    /failed|error|unavailable|busy|timeout|please\s+wait|parameter|required|invalid|unsupported/i.test(
      cleaned
    ) ||
    /^[A-Za-z0-9\s.,'"`!?:;_\-()]+$/.test(cleaned)
  ) {
    return m['landing.hero.service_busy']();
  }
  return cleaned;
}

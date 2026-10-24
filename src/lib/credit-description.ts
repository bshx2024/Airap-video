import { m } from '@/paraglide/messages.js';

const GENERATION_MESSAGES: Record<string, () => string> = {
  image: m['common.credit_desc.ai_image'],
  video: m['common.credit_desc.ai_video'],
  music: m['common.credit_desc.ai_music'],
  speech: m['common.credit_desc.ai_speech'],
  audio: m['common.credit_desc.ai_audio'],
};

/**
 * Credit ledger descriptions are stored in English by the server (they are
 * data, not copy). Map the known system-generated ones to the active locale
 * for display; admin-entered or unknown descriptions pass through unchanged.
 */
export function localizeCreditDescription(description: unknown): string {
  const text = description == null ? '' : String(description).trim();
  if (!text) return '';

  switch (text) {
    case 'Grant credit':
      return m['common.credit_desc.grant']();
    case 'Grant credit (admin)':
      return m['common.credit_desc.grant_admin']();
    case 'Subscription Created':
      return m['common.credit_desc.subscription_created']();
    case 'Subscription Renewal':
      return m['common.credit_desc.subscription_renewal']();
    case 'Plan upgrade credit':
    case 'Plan change credit (new billing cycle)':
      return m['common.credit_desc.plan_upgrade']();
  }

  // `AI <mediaType> generation` with an optional ` · <model>` suffix.
  const generation = text.match(/^AI (\w+) generation(?: · (.+))?$/);
  const label = generation && GENERATION_MESSAGES[generation[1]];
  if (generation && label) {
    return generation[2] ? `${label()} · ${generation[2]}` : label();
  }

  return text;
}

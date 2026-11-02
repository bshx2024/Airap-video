import { WaffoPancake } from '@waffo/pancake-ts';

import { envConfigs } from '@/config';

let clientInstance: WaffoPancake | null = null;

function getWaffoSafetyClient(): WaffoPancake | null {
  if (clientInstance) return clientInstance;
  const merchantId = envConfigs.waffo_merchant_id;
  const privateKey = envConfigs.waffo_private_key;
  if (!merchantId || !privateKey) {
    return null;
  }
  try {
    clientInstance = new WaffoPancake({
      merchantId,
      privateKey,
      ...(envConfigs.waffo_environment
        ? { environment: envConfigs.waffo_environment as any }
        : {}),
    });
    return clientInstance;
  } catch (err) {
    console.error('Failed to initialize WaffoPancake content safety client:', err);
    return null;
  }
}

export type SafetyCheckResult = {
  allowed: boolean;
  action: 'allow' | 'review' | 'block';
  matchedCategories?: string[];
  reason?: string;
};

function normalizeLocale(locale?: string): 'en' | 'zh' | 'ja' | undefined {
  if (!locale) return undefined;
  if (locale.startsWith('zh')) return 'zh';
  if (locale.startsWith('ja')) return 'ja';
  return 'en';
}

/**
 * Pre-screens a user prompt against the Waffo Content Safety API (Prompt Screening API)
 * before dispatching generation requests to AI models.
 *
 * Rejects prompts flagged as 'block' or 'review' with an explicit AUP violation message,
 * ensuring no credits are consumed and no illicit media generation is initiated.
 */
export async function scanPromptSafety(
  prompt: string,
  locale?: string
): Promise<SafetyCheckResult> {
  const trimmed = typeof prompt === 'string' ? prompt.trim() : '';
  if (!trimmed) {
    return { allowed: true, action: 'allow' };
  }

  const client = getWaffoSafetyClient();
  if (!client || !client.contentSafety?.scanPrompt) {
    return { allowed: true, action: 'allow' };
  }

  try {
    const response = await client.contentSafety.scanPrompt({
      prompt: trimmed.slice(0, 10000),
      ...(locale ? { locale: normalizeLocale(locale) } : {}),
    });

    const action = response?.action || 'allow';
    const matchedCategories = Array.isArray(response?.matchedCategories)
      ? response.matchedCategories
      : [];

    if (action !== 'allow') {
      const categoryDesc =
        matchedCategories.length > 0
          ? matchedCategories.join(', ')
          : 'Acceptable Use Policy violation';

      return {
        allowed: false,
        action: action as 'review' | 'block',
        matchedCategories,
        reason: `Content safety screening failed (${categoryDesc}). In accordance with our Acceptable Use Policy (AUP), this prompt cannot be processed. Please revise your prompt.`,
      };
    }

    return {
      allowed: true,
      action: 'allow',
      matchedCategories,
    };
  } catch (err: any) {
    console.error('Error during prompt content safety scanning:', err);
    // Transient network issues or scanner timeouts should fail open with log
    // so legitimate creators are not completely blocked, but log error for audit.
    return {
      allowed: true,
      action: 'allow',
    };
  }
}

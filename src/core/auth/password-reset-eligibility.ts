import { eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { account, user } from '@/config/db/schema';

export type PasswordResetEligibility = 'ok' | 'not_found' | 'oauth_only';

/**
 * Whether this email can receive a password-reset link.
 * Only email/password (credential) accounts are eligible.
 */
export async function getPasswordResetEligibility(
  email: string
): Promise<PasswordResetEligibility> {
  const normalized = String(email || '')
    .trim()
    .toLowerCase();
  if (!normalized) return 'not_found';

  const [found] = await db()
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, normalized))
    .limit(1);

  if (!found?.id) return 'not_found';

  const rows = await db()
    .select({ providerId: account.providerId })
    .from(account)
    .where(eq(account.userId, found.id));

  if (
    rows.some((row: { providerId: string }) => row.providerId === 'credential')
  ) {
    return 'ok';
  }
  if (rows.length > 0) return 'oauth_only';
  return 'not_found';
}

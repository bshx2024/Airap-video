/**
 * Refund policy (pure; handlePaymentRefunded applies it).
 *
 * - Full refund (refunded total ≥ the order amount, or the webhook gives no
 *   usable amount): the order becomes `refunded` (atomic CAS from `paid`, so
 *   a replayed / concurrent webhook does nothing) and the order's grant loses
 *   its remaining credits. Credits already spent are not clawed back, so the
 *   balance never goes negative. When it was the payment of the subscription's
 *   current period, the subscription ends now (reason `refund`) and is
 *   canceled at the provider so it is not charged again; later provider
 *   updates do not revive it (shouldPreserveRefundCancel).
 * - Partial refund: recorded on the order (once per refund id); order stays
 *   `paid`, credits and plan stay. Partials adding up to the full amount
 *   count as a full refund.
 * - A refund for a payment we hold no order for (e.g. a Dodo prorated
 *   plan-change charge) is not matched to the subscription's first order.
 *
 * Mirrors tinyship libs/payment/refund.ts (claimOrderRefunded CAS + reverse
 * once), which ignores partial refunds (Dodo `is_partial`).
 */

export type RefundEntry = {
  id: string;
  amount: number | null;
  currency: string;
  at: string;
};

export type RefundInput = {
  /** provider refund id (dedupes replays of the same partial refund) */
  id: string;
  /** refunded amount, minor units; null when the webhook gives none */
  amount: number | null;
  currency?: string | null;
  /** the provider says it is partial (Dodo `is_partial`, Stripe !refunded) */
  isPartial?: boolean;
  /** provider's running refunded total for the payment (Stripe) */
  refundedTotal?: number | null;
  /** payment the refund belongs to */
  transactionId?: string | null;
};

export type RefundOrderLike = {
  status?: string | null;
  amount?: number | null;
  currency?: string | null;
  transactionId?: string | null;
};

export type RefundPlan =
  | {
      action: 'skip';
      reason: 'already_refunded' | 'not_paid' | 'duplicate' | 'other_payment';
    }
  | { action: 'partial'; refunds: RefundEntry[]; refundedTotal: number }
  | { action: 'full'; refunds: RefundEntry[] };

/** Partial refunds already recorded on the order's payment_result. */
export function recordedRefunds(paymentResult: unknown): RefundEntry[] {
  let parsed: any = paymentResult;
  if (typeof paymentResult === 'string') {
    try {
      parsed = JSON.parse(paymentResult);
    } catch {
      return [];
    }
  }
  const list = parsed?.refunds;
  return Array.isArray(list)
    ? list.filter((r: any) => r && typeof r.id === 'string')
    : [];
}

const sameCurrency = (a?: string | null, b?: string | null) =>
  !a || !b || a.toLowerCase() === b.toLowerCase();

export function planRefund(input: {
  order: RefundOrderLike & { paymentResult?: unknown };
  refund: RefundInput;
  /** order found by payment reference / subscription, not by the payment id */
  matchedByReference?: boolean;
  now?: Date;
}): RefundPlan {
  const { order, refund } = input;
  if (order.status === 'refunded') {
    return { action: 'skip', reason: 'already_refunded' };
  }
  if (order.status !== 'paid') return { action: 'skip', reason: 'not_paid' };

  // Found via the order reference / subscription, but the order was paid by
  // another payment: this refund is for a charge we have no order for.
  if (
    input.matchedByReference &&
    refund.transactionId &&
    order.transactionId &&
    order.transactionId !== refund.transactionId
  ) {
    return { action: 'skip', reason: 'other_payment' };
  }

  const previous = recordedRefunds(order.paymentResult);
  if (previous.some((r) => r.id === refund.id)) {
    return { action: 'skip', reason: 'duplicate' };
  }
  const entry: RefundEntry = {
    id: refund.id,
    amount: refund.amount,
    currency: String(refund.currency || order.currency || '').toLowerCase(),
    at: (input.now || new Date()).toISOString(),
  };
  const refunds = [...previous, entry];

  const total = Number(order.amount || 0);
  const amount = refund.amount;
  const knownAmount =
    typeof amount === 'number' &&
    Number.isFinite(amount) &&
    amount > 0 &&
    total > 0 &&
    sameCurrency(refund.currency, order.currency);
  if (!knownAmount && !refund.isPartial) return { action: 'full', refunds };

  const refundedTotal =
    typeof refund.refundedTotal === 'number' && refund.refundedTotal > 0
      ? refund.refundedTotal
      : refunds.reduce(
          (sum, r) => sum + (typeof r.amount === 'number' ? r.amount : 0),
          0
        );
  if (total > 0 && refundedTotal >= total) return { action: 'full', refunds };
  return { action: 'partial', refunds, refundedTotal };
}

/** Local subscription ended by a refund: provider updates must not revive it. */
export function shouldPreserveRefundCancel(
  local: { status?: string | null; canceledReasonType?: string | null },
  providerStatus?: string | null
): boolean {
  return (
    local.canceledReasonType === 'refund' &&
    local.status === 'canceled' &&
    providerStatus !== 'canceled' &&
    providerStatus !== 'expired'
  );
}

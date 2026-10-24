/**
 * Billing period helpers. Waffo (and some webhooks) often omit
 * currentPeriodStart/End; falling back to `new Date()` for both would make
 * a just-activated plan look already ended and hide pending_cancel from
 * "current subscription".
 */

export function addBillingInterval(
  start: Date,
  interval?: string | null,
  count = 1
): Date {
  const end = new Date(start);
  const n = Number.isFinite(count) && count > 0 ? Math.floor(count) : 1;
  switch (interval) {
    case 'year':
    case 'yearly':
      end.setFullYear(end.getFullYear() + n);
      break;
    case 'week':
    case 'weekly':
      end.setDate(end.getDate() + 7 * n);
      break;
    case 'day':
    case 'daily':
      end.setDate(end.getDate() + n);
      break;
    default:
      // month / monthly / unknown → one month
      end.setMonth(end.getMonth() + n);
      break;
  }
  return end;
}

function asDate(value?: Date | string | number | null): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Prefer a provider period end that is clearly still ahead (>1h) and after
 * start; otherwise start + interval (year/month/…). Never returns "now" as a
 * stand-in for a missing end.
 */
export function resolvePeriodEnd(params: {
  end?: Date | string | number | null;
  start?: Date | string | number | null;
  interval?: string | null;
  intervalCount?: number | null;
  now?: number;
}): Date {
  const now = params.now ?? Date.now();
  const end = asDate(params.end ?? null);
  const start = asDate(params.start ?? null);
  if (
    end &&
    end.getTime() > now + 60 * 60 * 1000 &&
    (!start || end.getTime() > start.getTime())
  ) {
    return end;
  }
  const from = start ?? new Date(now);
  return addBillingInterval(from, params.interval, params.intervalCount ?? 1);
}

/** True when stored end is missing, not after start, or not clearly in the future. */
export function isStalePeriodEnd(params: {
  end?: Date | string | number | null;
  start?: Date | string | number | null;
  now?: number;
}): boolean {
  const now = params.now ?? Date.now();
  const end = asDate(params.end ?? null);
  const start = asDate(params.start ?? null);
  if (!end) return true;
  if (end.getTime() <= now + 60 * 60 * 1000) return true;
  if (start && end.getTime() <= start.getTime()) return true;
  return false;
}

/**
 * Effective end for a pending_cancel row. Trusts a past canceledEndAt that
 * clearly outlasted start (real expiry); only infers start+interval when the
 * stored end looks like the "both fell back to now" bug.
 */
export function effectiveCancelEndAt(
  sub: {
    canceledEndAt?: Date | string | number | null;
    currentPeriodEnd?: Date | string | number | null;
    currentPeriodStart?: Date | string | number | null;
    interval?: string | null;
    intervalCount?: number | null;
  },
  now = Date.now()
): Date | null {
  const canceled = asDate(sub.canceledEndAt ?? null);
  const period = asDate(sub.currentPeriodEnd ?? null);
  const start = asDate(sub.currentPeriodStart ?? null);

  if (
    canceled &&
    canceled.getTime() > now &&
    (!start || canceled.getTime() > start.getTime())
  ) {
    return canceled;
  }
  if (
    period &&
    period.getTime() > now &&
    (!start || period.getTime() > start.getTime())
  ) {
    return period;
  }

  // Past/equal-to-start ends: real expiry if clearly after start (>1h).
  const stored = canceled ?? period;
  if (stored && start && stored.getTime() > start.getTime() + 60 * 60 * 1000) {
    return stored;
  }

  // Missing / same-second-as-start / "now" placeholders → infer.
  if (start || sub.interval) {
    return resolvePeriodEnd({
      end: null,
      start,
      interval: sub.interval,
      intervalCount: sub.intervalCount,
      now,
    });
  }

  return stored;
}

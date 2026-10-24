import { describe, expect, it } from 'vitest';

import {
  addBillingInterval,
  effectiveCancelEndAt,
  isStalePeriodEnd,
  resolvePeriodEnd,
} from './period';

describe('addBillingInterval', () => {
  it('adds a year / month', () => {
    const start = new Date('2026-10-19T16:10:59.122Z');
    expect(addBillingInterval(start, 'year').toISOString()).toBe(
      '2027-10-19T16:10:59.122Z'
    );
    expect(addBillingInterval(start, 'month').toISOString()).toBe(
      '2026-11-19T16:10:59.122Z'
    );
  });
});

describe('resolvePeriodEnd', () => {
  it('infers yearly end when provider period is null (not now)', () => {
    const start = new Date('2026-10-19T16:10:59.122Z');
    const end = resolvePeriodEnd({
      end: null,
      start,
      interval: 'year',
      now: start.getTime(),
    });
    expect(end.toISOString()).toBe('2027-10-19T16:10:59.122Z');
  });

  it('infers when start and end are the same second', () => {
    const start = new Date('2026-10-19T16:10:59.122Z');
    const end = resolvePeriodEnd({
      end: start,
      start,
      interval: 'year',
      now: start.getTime(),
    });
    expect(end.toISOString()).toBe('2027-10-19T16:10:59.122Z');
  });

  it('keeps a clearly future provider end', () => {
    const start = new Date('2026-10-19T16:10:59.122Z');
    const providerEnd = new Date('2027-01-01T00:00:00.000Z');
    const end = resolvePeriodEnd({
      end: providerEnd,
      start,
      interval: 'year',
      now: start.getTime(),
    });
    expect(end.toISOString()).toBe(providerEnd.toISOString());
  });
});

describe('effectiveCancelEndAt', () => {
  const start = new Date('2026-10-19T16:10:59.122Z');
  const now = start.getTime() + 60_000;

  it('infers yearly end for the Waffo same-second bug', () => {
    const end = effectiveCancelEndAt(
      {
        canceledEndAt: start,
        currentPeriodStart: start,
        currentPeriodEnd: start,
        interval: 'year',
      },
      now
    );
    expect(end?.toISOString()).toBe('2027-10-19T16:10:59.122Z');
  });

  it('trusts a real past canceledEndAt after start', () => {
    const periodEnd = new Date(start.getTime() + 30 * 86_400_000);
    const after = periodEnd.getTime() + 86_400_000;
    const end = effectiveCancelEndAt(
      {
        canceledEndAt: periodEnd,
        currentPeriodStart: start,
        currentPeriodEnd: periodEnd,
        interval: 'month',
      },
      after
    );
    expect(end?.getTime()).toBe(periodEnd.getTime());
  });

  it('keeps a future canceledEndAt', () => {
    const periodEnd = new Date(now + 10 * 86_400_000);
    const end = effectiveCancelEndAt(
      {
        canceledEndAt: periodEnd,
        currentPeriodStart: start,
        currentPeriodEnd: periodEnd,
        interval: 'month',
      },
      now
    );
    expect(end?.getTime()).toBe(periodEnd.getTime());
  });
});

describe('isStalePeriodEnd', () => {
  it('flags same-second start/end', () => {
    const t = new Date('2026-10-19T16:10:59.122Z');
    expect(isStalePeriodEnd({ end: t, start: t, now: t.getTime() })).toBe(true);
  });
});

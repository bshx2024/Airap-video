import { describe, expect, it } from 'vitest';

import { getPricingProduct } from '@/config/pricing';

import {
  classifyPlanChange,
  findPlanByTierInterval,
  waffoPlanChangeBlock,
} from './plan-change';

/** Intent matrix: tier + billing interval decide timing, not the amount. */
describe('classifyPlanChange', () => {
  const cases: Array<
    [string, string, string, 'immediate' | 'period_end' | null]
  > = [
    // same interval, higher tier → immediate (prorated)
    ['lite_monthly', 'pro_monthly', 'upgrade', 'immediate'],
    ['pro_yearly', 'ultra_yearly', 'upgrade', 'immediate'],
    // same interval, lower tier → next period
    ['ultra_monthly', 'lite_monthly', 'downgrade', 'period_end'],
    ['pro_yearly', 'lite_yearly', 'downgrade', 'period_end'],
    // monthly → yearly, same or higher tier → immediate
    ['pro_monthly', 'pro_yearly', 'interval_upgrade', 'immediate'],
    ['lite_monthly', 'ultra_yearly', 'upgrade', 'immediate'],
    // yearly → monthly, same or lower tier → next period
    ['pro_yearly', 'pro_monthly', 'interval_downgrade', 'period_end'],
    ['ultra_yearly', 'lite_monthly', 'downgrade', 'period_end'],
    // higher-tier monthly → lower-tier yearly → next period (no full-year charge now)
    ['pro_monthly', 'lite_yearly', 'downgrade_to_yearly', 'period_end'],
    ['ultra_monthly', 'pro_yearly', 'downgrade_to_yearly', 'period_end'],
    // lower-tier yearly → higher-tier monthly → choice (period end only if chosen)
    ['lite_yearly', 'pro_monthly', 'upgrade_to_monthly', 'period_end'],
    ['lite_yearly', 'ultra_monthly', 'upgrade_to_monthly', 'period_end'],
    ['pro_yearly', 'ultra_monthly', 'upgrade_to_monthly', 'period_end'],
    // nothing to change
    ['pro_monthly', 'pro_monthly', 'current', null],
  ];

  it.each(cases)('%s → %s = %s (%s)', (from, to, intent, timing) => {
    const result = classifyPlanChange(from, to);
    expect(result.intent).toBe(intent);
    expect(result.timing).toBe(timing);
  });

  it('only lower-tier yearly → higher-tier monthly needs a choice, suggesting the target tier yearly', () => {
    expect(classifyPlanChange('lite_yearly', 'pro_monthly')).toMatchObject({
      requiresChoice: true,
      suggestedProductId: 'pro_yearly',
    });
    expect(classifyPlanChange('lite_yearly', 'ultra_monthly')).toMatchObject({
      suggestedProductId: 'ultra_yearly',
    });
    for (const [from, to, intent] of cases) {
      if (intent === 'upgrade_to_monthly' || intent === 'current') continue;
      expect(classifyPlanChange(from, to)).toMatchObject({
        requiresChoice: false,
        suggestedProductId: null,
      });
    }
  });

  it('is not applicable without a subscription or for credit packs', () => {
    expect(classifyPlanChange(null, 'pro_monthly').intent).toBe(
      'not_applicable'
    );
    expect(classifyPlanChange('pro_monthly', 'credits_10').intent).toBe(
      'not_applicable'
    );
    expect(classifyPlanChange('pro_monthly', 'nope').timing).toBeNull();
  });

  it('finds catalog plans by tier and interval', () => {
    expect(findPlanByTierInterval(2, 'year')?.productId).toBe('pro_yearly');
    expect(findPlanByTierInterval(1, 'month')?.productId).toBe('lite_monthly');
    expect(findPlanByTierInterval(0, 'year')).toBeNull();
  });
});

describe('waffoPlanChangeBlock (Waffo guards)', () => {
  const now = Date.UTC(2026, 9, 19, 0, 0, 0);
  const hour = 60 * 60 * 1000;
  const pro = getPricingProduct('pro_yearly')!;
  const sub = (over: Record<string, unknown> = {}) => ({
    status: 'active',
    currency: 'usd',
    currentPeriodEnd: new Date(now + 30 * 24 * hour),
    ...over,
  });

  it('allows a normal change', () => {
    expect(waffoPlanChangeBlock(sub(), pro, 'immediate', now)).toBeNull();
    expect(waffoPlanChangeBlock(sub(), pro, 'period_end', now)).toBeNull();
  });

  it('no change during a trial', () => {
    expect(
      waffoPlanChangeBlock(sub({ status: 'trialing' }), pro, 'immediate', now)
    ).toBe('trial');
  });

  it('no cross-currency change', () => {
    expect(
      waffoPlanChangeBlock(sub({ currency: 'eur' }), pro, 'period_end', now)
    ).toBe('currency');
    expect(
      waffoPlanChangeBlock(sub({ currency: 'USD' }), pro, 'period_end', now)
    ).toBeNull();
  });

  it('immediate needs 24h before the next charge, next period needs 1h', () => {
    const in2h = sub({ currentPeriodEnd: new Date(now + 2 * hour) });
    expect(waffoPlanChangeBlock(in2h, pro, 'immediate', now)).toBe(
      'too_close_to_renewal'
    );
    expect(waffoPlanChangeBlock(in2h, pro, 'period_end', now)).toBeNull();
    const in30m = sub({ currentPeriodEnd: new Date(now + 0.5 * hour) });
    expect(waffoPlanChangeBlock(in30m, pro, 'period_end', now)).toBe(
      'too_close_to_renewal'
    );
  });

  it('ignores a stale (past) period end and lets Waffo decide', () => {
    const stale = sub({ currentPeriodEnd: new Date(now - 5 * hour) });
    expect(waffoPlanChangeBlock(stale, pro, 'immediate', now)).toBeNull();
  });
});

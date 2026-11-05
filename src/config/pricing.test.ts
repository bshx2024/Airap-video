import { describe, expect, it } from 'vitest';

import { PaymentType } from '@/core/payment/types';

import {
  checkoutUsdFallback,
  formatCheckoutAmount,
  getPricingProduct,
  isPaymentProviderAvailableForProduct,
  listPricingProducts,
  parseProductIdsMapping,
  planChangeTimingFor,
  resolveCatalogIdFromProviderProductId,
  resolvePricingPlanAction,
  resolveProviderCheckoutPricing,
  upgradeCreditsDelta,
  USD_CNY_RATE,
} from './pricing';

const pack = listPricingProducts().find(
  (p) => p.type === PaymentType.ONE_TIME && p.currencies?.cny != null
)!;
const subscription = listPricingProducts().find(
  (p) => p.type === PaymentType.SUBSCRIPTION
)!;

describe('resolveProviderCheckoutPricing', () => {
  it('fixtures exist', () => {
    expect(pack).toBeTruthy();
    expect(subscription).toBeTruthy();
    // Catalog CNY price: explicit `currencies.cny` (e.g. 7199) or derived
    // from priceInCents × USD_CNY_RATE.
    expect(pack.currencies!.cny).toBeGreaterThan(0);
    expect(
      Math.abs(pack.currencies!.cny - pack.priceInCents * USD_CNY_RATE)
    ).toBeLessThan(100);
  });

  it.each(['alipay', 'wechat'])(
    '%s: one-time pack is always CNY, any locale',
    (provider) => {
      for (const locale of ['en', 'zh', undefined]) {
        for (const requestedCurrency of ['usd', 'cny', undefined]) {
          expect(
            resolveProviderCheckoutPricing(pack, {
              provider,
              locale,
              requestedCurrency,
            })
          ).toEqual({
            ok: true,
            amount: pack.currencies!.cny,
            currency: 'cny',
          });
        }
      }
    }
  );

  it.each(['alipay', 'wechat'])(
    '%s: subscriptions are rejected',
    (provider) => {
      expect(
        resolveProviderCheckoutPricing(subscription, { provider, locale: 'zh' })
      ).toEqual({ ok: false, reason: 'cny_price_unavailable' });
      expect(isPaymentProviderAvailableForProduct(subscription, provider)).toBe(
        false
      );
    }
  );

  it('alipay: one-time product without a CNY price is rejected', () => {
    const { currencies: _c, ...noCny } = pack;
    expect(
      resolveProviderCheckoutPricing(noCny, { provider: 'alipay' }).ok
    ).toBe(false);
  });

  it('creem: always the USD base price (Creem products are USD/EUR only)', () => {
    for (const locale of ['en', 'zh']) {
      expect(
        resolveProviderCheckoutPricing(pack, {
          provider: 'creem',
          locale,
          requestedCurrency: 'cny',
        })
      ).toEqual({ ok: true, amount: pack.priceInCents, currency: 'usd' });
    }
  });

  it.each(['waffo', 'stripe'])(
    '%s: always USD (video-lite catalog settles in USD)',
    (provider) => {
      expect(
        resolveProviderCheckoutPricing(pack, { provider, locale: 'zh' })
      ).toEqual({ ok: true, amount: pack.priceInCents, currency: 'usd' });
      expect(
        resolveProviderCheckoutPricing(pack, {
          provider,
          locale: 'en',
          requestedCurrency: 'cny',
        })
      ).toEqual({ ok: true, amount: pack.priceInCents, currency: 'usd' });
      expect(
        resolveProviderCheckoutPricing(subscription, {
          provider,
          locale: 'zh',
          requestedCurrency: 'cny',
        })
      ).toEqual({
        ok: true,
        amount: subscription.priceInCents,
        currency: 'usd',
      });
    }
  );
  it('falls back to the catalog USD price when a CNY charge is rejected', () => {
    expect(
      checkoutUsdFallback(pack, { provider: 'waffo', currency: 'cny' })
    ).toEqual({ amount: pack.priceInCents, currency: 'usd' });
    expect(
      checkoutUsdFallback(pack, {
        provider: 'waffo',
        currency: 'cny',
        testAmount: 1,
      })
    ).toEqual({ amount: 1, currency: 'usd' });
    expect(
      checkoutUsdFallback(pack, { provider: 'alipay', currency: 'cny' })
    ).toBeNull();
    expect(
      checkoutUsdFallback(pack, { provider: 'waffo', currency: 'usd' })
    ).toBeNull();
  });
});

describe('formatCheckoutAmount', () => {
  it('formats CNY fen and USD cents', () => {
    expect(formatCheckoutAmount(7199, 'cny')).toBe('¥71.99');
    expect(formatCheckoutAmount(7200, 'CNY')).toBe('¥72');
    expect(formatCheckoutAmount(999, 'usd')).toBe('$9.99');
  });
});

describe('resolvePricingPlanAction (plan changes)', () => {
  const p = (id: string) => getPricingProduct(id)!;

  it('higher tier is an upgrade, lower tier a downgrade (any interval)', () => {
    expect(resolvePricingPlanAction(p('ultra_monthly'), 'pro_monthly')).toBe(
      'upgrade'
    );
    expect(resolvePricingPlanAction(p('lite_monthly'), 'pro_monthly')).toBe(
      'downgrade'
    );
    expect(resolvePricingPlanAction(p('pro_yearly'), 'ultra_monthly')).toBe(
      'downgrade'
    );
    expect(resolvePricingPlanAction(p('ultra_monthly'), 'pro_yearly')).toBe(
      'upgrade'
    );
  });

  it('same tier: yearly → monthly is a downgrade, monthly → yearly a switch', () => {
    expect(resolvePricingPlanAction(p('pro_monthly'), 'pro_yearly')).toBe(
      'downgrade'
    );
    expect(resolvePricingPlanAction(p('pro_yearly'), 'pro_monthly')).toBe(
      'switch'
    );
    expect(resolvePricingPlanAction(p('pro_monthly'), 'pro_monthly')).toBe(
      'current'
    );
  });

  it('no or unknown current plan → subscribe; packs → buy', () => {
    expect(resolvePricingPlanAction(p('pro_monthly'), null)).toBe('subscribe');
    expect(resolvePricingPlanAction(p('pro_monthly'), 'nope')).toBe(
      'subscribe'
    );
    expect(resolvePricingPlanAction(pack, 'pro_monthly')).toBe('buy');
  });
});

describe('planChangeTimingFor', () => {
  it('upgrade/switch now, downgrade at period end', () => {
    expect(planChangeTimingFor('upgrade')).toBe('immediate');
    expect(planChangeTimingFor('switch')).toBe('immediate');
    expect(planChangeTimingFor('downgrade')).toBe('period_end');
    expect(planChangeTimingFor('subscribe')).toBeNull();
    expect(planChangeTimingFor('current')).toBeNull();
  });
});

describe('upgradeCreditsDelta', () => {
  it('grants only the gap, never negative', () => {
    expect(upgradeCreditsDelta('pro_monthly', 'ultra_monthly')).toBe(7000);
    expect(upgradeCreditsDelta('ultra_monthly', 'pro_monthly')).toBe(0);
    expect(upgradeCreditsDelta(null, 'pro_monthly')).toBe(4000);
  });
});

describe('product id mapping', () => {
  it('parses only JSON objects', () => {
    expect(parseProductIdsMapping('{"pro_monthly":"price_1"}')).toEqual({
      pro_monthly: 'price_1',
    });
    expect(parseProductIdsMapping('[1]')).toEqual({});
    expect(parseProductIdsMapping('nope')).toEqual({});
    expect(parseProductIdsMapping(undefined)).toEqual({});
  });

  it('reverse-maps provider ids to catalog ids', () => {
    const map = { pro_monthly: 'pdt_pro', ultra_monthly: ' pdt_ultra ' };
    expect(resolveCatalogIdFromProviderProductId(map, 'pdt_pro')).toBe(
      'pro_monthly'
    );
    expect(resolveCatalogIdFromProviderProductId(map, 'pdt_ultra')).toBe(
      'ultra_monthly'
    );
    expect(resolveCatalogIdFromProviderProductId(map, 'pro_yearly')).toBe(
      'pro_yearly'
    );
    expect(resolveCatalogIdFromProviderProductId(map, 'pdt_x')).toBeNull();
    expect(resolveCatalogIdFromProviderProductId(map, '')).toBeNull();
  });
});

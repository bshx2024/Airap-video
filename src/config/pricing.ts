/**
 * Authoritative pricing catalog.
 *
 * The checkout API uses this as the SOURCE OF TRUTH for price/credits/duration.
 * Any price, credits, or plan info sent by the client is IGNORED — only the
 * product_id is honored, and everything else is looked up here.
 *
 * Display copy lives in messages/*.json (landing.pricing.*), keyed by copyKey.
 * To change pricing, edit this file and redeploy. Admin UI cannot alter prices.
 *
 * CNY: `currencies.cny` is fen (分). Display strings use USD_CNY_RATE (7.2)
 * to keep zh strikethrough / monthly / yearly labels in sync with charge amounts.
 *
 * Plan credits are sized so sell price stays ≈ $0.005–0.0067 / credit against
 * model costs priced for max(APIMart, KIE) with ≥2× coverage (see ai-models.ts).
 */

import { PaymentInterval, PaymentType } from '@/core/payment/types';

/** USD → CNY display/charge rate (aligns with pixany: $9.99 → ¥71.99) */
export const USD_CNY_RATE = 7.2;

export type PricingPlanInfo = {
  name: string;
  interval: PaymentInterval;
  intervalCount: number;
};

export type PricingCopyKey =
  | 'lite'
  | 'pro'
  | 'ultra'
  | 'starter_pack'
  | 'pro_pack'
  | 'ultra_pack';

export type PricingBadgeKey = 'popular' | 'save_10' | 'save_15' | 'save_18';

export type PricingButtonKey = 'subscribe' | 'buy_once';

export type PricingCreditsKey = 'month' | 'year' | 'pack';

export type PricingProduct = {
  productId: string;
  productName: string;
  planName: string;
  description: string;
  type: PaymentType;
  priceInCents: number;
  currency: string;
  /** Optional per-currency charge amounts (minor units). e.g. cny fen */
  currencies?: Record<string, number>;
  credits: number;
  creditsValidDays?: number;
  plan?: PricingPlanInfo;
  featured?: boolean;
  copyKey: PricingCopyKey;
  badgeKey?: PricingBadgeKey;
  buttonKey: PricingButtonKey;
  creditsKey: PricingCreditsKey;
  monthlyDisplayPrice?: string;
  monthlyDisplayPriceZh?: string;
  originalPrice?: string;
  originalPriceZh?: string;
  yearlyBilledAmount?: string;
  yearlyBilledAmountZh?: string;
};

export type PricingTabKey = 'monthly' | 'yearly' | 'lifetime';

export const PRICING_FAQ_KEYS = [
  'renew',
  'upgrade',
  'scheduled',
  'expiry',
  'pack',
  'cost',
  'fail',
  'invoice',
  'refund',
] as const;

function cnyFenFromUsdCents(usdCents: number): number {
  return Math.round(usdCents * USD_CNY_RATE);
}

function cnyFenToDisplay(fen: number): string {
  const yuan = fen / 100;
  return Number.isInteger(yuan) ? `¥${yuan}` : `¥${yuan.toFixed(2)}`;
}

/** Convert a USD display like "$9.9" / "$106.8" → "¥71.3" / "¥769" */
export function usdDisplayToCnyDisplay(usdDisplay: string): string {
  const n = Number(String(usdDisplay).replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(n)) return usdDisplay;
  const cny = Math.round(n * USD_CNY_RATE * 10) / 10;
  return `¥${Number.isInteger(cny) ? cny : cny.toFixed(1)}`;
}

function withCnyDisplay(product: PricingProduct): PricingProduct {
  const currencies = {
    ...(product.currencies || {}),
    cny: product.currencies?.cny ?? cnyFenFromUsdCents(product.priceInCents),
  };
  return {
    ...product,
    currencies,
    monthlyDisplayPriceZh:
      product.monthlyDisplayPriceZh ??
      (product.monthlyDisplayPrice
        ? usdDisplayToCnyDisplay(product.monthlyDisplayPrice)
        : undefined),
    originalPriceZh:
      product.originalPriceZh ??
      (product.originalPrice
        ? usdDisplayToCnyDisplay(product.originalPrice)
        : undefined),
    yearlyBilledAmountZh:
      product.yearlyBilledAmountZh ??
      (product.yearlyBilledAmount
        ? usdDisplayToCnyDisplay(product.yearlyBilledAmount)
        : undefined),
  };
}

export function isZhLocale(locale?: string | null): boolean {
  return Boolean(locale && locale.split('-')[0] === 'zh');
}

/**
 * /pricing always settles in USD (subscriptions + credit packs), regardless
 * of locale. Creem/Waffo product IDs are USD; CNY checkout is unsupported.
 */
export function shouldUseCny(
  _product: PricingProduct,
  _locale?: string | null
): boolean {
  return false;
}

export function getLocalizedDisplayPrices(
  product: PricingProduct,
  locale?: string | null
) {
  const zh = shouldUseCny(product, locale);
  return {
    monthlyDisplayPrice: zh
      ? product.monthlyDisplayPriceZh || product.monthlyDisplayPrice
      : product.monthlyDisplayPrice,
    originalPrice: zh
      ? product.originalPriceZh || product.originalPrice
      : product.originalPrice,
    yearlyBilledAmount: zh
      ? product.yearlyBilledAmountZh || product.yearlyBilledAmount
      : product.yearlyBilledAmount,
  };
}

export function resolvePricingAmount(
  product: PricingProduct,
  requestedCurrency?: string | null
): { amount: number; currency: string } {
  const currency = (requestedCurrency || '').toLowerCase();
  if (currency === 'cny' && product.currencies?.cny != null) {
    return { amount: product.currencies.cny, currency: 'cny' };
  }
  return { amount: product.priceInCents, currency: product.currency };
}

/** Checkout currency: always USD for /pricing (subscriptions + credit packs). */
export function resolveCheckoutPricing(
  product: PricingProduct,
  _opts?: { locale?: string | null; requestedCurrency?: string | null }
): { amount: number; currency: string } {
  return resolvePricingAmount(product, 'usd');
}

/** Alipay / WeChat Pay settle in CNY only (amount = fen). */
export const CNY_ONLY_PAYMENT_PROVIDERS: readonly string[] = [
  'alipay',
  'wechat',
];

/**
 * Providers that always charge the price fixed on their own product in the
 * provider dashboard. Creem products can only be priced in USD/EUR, so their
 * orders use the catalog base currency (USD) whatever the locale.
 */
export const BASE_CURRENCY_PAYMENT_PROVIDERS: readonly string[] = [
  'creem',
  'dodo',
];

export type ProviderCheckoutPricing =
  | { ok: true; amount: number; currency: string }
  | { ok: false; reason: 'cny_price_unavailable' };

/**
 * Price an order for the provider that will actually charge it, so
 * order.amount/currency equals what the provider charges (verified later).
 * - alipay/wechat: CNY price (`currencies.cny`, derived via USD_CNY_RATE);
 *   rejected for subscriptions / products without a CNY price.
 * - creem: catalog base currency (USD).
 * - stripe/waffo/others: catalog checkout pricing (USD for this product).
 */
export function resolveProviderCheckoutPricing(
  product: PricingProduct,
  opts: {
    provider?: string | null;
    locale?: string | null;
    requestedCurrency?: string | null;
  }
): ProviderCheckoutPricing {
  const provider = String(opts.provider || '').toLowerCase();
  if (CNY_ONLY_PAYMENT_PROVIDERS.includes(provider)) {
    if (
      product.type === PaymentType.ONE_TIME &&
      product.currencies?.cny != null
    ) {
      return { ok: true, amount: product.currencies.cny, currency: 'cny' };
    }
    return { ok: false, reason: 'cny_price_unavailable' };
  }
  if (BASE_CURRENCY_PAYMENT_PROVIDERS.includes(provider)) {
    return { ok: true, ...resolvePricingAmount(product) };
  }
  return {
    ok: true,
    ...resolveCheckoutPricing(product, {
      locale: opts.locale,
      requestedCurrency: opts.requestedCurrency,
    }),
  };
}

/**
 * When a provider rejects the CNY charge (product only has USD enabled),
 * retry the same order at the catalog USD price. Alipay/WeChat stay CNY-only.
 */
export function checkoutUsdFallback(
  product: PricingProduct,
  opts: { provider?: string | null; currency: string; testAmount?: number }
): { amount: number; currency: 'usd' } | null {
  const provider = String(opts.provider || '').toLowerCase();
  if (opts.currency.toLowerCase() !== 'cny') return null;
  if (CNY_ONLY_PAYMENT_PROVIDERS.includes(provider)) return null;
  if (product.currency?.toLowerCase() !== 'usd' || product.priceInCents <= 0) {
    return null;
  }
  const testAmount = opts.testAmount ?? 0;
  return {
    amount: testAmount > 0 ? testAmount : product.priceInCents,
    currency: 'usd',
  };
}

/** Whether `provider` can charge `product` at all (UI provider filtering). */
export function isPaymentProviderAvailableForProduct(
  product: PricingProduct,
  provider: string
): boolean {
  return resolveProviderCheckoutPricing(product, { provider }).ok;
}

/** Minor units → display string ($9.99 / ¥71.99). */
export function formatCheckoutAmount(amount: number, currency: string): string {
  const c = String(currency || '').toLowerCase();
  if (c === 'cny') return cnyFenToDisplay(amount);
  const major = amount / 100;
  const n = Number.isInteger(major) ? `${major}` : major.toFixed(2);
  return c === 'usd' ? `$${n}` : `${n} ${c.toUpperCase()}`;
}

/**
 * Default demo catalog. Replace with your real products when launching.
 * Keys MUST match what the pricing UI sends as product_id.
 */
const pricingCatalogRaw: Record<string, PricingProduct> = {
  lite_monthly: {
    productId: 'lite_monthly',
    productName: 'Starter',
    planName: 'Starter',
    description: 'Starter Monthly - Casual roasts and TikTok trends',
    type: PaymentType.SUBSCRIPTION,
    priceInCents: 990,
    currency: 'usd',
    credits: 1800,
    creditsValidDays: 30,
    monthlyDisplayPrice: '$9.9',
    originalPrice: '$14.9',
    copyKey: 'lite',
    buttonKey: 'subscribe',
    creditsKey: 'month',
    plan: { name: 'Starter', interval: PaymentInterval.MONTH, intervalCount: 1 },
  },
  pro_monthly: {
    productId: 'pro_monthly',
    productName: 'Creator Pro',
    planName: 'Creator Pro',
    description: 'Creator Pro Monthly - Migos Orange Studio & Kling 4.0 Cinema',
    featured: true,
    badgeKey: 'popular',
    type: PaymentType.SUBSCRIPTION,
    priceInCents: 1990,
    currency: 'usd',
    credits: 4000,
    creditsValidDays: 30,
    monthlyDisplayPrice: '$19.9',
    originalPrice: '$29.9',
    copyKey: 'pro',
    buttonKey: 'subscribe',
    creditsKey: 'month',
    plan: { name: 'Creator Pro', interval: PaymentInterval.MONTH, intervalCount: 1 },
  },
  ultra_monthly: {
    productId: 'ultra_monthly',
    productName: 'Studio Master',
    planName: 'Studio Master',
    description: 'Studio Master Monthly - Unlimited volume & priority queue',
    type: PaymentType.SUBSCRIPTION,
    priceInCents: 4990,
    currency: 'usd',
    credits: 11000,
    creditsValidDays: 30,
    monthlyDisplayPrice: '$49.9',
    originalPrice: '$69.9',
    copyKey: 'ultra',
    buttonKey: 'subscribe',
    creditsKey: 'month',
    plan: { name: 'Studio Master', interval: PaymentInterval.MONTH, intervalCount: 1 },
  },
  lite_yearly: {
    productId: 'lite_yearly',
    productName: 'Starter',
    planName: 'Starter',
    description: 'Starter Yearly - 22,000 credits, casual roasts and TikTok trends',
    badgeKey: 'save_10',
    type: PaymentType.SUBSCRIPTION,
    priceInCents: 10680,
    currency: 'usd',
    credits: 22000,
    creditsValidDays: 365,
    monthlyDisplayPrice: '$8.9',
    originalPrice: '$9.9',
    yearlyBilledAmount: '$106.8',
    copyKey: 'lite',
    buttonKey: 'subscribe',
    creditsKey: 'year',
    plan: { name: 'Starter', interval: PaymentInterval.YEAR, intervalCount: 1 },
  },
  pro_yearly: {
    productId: 'pro_yearly',
    productName: 'Creator Pro',
    planName: 'Creator Pro',
    description: 'Creator Pro Yearly - 50,000 credits, Migos Orange Studio & Kling 4.0 Cinema',
    featured: true,
    badgeKey: 'save_15',
    type: PaymentType.SUBSCRIPTION,
    priceInCents: 20280,
    currency: 'usd',
    credits: 50000,
    creditsValidDays: 365,
    monthlyDisplayPrice: '$16.9',
    originalPrice: '$19.9',
    yearlyBilledAmount: '$202.8',
    copyKey: 'pro',
    buttonKey: 'subscribe',
    creditsKey: 'year',
    plan: { name: 'Creator Pro', interval: PaymentInterval.YEAR, intervalCount: 1 },
  },
  ultra_yearly: {
    productId: 'ultra_yearly',
    productName: 'Studio Master',
    planName: 'Studio Master',
    description: 'Studio Master Yearly - 135,000 credits, unlimited volume & priority queue',
    badgeKey: 'save_18',
    type: PaymentType.SUBSCRIPTION,
    priceInCents: 47880,
    currency: 'usd',
    credits: 135000,
    creditsValidDays: 365,
    monthlyDisplayPrice: '$39.9',
    originalPrice: '$49.9',
    yearlyBilledAmount: '$478.8',
    copyKey: 'ultra',
    buttonKey: 'subscribe',
    creditsKey: 'year',
    plan: { name: 'Studio Master', interval: PaymentInterval.YEAR, intervalCount: 1 },
  },
  credits_lite: {
    productId: 'credits_lite',
    productName: 'Starter Pack',
    planName: 'Starter Pack',
    description: 'Starter credit pack - 500 credits, test viral rap memes',
    type: PaymentType.ONE_TIME,
    priceInCents: 490,
    currency: 'usd',
    credits: 500,
    creditsValidDays: 365,
    monthlyDisplayPrice: '$4.9',
    copyKey: 'starter_pack',
    buttonKey: 'buy_once',
    creditsKey: 'pack',
  },
  credits_pro: {
    productId: 'credits_pro',
    productName: 'Creator Pack',
    planName: 'Creator Pack',
    description: 'Creator credit pack - 1,500 credits, multi-video rap battles',
    featured: true,
    badgeKey: 'popular',
    type: PaymentType.ONE_TIME,
    priceInCents: 1290,
    currency: 'usd',
    credits: 1500,
    creditsValidDays: 365,
    monthlyDisplayPrice: '$12.9',
    copyKey: 'pro_pack',
    buttonKey: 'buy_once',
    creditsKey: 'pack',
  },
  credits_ultra: {
    productId: 'credits_ultra',
    productName: 'Studio Pack',
    planName: 'Studio Pack',
    description: 'Studio credit pack - 3,500 credits, bulk studio production',
    type: PaymentType.ONE_TIME,
    priceInCents: 2490,
    currency: 'usd',
    credits: 3500,
    creditsValidDays: 365,
    monthlyDisplayPrice: '$24.9',
    copyKey: 'ultra_pack',
    buttonKey: 'buy_once',
    creditsKey: 'pack',
  },
};

export const pricingCatalog: Record<string, PricingProduct> =
  Object.fromEntries(
    Object.entries(pricingCatalogRaw).map(([id, product]) => [
      id,
      withCnyDisplay(product),
    ])
  ) as Record<string, PricingProduct>;

export const PRICING_GROUPS: Record<PricingTabKey, PricingProduct[]> = {
  monthly: [
    pricingCatalog.lite_monthly,
    pricingCatalog.pro_monthly,
    pricingCatalog.ultra_monthly,
  ],
  yearly: [
    pricingCatalog.lite_yearly,
    pricingCatalog.pro_yearly,
    pricingCatalog.ultra_yearly,
  ],
  lifetime: [
    pricingCatalog.credits_lite,
    pricingCatalog.credits_pro,
    pricingCatalog.credits_ultra,
  ],
};

export function getPricingProduct(productId: string): PricingProduct | null {
  if (!productId) return null;
  return pricingCatalog[productId] ?? null;
}

export function listPricingProducts(): PricingProduct[] {
  return Object.values(pricingCatalog);
}

/** Lite=1, Pro=2, Ultra=3 — used for upgrade/downgrade CTA on /pricing. */
export function getSubscriptionTier(productId: string): {
  tier: number;
  interval: 'month' | 'year' | null;
} {
  const product = getPricingProduct(productId);
  if (!product || product.type !== PaymentType.SUBSCRIPTION) {
    return { tier: 0, interval: null };
  }
  const tier =
    product.copyKey === 'lite'
      ? 1
      : product.copyKey === 'pro'
        ? 2
        : product.copyKey === 'ultra'
          ? 3
          : 0;
  const interval =
    product.plan?.interval === PaymentInterval.YEAR
      ? 'year'
      : product.plan?.interval === PaymentInterval.MONTH
        ? 'month'
        : null;
  return { tier, interval };
}

export type PricingPlanAction =
  | 'subscribe'
  | 'current'
  | 'upgrade'
  | 'downgrade'
  | 'switch'
  | 'buy';

/**
 * Industry-standard pricing CTA for an authenticated subscriber:
 * - same plan → current (disabled)
 * - higher tier / better interval → upgrade or switch (allowed)
 * - lower tier → downgrade (manage via billing)
 * - credit packs → always buyable
 */
export function resolvePricingPlanAction(
  target: PricingProduct,
  currentProductId?: string | null
): PricingPlanAction {
  if (target.type === PaymentType.ONE_TIME) return 'buy';
  if (!currentProductId) return 'subscribe';
  if (target.productId === currentProductId) return 'current';

  const current = getSubscriptionTier(currentProductId);
  const next = getSubscriptionTier(target.productId);
  if (!current.tier || !next.tier) return 'subscribe';
  if (next.tier > current.tier) return 'upgrade';
  if (next.tier < current.tier) return 'downgrade';
  // Same tier, different interval: year→month is a downgrade; month→year is switch.
  if (next.interval && current.interval && next.interval !== current.interval) {
    if (current.interval === 'year' && next.interval === 'month') {
      return 'downgrade';
    }
    return 'switch';
  }
  return 'current';
}

/** Parse a `<provider>_product_ids_mapping` config value; `{}` when invalid. */
export function parseProductIdsMapping(
  raw?: string | null
): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

/** Catalog product_id → provider product/price id from admin mapping. */
export function resolveMappedProviderProductId(
  map: Record<string, string>,
  catalogProductId: string
): string | null {
  const direct = map[catalogProductId];
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  return null;
}

/**
 * Reverse of resolveMappedProviderProductId: provider product/price id →
 * catalog id. A value that already is a catalog id is returned as-is.
 */
export function resolveCatalogIdFromProviderProductId(
  map: Record<string, string>,
  providerProductId?: string | null
): string | null {
  const id = String(providerProductId || '').trim();
  if (!id) return null;
  for (const [catalogId, mapped] of Object.entries(map)) {
    if (typeof mapped === 'string' && mapped.trim() === id) {
      if (pricingCatalog[catalogId]) return catalogId;
    }
  }
  return pricingCatalog[id] ? id : null;
}

/**
 * When a plan change from the current subscription takes effect:
 * upgrades (higher tier, or monthly→yearly on the same tier) apply now with
 * proration; downgrades (lower tier, or yearly→monthly) at period end.
 */
export function planChangeTimingFor(
  action: PricingPlanAction
): 'immediate' | 'period_end' | null {
  if (action === 'upgrade' || action === 'switch') return 'immediate';
  if (action === 'downgrade') return 'period_end';
  return null;
}

/**
 * Credits granted when an upgrade applies mid-period: the gap between the
 * two plans' per-period credits (never negative).
 */
export function upgradeCreditsDelta(
  fromProductId?: string | null,
  toProductId?: string | null
): number {
  const from = fromProductId ? getPricingProduct(fromProductId) : null;
  const to = toProductId ? getPricingProduct(toProductId) : null;
  if (!to || to.type !== PaymentType.SUBSCRIPTION) return 0;
  return Math.max(0, (to.credits || 0) - (from?.credits || 0));
}

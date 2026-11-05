'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { tDynamic } from '@/core/i18n/dynamic';
import { useRouter } from '@/core/i18n/navigation';
import { PaymentType } from '@/core/payment/types';
import {
  formatCheckoutAmount,
  getLocalizedDisplayPrices,
  getPricingProduct,
  isPaymentProviderAvailableForProduct,
  PRICING_FAQ_KEYS,
  PRICING_GROUPS,
  resolvePricingPlanAction,
  resolveProviderCheckoutPricing,
  shouldUseCny,
  type PricingPlanAction,
  type PricingProduct,
  type PricingTabKey,
} from '@/config/pricing';
import {
  canResumeSubscription,
  classifyPlanChange,
  isSubscriptionEnding,
  PendingChangeType,
  planCardAction,
  planChangeSupport,
  resumeMode,
} from '@/modules/payment/plan-change';
import type { PlanChangeOutcome } from '@/modules/payment/plan-change-service';
import {
  opensProviderPage,
  planChangeStep,
  providerDisplayName,
} from '@/modules/payment/plan-change-ui';
import { apiGet, apiPost } from '@/lib/api-client';
import { apiErrorMessage } from '@/lib/api-error-message';
import { currentPathWithQuery } from '@/lib/redirect';
import { formatDate } from '@/lib/time';
import { m } from '@/paraglide/messages.js';
import { getLocale, localizeHref } from '@/paraglide/runtime.js';
import { useExternalRedirect } from '@/hooks/use-external-redirect';
import { usePublicConfig } from '@/hooks/use-public-config';
import {
  PaymentProviderModal,
  type PaymentProvider,
} from '@/components/payment-provider-modal';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const ALL_PROVIDERS: PaymentProvider[] = [
  'stripe',
  'creem',
  'waffo',
  'dodo',
  'paypal',
  'alipay',
  'wechat',
];

const PRICING_TABS: Array<{
  key: PricingTabKey;
  label: () => string;
  badge?: () => string;
}> = [
  { key: 'monthly', label: () => m['landing.pricing.monthly']() },
  {
    key: 'yearly',
    label: () => m['landing.pricing.yearly'](),
    badge: () => m['landing.pricing.tab.yearly_badge'](),
  },
  { key: 'lifetime', label: () => m['landing.pricing.tab.packs']() },
];

function planName(product: PricingProduct) {
  return tDynamic(`landing.pricing.plan.${product.copyKey}.name`);
}

function creditsLine(product: PricingProduct) {
  const credits = product.credits.toLocaleString('en-US');
  if (product.creditsKey === 'year') {
    return m['landing.pricing.feature.credits_year']({ credits });
  }
  if (product.creditsKey === 'pack') {
    return m['landing.pricing.feature.credits_pack']({ credits });
  }
  return m['landing.pricing.feature.credits_month']({ credits });
}

function getPlanFeatures(
  product: PricingProduct,
  locale?: string | null
): string[] {
  const isZh = Boolean(locale && locale.startsWith('zh'));
  const credits = creditsLine(product);

  if (product.copyKey === 'lite') {
    return isZh
      ? [
          credits,
          '约可制作 5 条 15秒 Kling 4.0 旗舰视频 或 15 条 5秒极速视频',
          '支持 720P / 1080P 高清 9:16 竖屏短视频导出',
          'AI 押韵填词、808 Trap 伴奏与自动卡点',
          '标准生成队列，100% 免版税伴奏商用授权',
        ]
      : [
          credits,
          '~5 full 15s Kling 4.0 battle videos or ~15 fast 5s duo videos',
          '720P / 1080P vertical 9:16 TikTok & Shorts export',
          'AI rhyme engine, 808 Trap beats & beat-sync',
          'Standard queue, 100% royalty-free commercial clearance',
        ];
  }

  if (product.copyKey === 'pro') {
    return isZh
      ? [
          credits,
          '约可制作 11 条 15秒 Kling 4.0 旗舰视频 或 33 条 5秒极速视频',
          '全权限解锁 Kling 4.0 电影级录音棚 & Seedance 2.5',
          '经典橙色录音棚双人互怼专属模板',
          'VIP 极速优先队列，无水印 1080P 超清渲染',
          '完整商业变现许可与免版税原声音轨',
        ]
      : [
          credits,
          '~11 full 15s Kling 4.0 cinema videos or ~33 fast 5s duo videos',
          'Full access to Kling 4.0 Cinema & Seedance 2.5',
          'Iconic Orange Studio & Duo Battle presets',
          'VIP priority fast queue, watermark-free 1080P',
          'Full commercial monetization rights & clean audio',
        ];
  }

  if (product.copyKey === 'ultra') {
    return isZh
      ? [
          credits,
          '约可制作 30+ 条 15秒 Kling 4.0 录音室视频 或 90+ 条极速视频',
          '独占最高优先级 GPU 算力通道，秒级排队响应',
          '支持多轨对骂、双人同框与自制伴奏上传',
          '支持多任务并发生成与团队批量生产',
          '1 对 1 专属技术支持与企业级商用保障',
        ]
      : [
          credits,
          '~30+ full 15s Kling 4.0 studio videos or ~90+ fast duo videos',
          'Top priority GPU rendering cluster with zero wait',
          'Multi-track rap vocals & custom audio track upload',
          'Concurrent multi-task generation for studio teams',
          '1-on-1 priority support & enterprise commercial license',
        ];
  }

  if (product.copyKey === 'starter_pack') {
    return isZh
      ? [
          credits,
          '无月度订阅压力，一次性付费',
          '可生成 4-5 条 Wan 2.6 视频或尝鲜测试',
          '支持 9:16 竖屏导出与免版税伴奏',
        ]
      : [
          credits,
          'No subscription commitment, pay once',
          'Make 4-5 Wan 2.6 rap videos or quick tests',
          '9:16 vertical export & royalty-free beats',
        ];
  }

  if (product.copyKey === 'pro_pack') {
    return isZh
      ? [
          credits,
          '1 年超长有效期，随时按需调用',
          '约可制作 4 条 15秒 Kling 4.0 旗舰视频 或 12 条 5秒极速视频',
          '解锁全部录音棚预设与 1080P 导出',
        ]
      : [
          credits,
          'Valid for 1 full year, use whenever needed',
          'Make ~4 full 15s Kling 4.0 videos or ~12 fast 5s duo videos',
          'Unlocks all studio presets & 1080P export',
        ];
  }

  return isZh
    ? [
        credits,
        '超大容量 3,500 算力点数，1 年有效期',
        '单次加油最划算方案，批量做号首选',
        'VIP 优先渲染队列与全模型访问权限',
      ]
    : [
        credits,
        '3,500 high-capacity credits, valid for 1 year',
        'Best value one-time pack for bulk content',
        'VIP fast queue & access to all models',
      ];
}

function planActionLabel(action: PricingPlanAction) {
  switch (action) {
    case 'buy':
      return m['landing.pricing.button.buy_once']();
    case 'current':
      return m['landing.pricing.button.current_plan']();
    case 'upgrade':
      return m['landing.pricing.button.upgrade']();
    case 'downgrade':
      return m['landing.pricing.button.downgrade']();
    case 'switch':
      return m['landing.pricing.button.switch_plan']();
    default:
      return m['landing.pricing.button.subscribe']();
  }
}

type CurrentSubscription = {
  subscriptionNo?: string | null;
  productId?: string | null;
  status?: string | null;
  paymentProvider?: string | null;
  currentPeriodEnd?: string | null;
  canceledEndAt?: string | null;
  canceledReasonType?: string | null;
  pendingProductId?: string | null;
  pendingEffectiveAt?: string | null;
  pendingChangeType?: string | null;
  awaiting_confirmation?: { product_id: string } | null;
} | null;

type DowngradeState =
  | { kind: 'ok'; date: string | null }
  | { kind: 'scheduled'; date: string | null }
  | { kind: 'ending'; date: string | null }
  | { kind: 'pending_other' }
  | { kind: 'unsupported' };

function downgradeState(
  product: PricingProduct,
  sub: CurrentSubscription
): DowngradeState {
  if (sub?.pendingProductId) {
    if (sub.pendingProductId === product.productId) {
      return {
        kind: 'scheduled',
        date: sub.pendingEffectiveAt || sub.currentPeriodEnd || null,
      };
    }
    return { kind: 'pending_other' };
  }
  if (isSubscriptionEnding(sub)) {
    return { kind: 'ending', date: endingDate(sub) };
  }
  if (planChangeSupport(sub?.paymentProvider).periodEnd === 'unsupported') {
    return { kind: 'unsupported' };
  }
  return { kind: 'ok', date: sub?.currentPeriodEnd || null };
}

function endingDate(sub: CurrentSubscription) {
  return sub?.canceledEndAt || sub?.currentPeriodEnd || null;
}

/**
 * Upgrade/switch when a confirmed plan change is already booked (Waffo
 * only), or the current plan is canceled and ending (no other plan until
 * it ends, like downgrades).
 */
type UpgradePendingState =
  | { kind: 'ok' }
  | { kind: 'scheduled'; date: string | null }
  | { kind: 'pending_other' }
  | { kind: 'ending'; date: string | null };

function upgradePendingState(
  product: PricingProduct,
  sub: CurrentSubscription
): UpgradePendingState {
  const ending: UpgradePendingState | null = isSubscriptionEnding(sub)
    ? { kind: 'ending', date: endingDate(sub) }
    : null;
  if (!sub?.pendingProductId) return ending ?? { kind: 'ok' };
  // Stripe/Dodo/Creem upgrades apply in place and never book an upgrade; the
  // only booked "upgrade" there is yearly → higher monthly at period end.
  // Other pending_* (downgrade/resubscribe) keep the plain toast guard.
  if (sub.paymentProvider !== 'waffo') {
    return sub.pendingProductId === product.productId
      ? {
          kind: 'scheduled',
          date: sub.pendingEffectiveAt || sub.currentPeriodEnd || null,
        }
      : (ending ?? { kind: 'ok' });
  }
  if (sub.pendingProductId === product.productId) {
    return {
      kind: 'scheduled',
      date: sub.pendingEffectiveAt || sub.currentPeriodEnd || null,
    };
  }
  return { kind: 'pending_other' };
}

export function Pricing({
  id = 'pricing',
  showFaq = true,
  className,
  isSection = false,
}: {
  id?: string;
  showFaq?: boolean;
  className?: string;
  isSection?: boolean;
} = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const { data: configsData } = usePublicConfig();
  const configs = configsData ?? {};
  const [activeTab, setActiveTab] = useState<PricingTabKey>('monthly');
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<PricingProduct | null>(
    null
  );
  const [loadingProvider, setLoadingProvider] =
    useState<PaymentProvider | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [changeTarget, setChangeTarget] = useState<{
    product: PricingProduct;
    action: PricingPlanAction;
  } | null>(null);
  const [changeError, setChangeError] = useState<string | null>(null);
  // Lower-tier yearly → higher-tier monthly: "yearly now" or "monthly at
  // period end" (never deferred silently; see classifyPlanChange).
  const [choiceTarget, setChoiceTarget] = useState<{
    product: PricingProduct;
    yearlyProduct: PricingProduct | null;
  } | null>(null);
  const [choice, setChoice] = useState<'yearly' | 'monthly'>('yearly');
  const [mounted, setMounted] = useState(false);
  const { redirecting, redirect } = useExternalRedirect(() => {
    setChangeTarget(null);
    setChoiceTarget(null);
    setChangeError(null);
    setLoadingId(null);
    setLoadingProvider(null);
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentSubQuery = useQuery({
    queryKey: ['billing', 'current', session?.user?.id ?? null],
    queryFn: () =>
      apiGet<CurrentSubscription>('/api/user/subscriptions/current'),
    enabled: Boolean(session?.user),
    staleTime: 30_000,
  });
  const currentSub = session?.user ? (currentSubQuery.data ?? null) : null;
  const currentProductId = currentSub?.productId || null;
  const currentSupport = planChangeSupport(currentSub?.paymentProvider);
  // Canceling plan the customer can resume in-app
  // (Stripe / Dodo / Creem / Waffo).
  const resumable = canResumeSubscription(currentSub);
  const resumeMutation = useMutation({
    mutationFn: (subscriptionNo: string) =>
      apiPost('/api/user/subscriptions/resume', { subscriptionNo }),
    onSuccess: () => {
      toast.success(m['settings.billing.resume_success']());
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err) || m['errors.resume_failed']());
    },
  });
  const resumeCurrent = () => {
    if (!currentSub?.subscriptionNo) return;
    if (resumeMode(currentSub) === 'in_app') {
      resumeMutation.mutate(currentSub.subscriptionNo);
    } else {
      portalMutation.mutate();
    }
  };
  const portalMutation = useMutation({
    mutationFn: () =>
      apiPost<{ url: string }>('/api/user/subscriptions/portal', {
        locale: getLocale(),
      }),
    onSuccess: (res) => redirect(res.url),
    onError: (err) => {
      toast.error(apiErrorMessage(err) || m['errors.portal_failed']());
    },
  });
  const localDate = (value?: string | null) =>
    mounted && value ? formatDate(value) : '—';

  const enabledProviders = useMemo<PaymentProvider[]>(
    () => ALL_PROVIDERS.filter((p) => configs[`${p}_enabled`] === 'true'),
    [configs]
  );

  const locale = getLocale();

  const products = PRICING_GROUPS[activeTab] || [];

  const checkoutMutation = useMutation({
    mutationFn: ({
      product,
      provider,
    }: {
      product: PricingProduct;
      provider: PaymentProvider;
    }) =>
      apiPost<{ checkout_url?: string }>('/api/payment/checkout', {
        product_id: product.productId,
        payment_provider: provider,
        currency: shouldUseCny(product, locale) ? 'cny' : 'usd',
        locale,
        redirect: localizeHref(
          product.type === PaymentType.SUBSCRIPTION
            ? '/settings/billing'
            : '/settings/credits'
        ),
      }),
    onSuccess: (data) => {
      if (!data?.checkout_url) {
        toast.error(m['common.error.checkout_failed']());
        setLoadingProvider(null);
        setLoadingId(null);
        return;
      }
      redirect(data.checkout_url);
    },
    onError: (err: unknown) => {
      toast.error(apiErrorMessage(err) || m['common.error.checkout_failed']());
      setLoadingProvider(null);
      setLoadingId(null);
    },
  });

  const changeMutation = useMutation({
    mutationFn: ({
      product,
      acceptPeriodEnd,
    }: {
      product: PricingProduct;
      acceptPeriodEnd?: boolean;
    }) =>
      apiPost<PlanChangeOutcome>('/api/user/subscriptions/change', {
        product_id: product.productId,
        locale,
        ...(acceptPeriodEnd ? { accept_period_end: true } : {}),
      }),
    onSuccess: (outcome, { product }) => {
      const step = planChangeStep(outcome);
      switch (step.kind) {
        case 'redirect':
          redirect(step.url);
          return;
        case 'invalid':
          setChangeError(m['errors.plan_change_failed']());
          setLoadingId(null);
          return;
        case 'checkout':
          closeChangeDialog();
          proceedToCheckout(product);
          return;
        case 'done':
          break;
      }
      closeChangeDialog();
      switch (step.toast) {
        case 'applied':
          toast.success(
            m['landing.pricing.toast.upgrade_applied']({
              plan: planName(product),
            })
          );
          break;
        case 'processing':
          toast.info(m['landing.pricing.toast.upgrade_processing']());
          break;
        case 'resubscribe_scheduled':
          toast.success(
            m['landing.pricing.toast.resubscribe_scheduled']({
              date: localDate(step.effectiveAt),
            })
          );
          break;
        case 'change_scheduled':
          toast.success(
            m['landing.pricing.toast.change_scheduled']({
              date: localDate(step.effectiveAt),
            })
          );
          break;
        case 'downgrade_scheduled':
          toast.success(
            m['landing.pricing.toast.downgrade_scheduled']({
              date: localDate(step.effectiveAt),
            })
          );
          break;
      }
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      router.push('/settings/billing');
    },
    onError: (err: unknown) => {
      setChangeError(apiErrorMessage(err) || m['errors.plan_change_failed']());
      setLoadingId(null);
    },
  });

  const changeBusy = changeMutation.isPending || redirecting;

  function closeChangeDialog() {
    setChangeTarget(null);
    setChoiceTarget(null);
    setChangeError(null);
    setLoadingId(null);
  }

  function startPlanChange(product: PricingProduct, acceptPeriodEnd?: boolean) {
    if (changeBusy) return;
    setChangeError(null);
    setLoadingId(product.productId);
    changeMutation.mutate({ product, acceptPeriodEnd });
  }

  // Monthly at period end is only offered when the provider can book it.
  const choiceMonthlySupported = currentSupport.periodEnd !== 'unsupported';

  function confirmChoice() {
    if (!choiceTarget || changeBusy) return;
    if (choice === 'monthly') {
      if (!choiceMonthlySupported) return;
      startPlanChange(choiceTarget.product, true);
      return;
    }
    const { yearlyProduct } = choiceTarget;
    if (!yearlyProduct) return;
    if (currentSupport.immediate === 'checkout') {
      // No in-place upgrade on this provider: a fresh checkout replaces it.
      closeChangeDialog();
      proceedToCheckout(yearlyProduct);
      return;
    }
    startPlanChange(yearlyProduct);
  }

  function startCheckout(product: PricingProduct, provider: PaymentProvider) {
    setLoadingId(product.productId);
    setLoadingProvider(provider);
    checkoutMutation.mutate({ product, provider });
  }

  function handleCheckout(product: PricingProduct) {
    if (!session?.user) {
      const callbackUrl = encodeURIComponent(currentPathWithQuery('/pricing'));
      router.push(`/sign-in?callbackUrl=${callbackUrl}`);
      return;
    }

    const action = resolvePricingPlanAction(product, currentProductId);
    if (action === 'current') {
      router.push('/settings/billing');
      return;
    }

    if (planCardAction(action, Boolean(currentSub)) === 'change') {
      if (action === 'downgrade') {
        const state = downgradeState(product, currentSub);
        if (state.kind === 'scheduled') {
          router.push('/settings/billing');
          return;
        }
        if (state.kind !== 'ok') return;
        setChangeError(null);
        setChangeTarget({ product, action });
        return;
      }
      // Upgrade / switch: same pending guard as downgrade (grey + billing).
      if (action === 'upgrade' || action === 'switch') {
        // Lower-tier yearly → higher-tier monthly: let the customer choose.
        const change = classifyPlanChange(currentProductId, product.productId);
        if (
          change.intent === 'upgrade_to_monthly' &&
          currentSub?.status !== 'pending_cancel' &&
          !currentSub?.pendingProductId
        ) {
          const yearlyProduct = change.suggestedProductId
            ? (getPricingProduct(change.suggestedProductId) ?? null)
            : null;
          setChangeError(null);
          setChoice(yearlyProduct ? 'yearly' : 'monthly');
          setChoiceTarget({ product, yearlyProduct });
          return;
        }
        const pending = upgradePendingState(product, currentSub);
        // Current plan canceled and ending: the card is disabled.
        if (pending.kind === 'ending') return;
        if (pending.kind === 'scheduled') {
          router.push('/settings/billing');
          return;
        }
        // Any provider: an existing pending change blocks another change.
        if (pending.kind === 'pending_other' || currentSub?.pendingProductId) {
          toast.error(
            currentSupport.undo
              ? m['errors.plan_change_pending']()
              : m['errors.plan_change_pending_locked']()
          );
          return;
        }
      }
      if (
        currentSub?.status !== 'pending_cancel' &&
        currentSupport.immediate !== 'checkout'
      ) {
        setChangeError(null);
        setChangeTarget({ product, action });
        return;
      }
    }

    proceedToCheckout(product);
  }

  function proceedToCheckout(product: PricingProduct) {
    const selectEnabled = configs.select_payment_enabled === 'true';
    const defaultProvider = (configs.default_payment_provider ||
      enabledProviders[0] ||
      'stripe') as PaymentProvider;
    // Alipay/WeChat can't charge subscriptions (CNY one-time packs only).
    const productProviders = providersForProduct(product);

    if (selectEnabled && productProviders.length > 1) {
      setPendingProduct(product);
      setModalOpen(true);
      return;
    }

    startCheckout(
      product,
      isPaymentProviderAvailableForProduct(product, defaultProvider)
        ? defaultProvider
        : productProviders[0] || defaultProvider
    );
  }

  function providersForProduct(product: PricingProduct): PaymentProvider[] {
    return enabledProviders.filter((p) =>
      isPaymentProviderAvailableForProduct(product, p)
    );
  }

  // "Charged as ¥71.99" when a provider charges in a different currency than
  // the price shown (en + Alipay/WeChat → CNY; zh pack + Creem → USD).
  function providerChargeNotes(
    product: PricingProduct
  ): Partial<Record<PaymentProvider, string>> {
    const shownCurrency = shouldUseCny(product, locale) ? 'cny' : 'usd';
    const notes: Partial<Record<PaymentProvider, string>> = {};
    for (const p of providersForProduct(product)) {
      const pricing = resolveProviderCheckoutPricing(product, {
        provider: p,
        locale,
        requestedCurrency: shownCurrency,
      });
      if (pricing.ok && pricing.currency !== shownCurrency) {
        notes[p] = m['common.pricing.charged_as']({
          price: formatCheckoutAmount(pricing.amount, pricing.currency),
        });
      }
    }
    return notes;
  }

  const HeadingTag = isSection ? 'h2' : 'h1';

  const currentProduct = currentProductId
    ? getPricingProduct(currentProductId)
    : null;
  const choiceOpensProvider =
    !!choiceTarget &&
    opensProviderPage(
      currentSupport,
      choice === 'monthly' ? 'downgrade' : 'upgrade'
    );
  const choiceOption = (
    value: 'yearly' | 'monthly',
    label: string,
    desc: string,
    opts: { badge?: string; disabled?: boolean; hint?: string } = {}
  ) => (
    <button
      type="button"
      role="radio"
      aria-checked={choice === value}
      disabled={opts.disabled || changeBusy}
      onClick={() => setChoice(value)}
      className={`flex w-full flex-col gap-1 rounded-lg border p-3 text-left transition-colors ${
        choice === value
          ? 'border-primary bg-primary/5'
          : 'border-border hover:bg-muted/50'
      } ${opts.disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <span className="text-foreground flex items-center gap-2 font-medium">
        {label}
        {opts.badge && (
          <span className="bg-primary text-primary-foreground rounded px-1.5 py-0.5 text-xs">
            {opts.badge}
          </span>
        )}
      </span>
      <span className="text-muted-foreground text-sm">{desc}</span>
      {opts.hint && (
        <span className="text-muted-foreground text-xs">{opts.hint}</span>
      )}
    </button>
  );

  const choiceDialog = (
    <ConfirmDialog
      open={!!choiceTarget}
      onOpenChange={(open) => {
        if (!open && !changeBusy) closeChangeDialog();
      }}
      variant="default"
      isLoading={changeBusy}
      closeOnConfirm={false}
      loadingText={
        choiceOpensProvider
          ? m['landing.pricing.change.redirecting']({
              provider: providerDisplayName(currentSub?.paymentProvider),
            })
          : m['landing.pricing.change.processing']()
      }
      loadingHint={
        choiceOpensProvider
          ? m['landing.pricing.change.redirect_hint']({
              provider: providerDisplayName(currentSub?.paymentProvider),
            })
          : m['landing.pricing.change.processing_hint']({
              provider: providerDisplayName(currentSub?.paymentProvider),
            })
      }
      error={changeError}
      title={
        choiceTarget
          ? m['landing.pricing.choice.title']({
              plan: planName(choiceTarget.product),
            })
          : ''
      }
      description={
        choiceTarget ? (
          <span className="flex flex-col gap-3" role="radiogroup">
            <span>
              {m['landing.pricing.choice.intro']({
                current: currentProduct ? planName(currentProduct) : '',
                date: localDate(currentSub?.currentPeriodEnd),
              })}
            </span>
            {choiceTarget.yearlyProduct &&
              choiceOption(
                'yearly',
                m['landing.pricing.choice.yearly_label']({
                  plan: planName(choiceTarget.yearlyProduct),
                }),
                m['landing.pricing.choice.yearly_desc']({
                  price: formatCheckoutAmount(
                    choiceTarget.yearlyProduct.priceInCents,
                    choiceTarget.yearlyProduct.currency
                  ),
                }),
                { badge: m['landing.pricing.choice.recommended']() }
              )}
            {choiceOption(
              'monthly',
              m['landing.pricing.choice.monthly_label']({
                plan: planName(choiceTarget.product),
                date: localDate(currentSub?.currentPeriodEnd),
              }),
              m['landing.pricing.choice.monthly_desc']({
                current: currentProduct ? planName(currentProduct) : '',
                plan: planName(choiceTarget.product),
                date: localDate(currentSub?.currentPeriodEnd),
                price: formatCheckoutAmount(
                  choiceTarget.product.priceInCents,
                  choiceTarget.product.currency
                ),
              }),
              {
                disabled: !choiceMonthlySupported,
                hint: !choiceMonthlySupported
                  ? m['landing.pricing.choice.monthly_unsupported']()
                  : currentSupport.periodEnd === 'cancel_then_resubscribe'
                    ? m['landing.pricing.change.resubscribe_gap']({
                        date: localDate(currentSub?.currentPeriodEnd),
                      })
                    : undefined,
              }
            )}
            {currentSupport.immediate === 'confirm' && (
              <span>{m['landing.pricing.change.confirm_page']()}</span>
            )}
          </span>
        ) : undefined
      }
      confirmText={
        choice === 'monthly'
          ? m['landing.pricing.choice.confirm_monthly']()
          : m['landing.pricing.choice.confirm_yearly']()
      }
      onConfirm={confirmChoice}
    />
  );

  return (
    <section
      id={id}
      className={
        isSection
          ? `border-border scroll-mt-28 px-[clamp(1rem,2.5vw,3rem)] py-20 transition-colors sm:scroll-mt-32 sm:py-28 ${className || ''}`
          : `bg-background text-foreground w-full py-12 md:py-20 ${className || ''}`
      }
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-14">
          <HeadingTag className="font-serif text-3xl font-normal tracking-[-0.02em] sm:text-5xl lg:text-6xl">
            {m['landing.pricing.title']()}
          </HeadingTag>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-sm leading-6 sm:text-base">
            {m['landing.pricing.description']()}
          </p>
        </div>

        <div className="mb-10 flex justify-center sm:mb-12">
          <div className="flex overflow-x-auto pb-1">
            <div className="border-border bg-muted/55 mx-auto inline-flex shrink-0 items-center rounded-full border p-1 shadow-sm">
              {PRICING_TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setActiveTab(tab.key)}
                    className={`focus-visible:ring-ring flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-[background-color,color,box-shadow] focus-visible:ring-2 focus-visible:outline-none sm:px-5 ${
                      isActive
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>{tab.label()}</span>
                    {tab.badge && (
                      <span className="bg-primary/10 text-primary hidden rounded-full px-2 py-0.5 text-[11px] font-semibold sm:inline-flex">
                        {tab.badge()}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl items-stretch gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {products.map((product) => {
            const isFeatured = product.featured;
            const loading = loadingId === product.productId;
            const display = getLocalizedDisplayPrices(product, locale);
            const action = resolvePricingPlanAction(product, currentProductId);
            const isCurrent = action === 'current';
            const isDowngrade = action === 'downgrade';
            const isUpgradeLike = action === 'upgrade' || action === 'switch';
            const downgrade =
              isDowngrade && currentSub
                ? downgradeState(product, currentSub)
                : null;
            const upgradePending =
              isUpgradeLike && currentSub
                ? upgradePendingState(product, currentSub)
                : null;
            const downgradeBlocked = !!downgrade && downgrade.kind !== 'ok';
            const upgradeBlocked =
              !!upgradePending && upgradePending.kind !== 'ok';
            const features = getPlanFeatures(product, locale);

            return (
              <div
                key={product.productId}
                className={`relative flex h-full flex-col rounded-2xl border p-6 transition-[border-color,box-shadow,transform] sm:p-7 ${
                  isCurrent
                    ? 'border-primary/50 bg-primary/5 ring-primary/10 shadow-sm ring-1'
                    : isFeatured
                      ? 'border-primary/70 bg-card ring-primary/15 shadow-md ring-1 lg:-translate-y-1'
                      : 'border-border bg-background hover:border-foreground/25 hover:shadow-sm'
                }`}
              >
                {isCurrent ? (
                  <span className="bg-primary text-primary-foreground absolute top-5 right-5 rounded-full px-2.5 py-1 text-[11px] font-semibold">
                    {m['landing.pricing.button.current_plan']()}
                  </span>
                ) : (
                  product.badgeKey && (
                    <span className="bg-primary/10 text-primary absolute top-5 right-5 rounded-full px-2.5 py-1 text-[11px] font-semibold">
                      {tDynamic(`landing.pricing.badge.${product.badgeKey}`)}
                    </span>
                  )
                )}

                <p className="text-foreground mb-3 pr-20 text-sm font-semibold tracking-wide">
                  {planName(product)}
                </p>

                <div className="mb-2 flex items-end gap-1.5">
                  <span className="text-4xl font-semibold tracking-[-0.04em] tabular-nums sm:text-5xl">
                    {display.monthlyDisplayPrice}
                  </span>
                  {product.type === PaymentType.SUBSCRIPTION && (
                    <span className="text-muted-foreground pb-1 text-sm">
                      {m['landing.pricing.per_month']()}
                    </span>
                  )}
                </div>

                <div className="flex min-h-5 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  {display.originalPrice && (
                    <span className="text-muted-foreground text-xs line-through">
                      {display.originalPrice}
                    </span>
                  )}
                  {display.yearlyBilledAmount && (
                    <span className="text-muted-foreground text-xs">
                      {m['landing.pricing.billed_yearly']({
                        amount: display.yearlyBilledAmount,
                      })}
                    </span>
                  )}
                </div>

                <p className="text-muted-foreground mt-1 mb-6 text-sm leading-5">
                  {tDynamic(
                    `landing.pricing.plan.${product.copyKey}.description`
                  )}
                </p>

                <Button
                  type="button"
                  disabled={
                    loading ||
                    redirecting ||
                    portalMutation.isPending ||
                    resumeMutation.isPending ||
                    (isCurrent && !resumable) ||
                    (downgradeBlocked && downgrade?.kind !== 'scheduled') ||
                    (upgradeBlocked && upgradePending?.kind !== 'scheduled')
                  }
                  onClick={() =>
                    isCurrent && resumable
                      ? resumeCurrent()
                      : handleCheckout(product)
                  }
                  variant={
                    isCurrent && resumable
                      ? 'default'
                      : isCurrent || downgradeBlocked || upgradeBlocked
                        ? 'secondary'
                        : action === 'upgrade' || isFeatured
                          ? 'default'
                          : 'outline'
                  }
                  className="h-10 w-full rounded-full text-sm font-semibold"
                >
                  {loading ||
                  (isCurrent &&
                    (portalMutation.isPending || resumeMutation.isPending))
                    ? '...'
                    : isCurrent && resumable
                      ? m['landing.pricing.button.resume']()
                      : downgrade?.kind === 'scheduled'
                        ? m['landing.pricing.button.downgrade_scheduled']()
                        : upgradePending?.kind === 'scheduled'
                          ? m['landing.pricing.button.upgrade_scheduled']()
                          : planActionLabel(action)}
                </Button>
                <p className="text-muted-foreground mt-2 text-center text-[11px]">
                  {currentSub?.awaiting_confirmation?.product_id ===
                    product.productId &&
                  (!downgrade || downgrade.kind === 'ok') &&
                  (!upgradePending || upgradePending.kind === 'ok')
                    ? m['landing.pricing.note.awaiting_confirmation']()
                    : upgradePending?.kind === 'scheduled'
                      ? currentSub?.pendingChangeType ===
                        PendingChangeType.UPGRADE
                        ? m['landing.pricing.note.upgrade_activating']()
                        : m['landing.pricing.note.takes_effect_on']({
                            date: localDate(upgradePending.date),
                          })
                      : upgradePending?.kind === 'pending_other'
                        ? m['landing.pricing.note.change_pending']()
                        : upgradePending?.kind === 'ending'
                          ? resumable
                            ? m['landing.pricing.note.resume_first']()
                            : m['landing.pricing.note.available_after']({
                                date: localDate(upgradePending.date),
                              })
                          : !downgrade
                            ? null
                            : downgrade.kind === 'ok' ||
                                downgrade.kind === 'scheduled'
                              ? m['landing.pricing.note.takes_effect_on']({
                                  date: localDate(downgrade.date),
                                })
                              : downgrade.kind === 'ending'
                                ? resumable
                                  ? m['landing.pricing.note.resume_first']()
                                  : m['landing.pricing.note.available_after']({
                                      date: localDate(downgrade.date),
                                    })
                                : downgrade.kind === 'pending_other'
                                  ? m['landing.pricing.note.change_pending']()
                                  : m[
                                      'landing.pricing.note.change_unsupported'
                                    ]()}
                </p>

                <ul className="mt-6 space-y-3">
                  {features.map((label, idx) => (
                    <li
                      key={idx}
                      className={`flex items-start gap-2.5 text-sm ${
                        idx === 0
                          ? 'border-primary/10 bg-primary/[0.055] rounded-xl border px-3 py-2.5 font-medium'
                          : ''
                      }`}
                    >
                      <Check
                        className={`mt-0.5 size-4 shrink-0 ${
                          idx === 0 ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      />
                      <span className="text-foreground/90 leading-5">
                        {label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {showFaq && (
          <section id="pricing-faq" className="scroll-mt-20 pt-20 sm:pt-24">
            <div className="border-border grid gap-10 border-t pt-14 sm:pt-16 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-16">
              <div className="lg:pt-2">
                <h2 className="max-w-md font-serif text-2xl font-normal tracking-[-0.02em] sm:text-3xl">
                  {m['landing.pricing.faq_title']()}
                </h2>
                <p className="text-muted-foreground mt-4 max-w-md text-sm leading-6">
                  {m['landing.pricing.faq_description']()}
                </p>
              </div>

              <Accordion className="border-border border-y">
                {PRICING_FAQ_KEYS.map((id) => (
                  <AccordionItem key={id} value={id} className="border-border">
                    <AccordionTrigger className="cursor-pointer py-5 text-left text-sm font-semibold hover:no-underline sm:py-6 sm:text-base">
                      {tDynamic(`landing.pricing.faq.${id}.question`)}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-5 text-sm leading-relaxed sm:pb-6">
                      {tDynamic(`landing.pricing.faq.${id}.answer`)}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>
        )}
      </div>

      <ConfirmDialog
        open={!!changeTarget}
        onOpenChange={(open) => {
          if (!open && !changeBusy) closeChangeDialog();
        }}
        variant={changeTarget?.action === 'downgrade' ? 'warning' : 'default'}
        isLoading={changeBusy}
        closeOnConfirm={false}
        loadingText={
          changeTarget && opensProviderPage(currentSupport, changeTarget.action)
            ? m['landing.pricing.change.redirecting']({
                provider: providerDisplayName(currentSub?.paymentProvider),
              })
            : m['landing.pricing.change.processing']()
        }
        loadingHint={
          changeTarget && opensProviderPage(currentSupport, changeTarget.action)
            ? m['landing.pricing.change.redirect_hint']({
                provider: providerDisplayName(currentSub?.paymentProvider),
              })
            : m['landing.pricing.change.processing_hint']({
                provider: providerDisplayName(currentSub?.paymentProvider),
              })
        }
        error={changeError}
        title={
          changeTarget
            ? changeTarget.action === 'downgrade'
              ? m['landing.pricing.change.downgrade_title']({
                  plan: planName(changeTarget.product),
                })
              : m['landing.pricing.change.upgrade_title']({
                  plan: planName(changeTarget.product),
                })
            : ''
        }
        description={
          changeTarget ? (
            <span className="flex flex-col gap-2">
              {changeTarget.action === 'downgrade' ? (
                currentSupport.periodEnd === 'cancel_then_resubscribe' ? (
                  <>
                    <span>
                      {m['landing.pricing.change.resubscribe_desc']({
                        date: localDate(currentSub?.currentPeriodEnd),
                        plan: planName(changeTarget.product),
                      })}
                    </span>
                    <span>
                      {m['landing.pricing.change.resubscribe_gap']({
                        date: localDate(currentSub?.currentPeriodEnd),
                      })}
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      {m['landing.pricing.change.downgrade_desc']({
                        date: localDate(currentSub?.currentPeriodEnd),
                        plan: planName(changeTarget.product),
                      })}
                    </span>
                    <span>{m['landing.pricing.change.no_refund']()}</span>
                    <span className="font-medium">
                      {currentSupport.undo
                        ? m['landing.pricing.change.undo_hint']()
                        : m['landing.pricing.change.cannot_undo']()}
                    </span>
                  </>
                )
              ) : currentSupport.immediate === 'confirm' ? (
                <span>
                  {m['landing.pricing.change.upgrade_confirm_page']()}
                </span>
              ) : (
                <>
                  <span>{m['landing.pricing.change.upgrade_desc']()}</span>
                  <span>{m['landing.pricing.change.upgrade_credits']()}</span>
                </>
              )}
              {currentSupport.immediate === 'confirm' &&
                changeTarget.action === 'downgrade' && (
                  <span>{m['landing.pricing.change.confirm_page']()}</span>
                )}
            </span>
          ) : undefined
        }
        confirmText={
          changeTarget?.action === 'downgrade'
            ? m['landing.pricing.change.confirm_downgrade']()
            : m['landing.pricing.change.confirm_upgrade']()
        }
        onConfirm={() => {
          if (changeTarget) startPlanChange(changeTarget.product);
        }}
      />

      {choiceDialog}

      <PaymentProviderModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            setPendingProduct(null);
            setLoadingProvider(null);
            setLoadingId(null);
          }
        }}
        providers={
          pendingProduct
            ? providersForProduct(pendingProduct)
            : enabledProviders.length
              ? enabledProviders
              : ['stripe']
        }
        providerNotes={
          pendingProduct ? providerChargeNotes(pendingProduct) : undefined
        }
        loadingProvider={loadingProvider}
        onSelect={(provider) => {
          if (!pendingProduct) return;
          startCheckout(pendingProduct, provider);
        }}
        planName={pendingProduct ? planName(pendingProduct) : undefined}
        price={
          pendingProduct
            ? getLocalizedDisplayPrices(pendingProduct, locale)
                .monthlyDisplayPrice
            : undefined
        }
      />
    </section>
  );
}

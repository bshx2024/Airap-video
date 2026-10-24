/**
 * Exact outgoing parameters of every plan-change / cancel call, checked
 * against the provider docs + SDK types. A provider rejecting a parameter
 * combination (e.g. Dodo: next_billing_date needs full_immediately) only
 * shows up live, so the request bodies are pinned here.
 */
import { generateKeyPairSync } from 'crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CreemProvider } from './creem';
import { DodoProvider } from './dodo';
import { StripeProvider } from './stripe';
import { WAFFO_PLAN_CHANGE_EVENTS, WaffoProvider } from './waffo';

const NOW = Math.floor(Date.now() / 1000);
const PERIOD_START = NOW - 10 * 86400;
const PERIOD_END = NOW + 20 * 86400;

// ── Dodo ────────────────────────────────────────────────────────────────

function dodo() {
  const p = new DodoProvider({
    apiKey: 'k',
    webhookKey: 'whsec_test',
    environment: 'test_mode',
  });
  const calls = {
    changePlan: vi.fn(async () => ({})),
    cancelChangePlan: vi.fn(async () => undefined),
    update: vi.fn(async (id: string, body: any) => ({
      subscription_id: id,
      status: 'active',
      product_id: 'pdt_pro',
      next_billing_date: '2026-11-11T00:00:00Z',
      ...body,
    })),
    retrieve: vi.fn(async (id: string) => ({
      subscription_id: id,
      status: 'active',
      product_id: 'pdt_pro',
      payment_frequency_interval: 'Month',
      next_billing_date: '2026-11-11T00:00:00Z',
      scheduled_change: {
        product_id: 'pdt_lite',
        effective_at: '2026-11-11T00:00:00Z',
      },
    })),
  };
  (p as any).client = { subscriptions: calls };
  return { p, calls };
}

describe('Dodo plan-change params', () => {
  it('period end: next_billing_date + full_immediately (the only allowed mode)', async () => {
    const { p, calls } = dodo();
    const r = await p.changeSubscriptionPlan({
      subscriptionId: 'sub_1',
      productId: 'pdt_lite',
      timing: 'period_end',
    });
    expect(calls.changePlan).toHaveBeenCalledWith('sub_1', {
      product_id: 'pdt_lite',
      quantity: 1,
      proration_billing_mode: 'full_immediately',
      effective_at: 'next_billing_date',
      cancel_scheduled_change_plan: true,
    });
    expect(r.status).toBe('scheduled');
    expect(r.effectiveAt).toEqual(new Date('2026-11-11T00:00:00Z'));
  });

  it('immediate: prorated_immediately (credit unused time, cycle resets) + prevent_change', async () => {
    const { p, calls } = dodo();
    await p.changeSubscriptionPlan({
      subscriptionId: 'sub_1',
      productId: 'pdt_ultra',
      timing: 'immediate',
    });
    expect(calls.changePlan).toHaveBeenCalledWith('sub_1', {
      product_id: 'pdt_ultra',
      quantity: 1,
      proration_billing_mode: 'prorated_immediately',
      effective_at: 'immediately',
      cancel_scheduled_change_plan: true,
      on_payment_failure: 'prevent_change',
    });
  });

  describe('immediate 409 PendingPlanChangeExists → state from Dodo', () => {
    const conflict = Object.assign(new Error('409 PendingPlanChangeExists'), {
      status: 409,
    });
    function pending(productId: string, payments: any[] | Error) {
      const { p, calls } = dodo();
      calls.changePlan.mockRejectedValueOnce(conflict);
      (calls.retrieve as any).mockResolvedValueOnce({
        subscription_id: 'sub_1',
        status: 'active',
        product_id: productId,
        payment_frequency_interval: 'Month',
        previous_billing_date: '2026-10-19T00:00:00Z',
        next_billing_date: '2026-11-19T00:00:00Z',
        scheduled_change: null,
      });
      const list = vi.fn(async () => {
        if (payments instanceof Error) throw payments;
        return { items: payments };
      });
      (p as any).client.payments = { list };
      const run = () =>
        p.changeSubscriptionPlan({
          subscriptionId: 'sub_1',
          productId: 'pdt_ultra',
          timing: 'immediate',
        });
      return { run, list };
    }
    const at = (min: number) =>
      new Date(Date.now() - min * 60_000).toISOString();

    it('already switched → applied with the new period', async () => {
      const { run, list } = pending('pdt_ultra', []);
      const r = await run();
      expect(r.status).toBe('applied');
      expect(r.subscriptionInfo?.currentPeriodStart).toEqual(
        new Date('2026-10-19T00:00:00Z')
      );
      expect(list).not.toHaveBeenCalled();
    });

    it('newest payment still open → processing', async () => {
      const { run } = pending('pdt_pro', [
        { status: 'failed', created_at: at(30) },
        { status: 'requires_customer_action', created_at: at(5) },
      ]);
      expect((await run()).status).toBe('processing');
    });

    it('older payment still open → processing even if a newer one failed', async () => {
      const { run } = pending('pdt_pro', [
        { status: 'requires_customer_action', created_at: at(30) },
        { status: 'failed', created_at: at(2) },
      ]);
      expect((await run()).status).toBe('processing');
    });

    it('newest payment failed → failed', async () => {
      const { run, list } = pending('pdt_pro', [
        { status: 'succeeded', created_at: at(600) },
        { status: 'failed', created_at: at(2) },
      ]);
      expect((await run()).status).toBe('failed');
      expect(list).toHaveBeenCalledWith(
        expect.objectContaining({ subscription_id: 'sub_1' })
      );
    });

    it('payment lookup error → processing (never a second charge)', async () => {
      const { run } = pending('pdt_pro', new Error('boom'));
      vi.spyOn(console, 'error').mockImplementationOnce(() => {});
      expect((await run()).status).toBe('processing');
    });

    it('other 409s and period-end changes still throw', async () => {
      const { p, calls } = dodo();
      calls.changePlan.mockRejectedValueOnce(
        Object.assign(new Error('409 payment in progress'), { status: 409 })
      );
      await expect(
        p.changeSubscriptionPlan({
          subscriptionId: 'sub_1',
          productId: 'pdt_ultra',
          timing: 'immediate',
        })
      ).rejects.toThrow('payment in progress');
      calls.changePlan.mockRejectedValueOnce(conflict);
      await expect(
        p.changeSubscriptionPlan({
          subscriptionId: 'sub_1',
          productId: 'pdt_lite',
          timing: 'period_end',
        })
      ).rejects.toBe(conflict);
    });
  });

  it('undo = DELETE scheduled change; cancel = cancel_at_next_billing_date', async () => {
    const { p, calls } = dodo();
    await p.cancelScheduledPlanChange({ subscriptionId: 'sub_1' });
    expect(calls.cancelChangePlan).toHaveBeenCalledWith('sub_1');
    const s = await p.cancelSubscription({ subscriptionId: 'sub_1' });
    expect(calls.update).toHaveBeenCalledWith('sub_1', {
      cancel_at_next_billing_date: true,
    });
    expect(s.subscriptionInfo?.canceledEndAt).toEqual(
      new Date('2026-11-11T00:00:00Z')
    );
  });
});

// ── Stripe ──────────────────────────────────────────────────────────────

function stripeSub(extra: Record<string, any> = {}) {
  return {
    id: 'sub_1',
    status: 'active',
    metadata: {},
    schedule: null,
    cancel_at_period_end: false,
    cancel_at: null,
    canceled_at: null,
    items: {
      data: [
        {
          id: 'si_1',
          current_period_start: PERIOD_START,
          current_period_end: PERIOD_END,
          price: {
            id: 'price_pro',
            product: 'prod_pro',
            unit_amount: 1990,
            currency: 'usd',
          },
          plan: { interval: 'month', interval_count: 1 },
        },
      ],
    },
    ...extra,
  };
}

function stripe(subExtra: Record<string, any> = {}) {
  const p = Object.create(StripeProvider.prototype) as StripeProvider;
  const schedule = {
    id: 'sub_sched_1',
    status: 'active',
    phases: [
      {
        start_date: PERIOD_START,
        end_date: PERIOD_END,
        items: [
          {
            price: { id: 'price_pro', active: true },
            quantity: 1,
          },
        ],
        discounts: [],
      },
    ],
  };
  const calls = {
    retrieve: vi.fn(async () => stripeSub(subExtra)),
    update: vi.fn(async (_id: string, body: any) =>
      stripeSub({
        cancel_at_period_end: !!body.cancel_at_period_end,
        items: {
          data: [
            {
              ...stripeSub().items.data[0],
              price: {
                ...stripeSub().items.data[0].price,
                id: body.items?.[0]?.price || 'price_pro',
              },
            },
          ],
        },
      })
    ),
    cancel: vi.fn(),
    schedCreate: vi.fn(async () => schedule),
    schedRetrieve: vi.fn(async () => schedule),
    schedUpdate: vi.fn(async (id: string) => ({ ...schedule, id })),
    schedRelease: vi.fn(async () => ({})),
  };
  (p as any).client = {
    subscriptions: {
      retrieve: calls.retrieve,
      update: calls.update,
      cancel: calls.cancel,
    },
    subscriptionSchedules: {
      create: calls.schedCreate,
      retrieve: calls.schedRetrieve,
      update: calls.schedUpdate,
      release: calls.schedRelease,
    },
    prices: { retrieve: vi.fn() },
  };
  return { p, calls, schedule };
}

describe('Stripe plan-change params', () => {
  it('immediate: swaps the item price, always_invoice + pending_if_incomplete', async () => {
    const { p, calls } = stripe();
    const r = await p.changeSubscriptionPlan({
      subscriptionId: 'sub_1',
      productId: 'price_ultra',
      timing: 'immediate',
    });
    expect(calls.update).toHaveBeenCalledWith('sub_1', {
      items: [{ id: 'si_1', price: 'price_ultra' }],
      proration_behavior: 'always_invoice',
      payment_behavior: 'pending_if_incomplete',
    });
    expect(r.status).toBe('applied');
  });

  it('period end: schedule from the subscription, phase 2 = new price, released after', async () => {
    const { p, calls } = stripe();
    const r = await p.changeSubscriptionPlan({
      subscriptionId: 'sub_1',
      productId: 'price_lite',
      timing: 'period_end',
      metadata: { subscription_no: 'S1' },
    });
    expect(calls.schedCreate).toHaveBeenCalledWith({
      from_subscription: 'sub_1',
      expand: ['phases.items.price'],
    });
    expect(calls.schedUpdate).toHaveBeenCalledWith('sub_sched_1', {
      end_behavior: 'release',
      proration_behavior: 'none',
      phases: [
        {
          items: [{ price: 'price_pro', quantity: 1 }],
          start_date: PERIOD_START,
          end_date: PERIOD_END,
          proration_behavior: 'none',
        },
        {
          items: [{ price: 'price_lite', quantity: 1 }],
          iterations: 1,
          proration_behavior: 'none',
        },
      ],
      metadata: { subscription_no: 'S1' },
    });
    // Phase 1 must not set `iterations` alongside end_date (Stripe rule).
    const phases = (calls.schedUpdate.mock.calls[0] as any)[1].phases;
    expect(phases[0].iterations).toBeUndefined();
    expect(phases[1].end_date).toBeUndefined();
    expect(r).toMatchObject({
      status: 'scheduled',
      scheduleId: 'sub_sched_1',
      effectiveAt: new Date(PERIOD_END * 1000),
    });
  });

  it('rejects an unmapped (non price_) id before calling Stripe', async () => {
    const { p, calls } = stripe();
    await expect(
      p.changeSubscriptionPlan({
        subscriptionId: 'sub_1',
        productId: 'lite-monthly',
        timing: 'period_end',
      })
    ).rejects.toThrow();
    expect(calls.retrieve).not.toHaveBeenCalled();
  });

  it('cancel at period end releases a pending schedule first', async () => {
    const { p, calls, schedule } = stripe({
      schedule: { id: 'sub_sched_1', status: 'active', phases: [] },
    });
    void schedule;
    const s = await p.cancelSubscription({ subscriptionId: 'sub_1' });
    expect(calls.schedRelease).toHaveBeenCalledWith('sub_sched_1');
    expect(calls.update).toHaveBeenCalledWith('sub_1', {
      cancel_at_period_end: true,
    });
    expect(s.subscriptionInfo?.status).toBe('pending_cancel');
    expect(s.subscriptionInfo?.canceledEndAt).toEqual(
      new Date(PERIOD_END * 1000)
    );
  });

  it('undo releases the stored schedule', async () => {
    const { p, calls } = stripe();
    await p.cancelScheduledPlanChange({
      subscriptionId: 'sub_1',
      scheduleId: 'sub_sched_1',
    });
    expect(calls.schedRelease).toHaveBeenCalledWith('sub_sched_1');
  });

  it('maps dunning statuses instead of throwing (webhook would retry forever)', async () => {
    for (const [status, expected] of [
      ['past_due', 'active'],
      ['unpaid', 'paused'],
      ['incomplete_expired', 'canceled'],
    ] as const) {
      const { p } = stripe();
      const info = await (p as any).buildSubscriptionInfo(
        stripeSub({ status })
      );
      expect(info.status).toBe(expected);
    }
  });
});

// ── Creem ───────────────────────────────────────────────────────────────

describe('Creem plan-change params', () => {
  afterEach(() => vi.unstubAllGlobals());

  function creem() {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body || '{}'));
      return new Response(
        JSON.stringify({
          id: 'sub_1',
          status: body.mode === 'scheduled' ? 'scheduled_cancel' : 'active',
          canceled_at: body.mode ? '2026-10-11T00:00:00Z' : null,
          product: body.product_id || 'prod_pro',
          current_period_start_date: '2026-10-01T00:00:00Z',
          current_period_end_date: '2026-11-01T00:00:00Z',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    const p = new CreemProvider({
      apiKey: 'k',
      signingSecret: 's',
      environment: 'sandbox',
    } as any);
    return { p, fetchMock };
  }

  const sent = (m: any, i = 0) => ({
    url: m.mock.calls[i][0],
    method: m.mock.calls[i][1].method,
    body: JSON.parse(m.mock.calls[i][1].body),
  });

  it('upgrade: POST /upgrade with proration-charge-immediately', async () => {
    const { p, fetchMock } = creem();
    const r = await p.changeSubscriptionPlan({
      subscriptionId: 'sub_1',
      productId: 'prod_ultra',
      timing: 'immediate',
    });
    expect(sent(fetchMock)).toEqual({
      url: 'https://test-api.creem.io/v1/subscriptions/sub_1/upgrade',
      method: 'POST',
      body: {
        product_id: 'prod_ultra',
        update_behavior: 'proration-charge-immediately',
      },
    });
    expect(r.status).toBe('applied');
  });

  it('period end is refused locally (Creem has no scheduled switch)', async () => {
    const { p, fetchMock } = creem();
    await expect(
      p.changeSubscriptionPlan({
        subscriptionId: 'sub_1',
        productId: 'prod_lite',
        timing: 'period_end',
      })
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('cancel: explicit scheduled + onExecute cancel (not the store default)', async () => {
    const { p, fetchMock } = creem();
    await p.cancelSubscription({ subscriptionId: 'sub_1' });
    expect(sent(fetchMock)).toEqual({
      url: 'https://test-api.creem.io/v1/subscriptions/sub_1/cancel',
      method: 'POST',
      body: { mode: 'scheduled', onExecute: 'cancel' },
    });
  });
});

// ── Waffo ───────────────────────────────────────────────────────────────

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

function waffo(environment?: 'test' | 'prod') {
  const p = new WaffoProvider({
    merchantId: 'MER_2D5F8G3H1K4M6N9P0a1b2c',
    privateKey,
    ...(environment ? { environment } : {}),
  } as any);
  const create = vi.fn(async () => ({
    sessionId: 'cs_1',
    checkoutUrl: 'https://pay.waffo.ai/store/x/change/cs_1#token=t',
  }));
  const query = vi.fn(
    async (_p: any): Promise<any> => ({ data: { payments: [] } })
  );
  const cancel = vi.fn(async () => ({
    orderId: 'ORD_new',
    status: 'canceled',
  }));
  (p as any).client.checkout = { authenticated: { create } };
  (p as any).client.graphql = { query };
  (p as any).client.orders = { cancelSubscription: cancel };
  return { p, create, query, cancel };
}

describe('Waffo plan-change params', () => {
  it('period end: originOrderId + changeTiming next_period + our order no', async () => {
    const { p, create } = waffo('test');
    const r = await p.changeSubscriptionPlan({
      subscriptionId: 'ORD_origin',
      productId: 'PROD_lite',
      timing: 'period_end',
      orderNo: 'ORDlocal1',
      customer: { id: 'u1', email: 'a@b.c' },
      currency: 'usd',
      locale: 'zh',
      successUrl: 'https://app.test/zh/settings/billing?plan_change=1',
      metadata: { userId: 'u1', order_no: 'ORDlocal1' },
    });
    expect(create).toHaveBeenCalledTimes(1);
    const body = (create.mock.calls[0] as any)[0];
    expect(body).toMatchObject({
      originOrderId: 'ORD_origin',
      productId: 'PROD_lite',
      currency: 'USD',
      changeTiming: 'next_period',
      orderMerchantExternalId: 'ORDlocal1',
      successUrl: 'https://app.test/zh/settings/billing?plan_change=1',
      metadata: { userId: 'u1', order_no: 'ORDlocal1' },
      buyerIdentity: 'u1',
    });
    // API-key-only fields we must not send by accident.
    expect(body.changeAmount).toBeUndefined();
    expect(body.changeCreditAmount).toBeUndefined();
    expect(body.priceSnapshot).toBeUndefined();
    // test env flag goes before the #token fragment.
    expect(r.confirmUrl).toBe(
      'https://pay.waffo.ai/store/x/change/cs_1?test=true#token=t'
    );
  });

  it('keeps an existing cashier query and the #token when adding test=true', async () => {
    const { p, create } = waffo('test');
    create.mockResolvedValueOnce({
      sessionId: 'cs_1',
      checkoutUrl:
        'https://cashier-sandbox.waffo.com/u/TOKEN?savedCard.cvv=123&needAgreeTerms=on#token=t',
    });
    const r = await p.changeSubscriptionPlan({
      subscriptionId: 'ORD_origin',
      productId: 'PROD_lite',
      timing: 'period_end',
      orderNo: 'ORDlocal1',
      customer: { id: 'u1' },
    });
    expect(r.confirmUrl).toBe(
      'https://cashier-sandbox.waffo.com/u/TOKEN?savedCard.cvv=123&needAgreeTerms=on&test=true#token=t'
    );
  });

  it('immediate upgrade uses changeTiming immediate', async () => {
    const { p, create } = waffo();
    await p.changeSubscriptionPlan({
      subscriptionId: 'ORD_origin',
      productId: 'PROD_ultra',
      timing: 'immediate',
      orderNo: 'ORDlocal2',
      customer: { id: 'u1' },
    });
    expect((create.mock.calls[0] as any)[0].changeTiming).toBe('immediate');
  });

  it('GraphQL queries only use String! (Waffo has no ID scalar) and known fields', async () => {
    const { p, query } = waffo();
    query.mockImplementation(async ({ query: q }: any) =>
      q.includes('payments')
        ? {
            data: {
              payments: [
                { id: 'PAY_1', orderId: 'ORD_new', status: 'succeeded' },
              ],
            },
          }
        : { data: { subscriptionOrder: { id: 'ORD_new', status: 'pending' } } }
    );
    const r = await p.getPlanChangeStatus!({
      orderNo: 'ORDlocal1',
      originOrderId: 'ORD_origin',
    });
    expect(r.state).toBe('scheduled');
    expect(r.providerOrderId).toBe('ORD_new');
    for (const [arg] of query.mock.calls as any[]) {
      expect(arg.query).not.toMatch(/\bID!?\b/);
      expect(arg.query).toMatch(/\$(ref|id): String!/);
      expect(arg.query).toMatch(
        /payments\(filter: \{ orderMerchantExternalId|subscriptionOrder\(id: \$id\)/
      );
    }
  });

  it('cancel calls orders.cancelSubscription with the order id', async () => {
    const { p, cancel } = waffo();
    await p.cancelSubscription({ subscriptionId: 'ORD_new' });
    expect(cancel).toHaveBeenCalledWith({ orderId: 'ORD_new' });
  });

  it('plan-change webhooks fall back to orderMetadata (Waffo omits empty fields)', () => {
    const { p } = waffo();
    const event = (p as any).buildPlanChangeEvent({
      eventType: WAFFO_PLAN_CHANGE_EVENTS.scheduled,
      eventId: 'ORD_new',
      data: {
        orderId: 'ORD_new',
        orderStatus: 'pending',
        currency: 'USD',
        amount: '9.90',
        orderMetadata: { userId: 'u1', order_no: 'ORDlocal1' },
        planChange: { effectiveDate: '2026-11-11T00:00:01.000Z' },
      },
    });
    expect(event.paymentSession.planChange).toMatchObject({
      state: 'scheduled',
      providerOrderId: 'ORD_new',
      merchantOrderNo: 'ORDlocal1',
      buyerIdentity: 'u1',
    });
  });
});

describe('Stripe period-end schedule during a trial', () => {
  it('keeps the current phase trial_end (rewriting phases must not end the trial)', async () => {
    const { p, calls, schedule } = stripe();
    (schedule.phases[0] as any).trial_end = PERIOD_END;
    await p.changeSubscriptionPlan({
      subscriptionId: 'sub_1',
      productId: 'price_lite',
      timing: 'period_end',
    });
    const phases = (calls.schedUpdate.mock.calls[0] as any)[1].phases;
    expect(phases[0].trial_end).toBe(PERIOD_END);
    expect(phases[1].trial_end).toBeUndefined();
  });
});

// ── Status lookups behind billing 「刷新状态」 ─────────────────────────────

describe('getSubscription (processing upgrade refresh)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('Stripe: retrieves the subscription and keeps pending_update visible', async () => {
    const { p, calls } = stripe({
      pending_update: { expires_at: PERIOD_END },
    });
    const s = await p.getSubscription!({ subscriptionId: 'sub_1' });
    expect(calls.retrieve).toHaveBeenCalledWith('sub_1');
    expect(s.subscriptionId).toBe('sub_1');
    expect(s.subscriptionInfo?.planId).toBe('price_pro');
    expect(s.subscriptionInfo?.status).toBe('active');
    expect((s.subscriptionResult as any).pending_update).toEqual({
      expires_at: PERIOD_END,
    });
  });

  it('Dodo: GET /subscriptions/{id} → current product', async () => {
    const { p, calls } = dodo();
    const s = await p.getSubscription!({ subscriptionId: 'sub_9' });
    expect(calls.retrieve).toHaveBeenCalledWith('sub_9');
    expect(s.subscriptionId).toBe('sub_9');
    expect(s.subscriptionInfo?.productId).toBe('pdt_pro');
  });

  it('Creem: GET /v1/subscriptions?subscription_id= → current product', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: 'sub_c',
            status: 'active',
            product: { id: 'prod_ultra' },
            current_period_start_date: '2026-10-01T00:00:00Z',
            current_period_end_date: '2026-11-01T00:00:00Z',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
    );
    vi.stubGlobal('fetch', fetchMock);
    const p = new CreemProvider({
      apiKey: 'k',
      signingSecret: 's',
      environment: 'sandbox',
    } as any);
    const s = await p.getSubscription!({ subscriptionId: 'sub_c' });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toMatch(/\/v1\/subscriptions\?subscription_id=sub_c$/);
    expect(init.method).toBe('GET');
    expect(s.subscriptionInfo?.productId).toBe('prod_ultra');
  });
});

// ── Resume (undo a scheduled cancel), in-app 「恢复订阅」 ──────────────────

describe('resumeSubscription params', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('Stripe: cancel_at_period_end=false → active', async () => {
    const { p, calls } = stripe();
    const s = await p.resumeSubscription!({ subscriptionId: 'sub_1' });
    expect(calls.update).toHaveBeenCalledWith('sub_1', {
      cancel_at_period_end: false,
    });
    expect(s.subscriptionInfo?.status).toBe('active');
  });

  it('Stripe: still canceling after the update → throws', async () => {
    const { p, calls } = stripe();
    calls.update.mockResolvedValueOnce(
      stripeSub({ cancel_at_period_end: true }) as any
    );
    await expect(
      p.resumeSubscription!({ subscriptionId: 'sub_1' })
    ).rejects.toThrow('Resume subscription failed');
  });

  it('Dodo: PATCH cancel_at_next_billing_date=false → active', async () => {
    const { p, calls } = dodo();
    const s = await p.resumeSubscription!({ subscriptionId: 'sub_9' });
    expect(calls.update).toHaveBeenCalledWith('sub_9', {
      cancel_at_next_billing_date: false,
    });
    expect(s.subscriptionInfo?.status).toBe('active');
  });

  it('Creem: POST /v1/subscriptions/{id}/resume → active', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: 'sub_c',
            status: 'active',
            product: 'prod_pro',
            current_period_start_date: '2026-10-01T00:00:00Z',
            current_period_end_date: '2026-11-01T00:00:00Z',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
    );
    vi.stubGlobal('fetch', fetchMock);
    const p = new CreemProvider({
      apiKey: 'k',
      signingSecret: 's',
      environment: 'sandbox',
    } as any);
    const s = await p.resumeSubscription!({ subscriptionId: 'sub_c' });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toMatch(/\/v1\/subscriptions\/sub_c\/resume$/);
    expect(init.method).toBe('POST');
    expect(s.subscriptionInfo?.status).toBe('active');
  });

  it('Waffo: session token → reactivate-order with X-Environment', async () => {
    const seen: Array<{ url: string; headers: Headers; body: any }> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: any, init?: RequestInit) => {
        const url = String(input);
        seen.push({
          url,
          headers: new Headers(init?.headers),
          body: JSON.parse(String(init?.body || '{}')),
        });
        const data = url.endsWith('/issue-session-token')
          ? { token: 'tok_w', expiresAt: '2099-01-01T00:00:00Z' }
          : { orderId: 'ORD_2aUyqjCzEIiEcYMKj7TZtw', status: 'active' };
        return new Response(JSON.stringify({ data }), { status: 200 });
      })
    );
    const p = new WaffoProvider({
      merchantId: 'MER_2D5F8G3H1K4M6N9P0a1b2c',
      privateKey,
      environment: 'test',
    } as any);
    const s = await p.resumeSubscription!({
      subscriptionId: 'ORD_2aUyqjCzEIiEcYMKj7TZtw',
      buyerIdentity: 'user_1',
      productId: 'PROD_5HOIULBVawwiapdLxX9SMf',
    });
    expect(seen.map((r) => r.url.replace(/^https:\/\/[^/]+/, ''))).toEqual([
      '/v1/actions/auth/issue-session-token',
      '/v1/actions/subscription-order/reactivate-order',
    ]);
    expect(seen[0].body).toEqual({
      productId: 'PROD_5HOIULBVawwiapdLxX9SMf',
      buyerIdentity: 'user_1',
    });
    // Fresh token every time (no replayed idempotency key).
    expect(seen[0].headers.get('X-Idempotency-Key')).toBeNull();
    expect(seen[1].body).toEqual({ orderId: 'ORD_2aUyqjCzEIiEcYMKj7TZtw' });
    expect(seen[1].headers.get('Authorization')).toBe('Bearer tok_w');
    // Without it the gateway rejects every customer-session call (SDK < 0.18).
    expect(seen[1].headers.get('X-Environment')).toBe('test');
    expect(s.subscriptionInfo?.status).toBe('active');
  });
});

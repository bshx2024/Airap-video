import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import * as schema from '@/config/db/schema';

/**
 * Daily reconcile: selection runs as real SQL on an in-memory SQLite
 * subscription table; the syncs it dispatches to are mocked (their own
 * behavior is covered in processing-upgrade-sync / lapsed-renewal tests).
 */
const h = vi.hoisted(() => ({
  db: null as any,
  renewal: vi.fn(async (_sub: any, _opts: any) => ({ state: 'applied' })),
  scheduled: vi.fn(async (_sub: any, _opts: any) => ({ state: 'pending' })),
}));

vi.mock('@/core/db', () => ({ db: () => h.db }));
vi.mock('./processing-upgrade-sync', () => ({
  syncLapsedRenewal: h.renewal,
  syncScheduledPlanChange: h.scheduled,
}));

const { findReconcileCandidates, reconcileLapsedSubscriptions, reconcileKind } =
  await import('./renewal-reconcile');

const HOUR = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 20, 16);
let seq = 0;

async function addSub(fields: Record<string, any>) {
  seq += 1;
  await h.db.insert(schema.subscription).values({
    id: `id-${seq}`,
    subscriptionNo: `SUB-${seq}`,
    userId: 'u1',
    status: 'active',
    paymentProvider: 'stripe',
    subscriptionId: `sub_${seq}`,
    currentPeriodEnd: new Date(NOW - 7 * HOUR),
    ...fields,
  });
  return `SUB-${seq}`;
}

async function selected() {
  return (await findReconcileCandidates({ now: NOW })).map(
    (s: any) => s.subscriptionNo
  );
}

beforeAll(async () => {
  h.db = drizzle(createClient({ url: ':memory:' }), { schema });
  const { name, columns } = getTableConfig(schema.subscription);
  const cols = columns.map((c) => `"${c.name}" ${c.getSQLType()}`).join(', ');
  await h.db.run(`CREATE TABLE "${name}" (${cols})` as any);
});

beforeEach(async () => {
  await h.db.delete(schema.subscription);
  h.renewal.mockClear();
  h.scheduled.mockClear();
});

describe('selection', () => {
  it('picks Stripe / Dodo / Creem subscriptions lapsed more than 6h', async () => {
    const stripe = await addSub({ paymentProvider: 'stripe' });
    const dodo = await addSub({ paymentProvider: 'dodo', status: 'trialing' });
    const creem = await addSub({ paymentProvider: 'creem' });
    const waffo = await addSub({ paymentProvider: 'waffo' });
    expect((await selected()).sort()).toEqual(
      [stripe, dodo, creem, waffo].sort()
    );
  });

  it('leaves recent lapses to the billing page and the webhook', async () => {
    await addSub({ currentPeriodEnd: new Date(NOW - 5 * HOUR) });
    await addSub({ currentPeriodEnd: new Date(NOW + 20 * 24 * HOUR) });
    expect(await selected()).toEqual([]);
  });

  it('skips ending, ended, deleted and other-provider subscriptions', async () => {
    await addSub({ status: 'pending_cancel' });
    await addSub({ status: 'canceled' });
    await addSub({ status: 'expired' });
    await addSub({ deletedAt: new Date(NOW - 24 * HOUR) });
    await addSub({ paymentProvider: 'paypal' });
    await addSub({ subscriptionId: '' });
    expect(await selected()).toEqual([]);
  });

  it('picks a Waffo downgrade overdue by more than 6h, even when ending', async () => {
    const due = await addSub({
      paymentProvider: 'waffo',
      status: 'pending_cancel',
      currentPeriodEnd: new Date(NOW - 8 * HOUR),
      pendingProductId: 'lite_monthly',
      pendingChangeType: 'downgrade',
      pendingEffectiveAt: new Date(NOW - 8 * HOUR),
    });
    const noEffective = await addSub({
      paymentProvider: 'waffo',
      currentPeriodEnd: new Date(NOW - 9 * HOUR),
      pendingProductId: 'lite_monthly',
      pendingChangeType: 'downgrade',
    });
    // Not overdue by 6h yet (and the period itself still within 6h too).
    await addSub({
      paymentProvider: 'waffo',
      currentPeriodEnd: new Date(NOW - 2 * HOUR),
      pendingProductId: 'lite_monthly',
      pendingChangeType: 'downgrade',
      pendingEffectiveAt: new Date(NOW - 2 * HOUR),
    });
    await addSub({
      paymentProvider: 'waffo',
      currentPeriodEnd: new Date(NOW + 20 * 24 * HOUR),
      pendingProductId: 'pro_monthly',
      pendingChangeType: 'upgrade',
      pendingEffectiveAt: new Date(NOW - 8 * HOUR),
    });
    expect((await selected()).sort()).toEqual([due, noEffective].sort());
  });

  it('caps a run, most recently due first', async () => {
    const days = [1, 2, 3, 4];
    const nos: string[] = [];
    for (const d of days) {
      nos.push(
        await addSub({ currentPeriodEnd: new Date(NOW - d * 24 * HOUR) })
      );
    }
    const picked = await findReconcileCandidates({ now: NOW, limit: 2 });
    expect(picked.map((s: any) => s.subscriptionNo)).toEqual(nos.slice(0, 2));
  });
});

describe('dispatch', () => {
  it('runs the renewal sync or the scheduled-change sync with force', async () => {
    const stripe = await addSub({ paymentProvider: 'stripe' });
    const waffo = await addSub({
      paymentProvider: 'waffo',
      pendingProductId: 'lite_monthly',
      pendingChangeType: 'downgrade',
      pendingEffectiveAt: new Date(NOW - 8 * HOUR),
    });
    const summary = await reconcileLapsedSubscriptions({ now: NOW });

    expect(h.renewal).toHaveBeenCalledTimes(1);
    expect(h.renewal.mock.calls[0][0]).toMatchObject({
      subscriptionNo: stripe,
    });
    expect(h.renewal.mock.calls[0][1]).toEqual({
      force: true,
      now: NOW,
      graceMs: 6 * HOUR,
    });
    expect(h.scheduled).toHaveBeenCalledTimes(1);
    expect(h.scheduled.mock.calls[0][0]).toMatchObject({
      subscriptionNo: waffo,
    });
    expect(h.scheduled.mock.calls[0][1]).toEqual({ force: true, now: NOW });
    expect(summary).toEqual({ checked: 2, states: { applied: 1, pending: 1 } });
  });

  it('one failing subscription does not stop the rest', async () => {
    await addSub({ currentPeriodEnd: new Date(NOW - 7 * HOUR) });
    await addSub({ currentPeriodEnd: new Date(NOW - 8 * HOUR) });
    h.renewal.mockImplementationOnce(async () => {
      throw new Error('boom');
    });
    const summary = await reconcileLapsedSubscriptions({ now: NOW });
    expect(h.renewal).toHaveBeenCalledTimes(2);
    expect(summary).toEqual({
      checked: 2,
      states: { unavailable: 1, applied: 1 },
    });
  });

  it('nothing overdue: no provider is asked', async () => {
    await addSub({ currentPeriodEnd: new Date(NOW + HOUR) });
    expect(await reconcileLapsedSubscriptions({ now: NOW })).toEqual({
      checked: 0,
      states: {},
    });
    expect(h.renewal).not.toHaveBeenCalled();
    expect(h.scheduled).not.toHaveBeenCalled();
  });
});

describe('reconcileKind', () => {
  it('prefers the renewal sync for Stripe / Dodo', () => {
    expect(
      reconcileKind(
        {
          userId: 'u1',
          subscriptionNo: 'S',
          subscriptionId: 'sub_1',
          paymentProvider: 'dodo',
          status: 'active',
          currentPeriodEnd: new Date(NOW - 7 * HOUR),
          pendingProductId: 'lite_monthly',
          pendingChangeType: 'downgrade',
          pendingEffectiveAt: new Date(NOW - 7 * HOUR),
        },
        NOW
      )
    ).toBe('renewal');
  });
});

describe('reconcileKind (Waffo)', () => {
  it('a booked Waffo change is applied before any renewal lookup', () => {
    const waffo = {
      userId: 'u1',
      subscriptionNo: 'S',
      subscriptionId: 'ORD_1',
      paymentProvider: 'waffo',
      status: 'active',
      currentPeriodEnd: new Date(NOW - 7 * HOUR),
    };
    expect(reconcileKind(waffo, NOW)).toBe('renewal');
    expect(
      reconcileKind(
        {
          ...waffo,
          pendingProductId: 'lite_monthly',
          pendingChangeType: 'downgrade',
          pendingEffectiveAt: new Date(NOW - 7 * HOUR),
        },
        NOW
      )
    ).toBe('scheduled_change');
  });
});

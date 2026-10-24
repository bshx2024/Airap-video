import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Route } from './current';

/** GET /api/user/subscriptions/current: `null` when there is no live plan. */
const state = vi.hoisted(() => ({ view: null as Record<string, any> | null }));

vi.mock('@/core/auth', () => ({
  getAuth: () => ({
    api: { getSession: async () => ({ user: { id: 'u1' } }) },
  }),
}));
vi.mock('@/modules/payment/plan-change-service', () => ({
  getCurrentSubscriptionView: async () => state.view,
}));

const get = (Route.options as any).server.handlers.GET as (ctx: {
  request: Request;
}) => Promise<Response>;

async function current() {
  const res = await get({
    request: new Request('http://localhost/api/user/subscriptions/current'),
  });
  return (await res.json()) as { code: number; data?: unknown };
}

beforeEach(() => {
  state.view = null;
});

describe('current subscription', () => {
  it('no live plan (none, or a canceled one past its end) is null, not []', async () => {
    expect(await current()).toEqual({ code: 0, message: 'ok', data: null });
  });

  it('returns the live plan', async () => {
    state.view = { subscriptionNo: 'SUB-1', status: 'active' };
    expect((await current()).data).toEqual(state.view);
  });
});

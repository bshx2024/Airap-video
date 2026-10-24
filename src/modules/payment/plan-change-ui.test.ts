import { describe, expect, it } from 'vitest';

import { planChangeSupport } from './plan-change';
import {
  isPlanChangeSyncSettled,
  opensProviderPage,
  planChangeStep,
  processingUpgradeRefreshToast,
  providerDisplayName,
} from './plan-change-ui';

describe('planChangeStep', () => {
  it('redirects (dialog stays busy) for a confirm link', () => {
    expect(
      planChangeStep({
        mode: 'confirm',
        confirm_url: 'https://checkout.waffo.ai/change/S1?test=true#token=x',
        timing: 'period_end',
      })
    ).toEqual({
      kind: 'redirect',
      url: 'https://checkout.waffo.ai/change/S1?test=true#token=x',
    });
  });

  it('rejects a confirm outcome without a usable URL', () => {
    expect(
      planChangeStep({
        mode: 'confirm',
        confirm_url: 'javascript:alert(1)',
        timing: 'immediate',
      })
    ).toEqual({ kind: 'invalid' });
    expect(
      planChangeStep({ mode: 'confirm', timing: 'immediate' } as any)
    ).toEqual({ kind: 'invalid' });
  });

  it('maps in-place outcomes to "done" toasts', () => {
    expect(planChangeStep({ mode: 'applied' })).toEqual({
      kind: 'done',
      toast: 'applied',
    });
    expect(planChangeStep({ mode: 'processing' })).toEqual({
      kind: 'done',
      toast: 'processing',
    });
    expect(
      planChangeStep({
        mode: 'scheduled',
        kind: 'switch',
        effective_at: '2026-11-10T00:00:00.000Z',
      })
    ).toEqual({
      kind: 'done',
      toast: 'downgrade_scheduled',
      effectiveAt: '2026-11-10T00:00:00.000Z',
    });
    expect(
      planChangeStep({
        mode: 'scheduled',
        kind: 'resubscribe',
        effective_at: null,
      })
    ).toMatchObject({ kind: 'done', toast: 'resubscribe_scheduled' });
  });

  it('falls back to checkout or invalid', () => {
    expect(planChangeStep({ mode: 'checkout' })).toEqual({ kind: 'checkout' });
    expect(planChangeStep(null)).toEqual({ kind: 'invalid' });
    expect(planChangeStep({ mode: 'weird' } as any)).toEqual({
      kind: 'invalid',
    });
  });
});

describe('opensProviderPage', () => {
  it('is true only where the provider hosts the confirmation', () => {
    expect(opensProviderPage(planChangeSupport('waffo'), 'downgrade')).toBe(
      true
    );
    expect(opensProviderPage(planChangeSupport('waffo'), 'upgrade')).toBe(true);
    for (const p of ['stripe', 'dodo', 'creem']) {
      expect(opensProviderPage(planChangeSupport(p), 'downgrade')).toBe(false);
      expect(opensProviderPage(planChangeSupport(p), 'upgrade')).toBe(false);
    }
  });
});

describe('providerDisplayName', () => {
  it('names known providers and passes others through', () => {
    expect(providerDisplayName('waffo')).toBe('Waffo');
    expect(providerDisplayName('dodo')).toBe('Dodo Payments');
    expect(providerDisplayName('acme')).toBe('acme');
    expect(providerDisplayName(null)).toBe('');
  });
});

describe('isPlanChangeSyncSettled', () => {
  it('keeps polling only while the result is unknown', () => {
    expect(isPlanChangeSyncSettled('confirmed')).toBe(true);
    expect(isPlanChangeSyncSettled('failed')).toBe(true);
    expect(isPlanChangeSyncSettled('idle')).toBe(true);
    expect(isPlanChangeSyncSettled('pending')).toBe(false);
    expect(isPlanChangeSyncSettled('unavailable')).toBe(false);
    expect(isPlanChangeSyncSettled(null)).toBe(false);
  });
});

describe('planChangeStep: scheduled yearly → higher monthly', () => {
  it('is announced as a plan change, not a downgrade', () => {
    expect(
      planChangeStep({
        mode: 'scheduled',
        kind: 'switch',
        effective_at: '2027-09-26T01:29:42.000Z',
        intent: 'upgrade_to_monthly',
      })
    ).toEqual({
      kind: 'done',
      toast: 'change_scheduled',
      effectiveAt: '2027-09-26T01:29:42.000Z',
    });
    expect(
      planChangeStep({
        mode: 'scheduled',
        kind: 'switch',
        effective_at: null,
        intent: 'downgrade',
      })
    ).toMatchObject({ toast: 'downgrade_scheduled' });
  });
});

describe('processingUpgradeRefreshToast', () => {
  it('maps each sync answer to a toast', () => {
    expect(processingUpgradeRefreshToast('applied')).toEqual({
      kind: 'success',
      key: 'applied',
    });
    expect(processingUpgradeRefreshToast('idle').key).toBe('updated');
    expect(processingUpgradeRefreshToast('confirmed').key).toBe('updated');
    expect(processingUpgradeRefreshToast('failed').kind).toBe('error');
    expect(processingUpgradeRefreshToast('pending').kind).toBe('info');
    expect(processingUpgradeRefreshToast('throttled').key).toBe('throttled');
    expect(processingUpgradeRefreshToast('unsupported').kind).toBe('info');
    expect(processingUpgradeRefreshToast('unavailable').kind).toBe('error');
    expect(processingUpgradeRefreshToast(undefined).key).toBe('unavailable');
  });

  it('a successful lookup settles the processing upgrade', () => {
    expect(isPlanChangeSyncSettled('applied')).toBe(true);
    expect(isPlanChangeSyncSettled('throttled')).toBe(false);
  });
});

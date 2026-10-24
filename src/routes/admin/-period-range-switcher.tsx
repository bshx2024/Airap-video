'use client';

import type { AdminDashboardPeriodKey } from '@/modules/admin/dashboard-service';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';

const RANGE_OPTIONS: Array<{
  key: AdminDashboardPeriodKey;
  label: () => string;
}> = [
  { key: 'today', label: () => m['admin.dashboard.ranges.today']() },
  { key: '7d', label: () => m['admin.dashboard.ranges.7d']() },
  { key: '30d', label: () => m['admin.dashboard.ranges.30d']() },
];

export function PeriodRangeSwitcher({
  value,
  onChange,
  className,
  size = 'default',
}: {
  value: AdminDashboardPeriodKey;
  onChange: (next: AdminDashboardPeriodKey) => void;
  className?: string;
  size?: 'default' | 'sm';
}) {
  return (
    <div
      className={cn(
        'bg-muted inline-grid grid-cols-3 rounded-lg p-[3px]',
        size === 'sm' ? 'h-9' : 'h-9',
        className
      )}
      role="tablist"
      aria-label={m['admin.dashboard.period_label']()}
    >
      {RANGE_OPTIONS.map((item) => {
        const active = value === item.key;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            className={cn(
              'inline-flex cursor-pointer items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors',
              size === 'sm' ? 'px-3 text-xs' : 'px-3 text-sm',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {item.label()}
          </button>
        );
      })}
    </div>
  );
}

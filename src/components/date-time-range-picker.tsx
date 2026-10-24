import { useRef, useState } from 'react';
import { format } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import { CalendarRange, X } from 'lucide-react';
import { DayPicker, type DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

/** Values use the `datetime-local` format: `yyyy-MM-ddTHH:mm` ('' = open). */
export type DateTimeRangeValue = { start: string; end: string };

function splitLocal(v: string): { date?: Date; time: string } {
  if (!v) return { time: '' };
  const [d, t = '00:00'] = v.split('T');
  const [y, mo, da] = d.split('-').map(Number);
  if (!y || !mo || !da) return { time: '' };
  return { date: new Date(y, mo - 1, da), time: t.slice(0, 5) };
}

function joinLocal(date: Date | undefined, time: string) {
  return date ? `${format(date, 'yyyy-MM-dd')}T${time || '00:00'}` : '';
}

function display(v: string) {
  const { date, time } = splitLocal(v);
  return date ? `${format(date, 'yyyy-MM-dd')} ${time}` : '';
}

/**
 * Start/end date-time picked together: a two-month range calendar plus a time
 * for each end. Either end may be left empty (unbounded).
 */
export function DateTimeRangePicker({
  value,
  onChange,
  invalid,
  className,
}: {
  value: DateTimeRangeValue;
  onChange: (value: DateTimeRangeValue) => void;
  invalid?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  // Inside a modal Dialog, portal into it; otherwise the dialog's focus trap
  // steals focus from the time inputs.
  const start = splitLocal(value.start);
  const end = splitLocal(value.end);
  // Times are local drafts: a native time input reports '' while it is only
  // partly typed, so committing every keystroke would reset it to 00:00.
  const [startTime, setStartTime] = useState(start.time || '00:00');
  const [endTime, setEndTime] = useState(end.time || '23:59');
  const isTime = (t: string) => /^\d{2}:\d{2}$/.test(t);
  const range: DateRange | undefined = start.date
    ? { from: start.date, to: end.date }
    : undefined;
  const dfLocale = getLocale() === 'zh' ? zhCN : enUS;
  const open_ = m['admin.promotions.window_open']();
  const label =
    value.start || value.end
      ? `${display(value.start) || open_}  →  ${display(value.end) || open_}`
      : m['common.date_range.placeholder']();

  return (
    <div ref={rootRef}>
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (next) {
            setStartTime(splitLocal(value.start).time || '00:00');
            setEndTime(splitLocal(value.end).time || '23:59');
          }
          setOpen(next);
        }}
      >
        <PopoverTrigger
          aria-invalid={invalid || undefined}
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'aria-invalid:border-destructive w-full justify-start gap-2 font-normal',
            !value.start && !value.end && 'text-muted-foreground',
            className
          )}
        >
          <CalendarRange className="size-4 shrink-0" />
          <span className="truncate tabular-nums">{label}</span>
        </PopoverTrigger>
        <PopoverContent className="flex w-auto max-w-[calc(100vw-1rem)] flex-col overflow-hidden p-0">
          {/* Calendar scrolls; time row stays pinned so it is never clipped. */}
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <DayPicker
              mode="range"
              locale={dfLocale}
              numberOfMonths={2}
              defaultMonth={start.date ?? new Date()}
              selected={range}
              onSelect={(r) =>
                onChange({
                  start: joinLocal(
                    r?.from,
                    isTime(startTime) ? startTime : '00:00'
                  ),
                  end: joinLocal(r?.to, isTime(endTime) ? endTime : '23:59'),
                })
              }
              classNames={{
                months: 'relative flex flex-col gap-4 sm:flex-row',
                month: 'space-y-3',
                month_caption: 'flex h-8 items-center justify-center',
                caption_label: 'text-sm font-medium',
                nav: 'absolute inset-x-0 top-0 flex h-8 items-center justify-between',
                button_previous: cn(
                  buttonVariants({ variant: 'ghost', size: 'icon' }),
                  'size-8'
                ),
                button_next: cn(
                  buttonVariants({ variant: 'ghost', size: 'icon' }),
                  'size-8'
                ),
                chevron: 'size-4 fill-current',
                weekdays: 'flex',
                weekday:
                  'text-muted-foreground w-9 text-center text-[0.75rem] font-normal',
                week: 'mt-1 flex w-full',
                day: 'size-9 p-0 text-center text-sm',
                day_button:
                  'hover:bg-accent hover:text-accent-foreground size-9 rounded-md tabular-nums transition-colors',
                today: 'text-primary font-semibold',
                selected:
                  '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary',
                range_middle:
                  '[&>button]:!bg-accent [&>button]:!text-accent-foreground rounded-none',
                range_start: 'rounded-l-md bg-accent',
                range_end: 'rounded-r-md bg-accent',
                outside: 'text-muted-foreground opacity-50',
                disabled: 'text-muted-foreground opacity-50',
                hidden: 'invisible',
              }}
            />
          </div>
          <div className="bg-popover shrink-0 space-y-3 border-t p-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">
                  {m['admin.promotions.field.start_at']()}
                </Label>
                <Input
                  type="time"
                  step={60}
                  value={startTime}
                  onChange={(e) => {
                    const t = e.target.value;
                    setStartTime(t);
                    if (isTime(t) && start.date) {
                      onChange({ ...value, start: joinLocal(start.date, t) });
                    }
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  {m['admin.promotions.field.end_at']()}
                </Label>
                <Input
                  type="time"
                  step={60}
                  value={endTime}
                  onChange={(e) => {
                    const t = e.target.value;
                    setEndTime(t);
                    if (isTime(t) && end.date) {
                      onChange({ ...value, end: joinLocal(end.date, t) });
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-xs">
                {m['common.date_range.hint']()}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStartTime('00:00');
                    setEndTime('23:59');
                    onChange({ start: '', end: '' });
                  }}
                >
                  <X className="size-4" />
                  {m['common.date_range.clear']()}
                </Button>
                <Button type="button" size="sm" onClick={() => setOpen(false)}>
                  {m['common.date_range.done']()}
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

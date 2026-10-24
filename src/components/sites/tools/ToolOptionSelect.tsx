'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

export function ToolOptionSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((item) => item.value === value)?.label || value;

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={label}
        className="bg-muted/70 hover:bg-muted inline-flex h-9 min-w-24 cursor-pointer items-center justify-between gap-1.5 rounded-md px-3 text-xs font-medium transition-colors outline-none"
      >
        <span>{selected}</span>
        <ChevronDown className="text-muted-foreground size-3.5 shrink-0 opacity-70" />
      </button>
      {open && (
        <div className="border-border bg-popover absolute right-0 bottom-full z-[80] mb-1.5 max-h-64 min-w-32 overflow-y-auto rounded-xl border p-1 shadow-xl backdrop-blur-md">
          {options.map((item) => {
            const isSelected = item.value === value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors',
                  isSelected
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-foreground hover:bg-muted'
                )}
              >
                <span>{item.label}</span>
                {isSelected && (
                  <span className="text-primary text-[10px]">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

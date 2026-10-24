import { cn } from '@/lib/utils';

export function TemplateFilterChip({
  label,
  active,
  muted,
  onClick,
}: {
  label: string;
  active: boolean;
  muted?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 shrink-0 items-center justify-center rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-all outline-none',
        active
          ? 'border-primary/15 bg-primary/10 text-primary hover:bg-primary/15 shadow-none'
          : muted
            ? 'border-border/60 bg-background/50 text-muted-foreground/60 hover:bg-muted/60'
            : 'border-border bg-background text-foreground hover:bg-muted'
      )}
    >
      {label}
    </button>
  );
}

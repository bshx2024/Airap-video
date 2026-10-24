import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TableCell, TableRow } from '@/components/ui/table';

/**
 * Skeleton rows for a table body (same columns → no width jump). Matches
 * template-pixany / DataTable: a column may supply its own `skeleton`
 * (node or per-row function), else a generic bar. Uses design tokens
 * (`bg-muted` via Skeleton) so light/dark and storefront themes stay consistent.
 */
export function TableSkeletonRows({
  columns,
  rows,
}: {
  columns: {
    className?: string;
    skeleton?: React.ReactNode | ((index: number) => React.ReactNode);
  }[];
  rows: number;
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <TableRow
          key={`skeleton-row-${rowIndex}`}
          aria-hidden="true"
          className="hover:bg-transparent"
        >
          {columns.map((col, colIndex) => {
            const content =
              typeof col.skeleton === 'function'
                ? col.skeleton(rowIndex)
                : col.skeleton;
            return (
              <TableCell
                key={`skeleton-cell-${colIndex}`}
                className={col.className}
              >
                {content ?? <Skeleton className="h-4 w-4/5" />}
              </TableCell>
            );
          })}
        </TableRow>
      ))}
    </>
  );
}

/** Settings tab: one card per group with label + input placeholders. */
export function SettingsCardsSkeleton({
  cards,
}: {
  cards: { key: string; fields: number; wide?: boolean }[];
}) {
  return (
    <div
      className="grid grid-cols-1 gap-6 lg:grid-cols-2"
      aria-busy="true"
      aria-live="polite"
    >
      {(cards.length
        ? cards
        : Array.from({ length: 4 }, (_, i) => ({
            key: String(i),
            fields: 3,
            wide: false,
          }))
      ).map((card) => (
        <Card
          key={card.key}
          className={cn('flex h-full flex-col', card.wide && 'lg:col-span-2')}
        >
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3.5 w-56" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: Math.max(1, card.fields) }, (_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Key/value rows (custom settings tab). */
export function KeyValueRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Card aria-busy="true">
      <CardContent className="space-y-3 pt-6">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 flex-[2]" />
            <Skeleton className="size-9" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** Dashboard: metric cards + chart cards (+ optional secondary row / list). */
export function DashboardSkeleton({
  cards,
  cardsClassName,
  charts,
  chartHeightClassName = 'h-[240px]',
  secondaryCards,
  secondaryCardsClassName = 'grid gap-4 sm:grid-cols-3',
  listRows,
}: {
  cards: number;
  cardsClassName: string;
  charts: number;
  chartHeightClassName?: string;
  secondaryCards?: number;
  secondaryCardsClassName?: string;
  listRows?: number;
}) {
  const metricCard = (key: string | number) => (
    <Card key={key}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="size-4 rounded" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-3 w-28" />
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className={cardsClassName}>
        {Array.from({ length: cards }, (_, i) => metricCard(i))}
      </div>
      {secondaryCards && secondaryCards > 0 ? (
        <div className={secondaryCardsClassName}>
          {Array.from({ length: secondaryCards }, (_, i) =>
            metricCard(`s-${i}`)
          )}
        </div>
      ) : null}
      {charts > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: charts }, (_, i) => (
            <Card key={i} className="min-w-0 overflow-hidden">
              <CardHeader className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </CardHeader>
              <CardContent className="min-w-0">
                <Skeleton
                  className={cn('w-full rounded-md', chartHeightClassName)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
      {listRows && listRows > 0 ? (
        <Card>
          <CardHeader className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-56" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: listRows }, (_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="size-6 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48 max-w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

/** Checkbox list rows (e.g. role assignment dialog). */
export function CheckListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3" aria-hidden="true">
          <Skeleton className="size-4 rounded-sm" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </>
  );
}

/** Drag-sort list placeholder (products / announcements sort). */
export function DragSortListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="border-border flex items-center gap-3 rounded-lg border p-3"
        >
          <Skeleton className="size-5 shrink-0 rounded" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Product create/edit form shell while detail loads. */
export function FormPageSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <Card aria-busy="true" aria-live="polite">
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3.5 w-64" />
      </CardHeader>
      <CardContent className="space-y-5">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton
              className={cn(
                'w-full rounded-md',
                i === 0 ? 'h-9' : i % 3 === 0 ? 'h-24' : 'h-9'
              )}
            />
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

/** User detail header + metric cards while profile loads. */
export function DetailPageSkeleton() {
  return (
    <div className="space-y-6 p-6" aria-busy="true" aria-live="polite">
      <Skeleton className="h-16 w-72 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

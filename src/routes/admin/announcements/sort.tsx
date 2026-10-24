import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

import { tDynamic } from '@/core/i18n/dynamic';
import { Link } from '@/core/i18n/navigation';
import { apiGet, apiPost } from '@/lib/api-client';
import { apiErrorMessage } from '@/lib/api-error-message';
import { m } from '@/paraglide/messages.js';
import { DragSortListSkeleton } from '@/components/admin/admin-skeletons';
import { DragSortList } from '@/components/admin/drag-sort-list';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type Row = {
  id: string;
  title: string;
  kind: string;
  locale: string;
  status: string;
  sort: number;
};

function AnnouncementsSortPage() {
  const queryClient = useQueryClient();
  const [orderedIds, setOrderedIds] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);

  const listQuery = useQuery({
    queryKey: ['admin-announcements-sort'],
    queryFn: () => apiGet<{ items: Row[] }>('/api/admin/announcements'),
  });

  const items = listQuery.data?.items ?? [];

  useEffect(() => {
    if (items.length) setOrderedIds(items.map((item) => item.id));
  }, [items]);

  const dragItems = useMemo(() => {
    const byId = new Map(items.map((item) => [item.id, item]));
    const ids = orderedIds ?? items.map((item) => item.id);
    return ids
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((row) => ({
        id: row!.id,
        title: row!.title,
        meta: [
          row!.kind === 'banner'
            ? m['admin.announcements.kind_banner']()
            : m['admin.announcements.kind_notice'](),
          row!.locale || m['admin.announcements.locale_all'](),
          tDynamic(`admin.value.${row!.status}`, row!.status),
        ].join(' · '),
      }));
  }, [items, orderedIds]);

  async function handleSave() {
    if (!orderedIds?.length) return;
    setSaving(true);
    try {
      await apiPost('/api/admin/announcements/sort', {
        items: orderedIds.map((id, sort) => ({ id, sort })),
      });
      toast.success(m['admin.announcements.sort.saved']());
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['admin-announcements-sort'] });
    } catch (error: any) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/admin/announcements"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
          >
            <ChevronLeft className="size-4" />
            {m['admin.nav.announcements']()}
          </Link>
          <h1 className="mt-2 text-2xl font-bold">
            {m['admin.announcements.sort.title']()}
          </h1>
          <p className="text-muted-foreground text-sm">
            {m['admin.announcements.sort.description']()}
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Link
            href="/admin/announcements"
            className={buttonVariants({ variant: 'outline' })}
          >
            {m['admin.categories.cancel']()}
          </Link>
          <Button
            type="button"
            disabled={saving || !orderedIds?.length}
            onClick={() => void handleSave()}
          >
            {m['admin.announcements.save']()}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {listQuery.isLoading ? (
            <DragSortListSkeleton />
          ) : dragItems.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              {m['common.table.no_data']()}
            </p>
          ) : (
            <DragSortList items={dragItems} onReorder={setOrderedIds} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute('/admin/announcements/sort')({
  component: AnnouncementsSortPage,
});

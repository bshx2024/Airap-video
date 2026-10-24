import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { ArrowUpDown, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { tDynamic } from '@/core/i18n/dynamic';
import { Link } from '@/core/i18n/navigation';
import { apiDelete, apiGet, apiPost } from '@/lib/api-client';
import { apiErrorMessage } from '@/lib/api-error-message';
import { formatDateTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { DataTable, type Column } from '@/components/data-table';
import { DateTimeRangePicker } from '@/components/date-time-range-picker';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const STICKY_ACTIONS_CLASS =
  'sticky right-0 z-10 bg-background shadow-[-1px_0_0_var(--border)]';

export const Route = createFileRoute('/admin/announcements/')({
  component: AnnouncementsAdminPage,
});

type Row = {
  id: string;
  title: string;
  content: string;
  locale: string;
  kind: string;
  status: string;
  sort: number;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const LOCALE_ALL = 'all';

function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function stripHtml(raw: string) {
  return String(raw || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Single-line ellipsis + hover tooltip (full text). */
function TruncatedHint({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  if (!text) return null;
  return (
    <Tooltip>
      <TooltipTrigger
        delay={200}
        render={
          <span
            className={cn('block min-w-0 cursor-default truncate', className)}
          />
        }
      >
        {text}
      </TooltipTrigger>
      <TooltipContent className="max-w-sm break-words whitespace-pre-wrap">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

const emptyForm = {
  id: '',
  title: '',
  content: '',
  locale: '',
  kind: 'notice',
  status: 'published',
  startAt: '',
  endAt: '',
};

function AnnouncementsAdminPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [fillConfirmOpen, setFillConfirmOpen] = useState(false);

  const [deletingRow, setDeletingRow] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);

  const list = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: () => apiGet<{ items: Row[] }>('/api/admin/announcements'),
  });

  const items = list.data?.items ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q) ||
        r.locale.toLowerCase().includes(q)
    );
  }, [items, search]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  function openCreate() {
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(row: Row) {
    setForm({
      id: row.id,
      title: row.title,
      content: row.content,
      locale: row.locale,
      kind: row.kind,
      status: row.status,
      startAt: toLocalInput(row.startAt),
      endAt: toLocalInput(row.endAt),
    });
    setFormOpen(true);
  }

  function applyContentTemplate() {
    const content =
      form.kind === 'banner'
        ? m['admin.announcements.fill_template.content_banner']()
        : m['admin.announcements.fill_template.content_notice']();
    setForm((prev) => ({ ...prev, content }));
    setFillConfirmOpen(false);
    toast.success(m['admin.announcements.fill_template.filled_success']());
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const isBanner = form.kind === 'banner';
    if (!isBanner && !form.title.trim()) {
      toast.error(m['admin.announcements.field_title']());
      return;
    }
    if (!form.content.trim()) {
      toast.error(m['admin.announcements.field_content']());
      return;
    }
    const startAt = fromLocalInput(form.startAt);
    const endAt = fromLocalInput(form.endAt);
    if (startAt && endAt && new Date(endAt) <= new Date(startAt)) {
      toast.error(m['admin.announcements.error.invalid_time_range']());
      return;
    }
    setSaving(true);
    try {
      await apiPost('/api/admin/announcements', {
        ...form,
        // Banners are content-only (URL/path or text); no separate title.
        title: isBanner ? '' : form.title,
        id: form.id || undefined,
        startAt,
        endAt,
      });
      toast.success(m['admin.announcements.saved']());
      setFormOpen(false);
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
    } catch (error: any) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingRow) return;
    setDeleting(true);
    try {
      await apiDelete(
        `/api/admin/announcements?id=${encodeURIComponent(deletingRow.id)}`
      );
      setDeletingRow(null);
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
    } catch (error: any) {
      toast.error(apiErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<Row>[] = [
    {
      header: m['admin.announcements.field_title'](),
      // Constrain the <td> so truncate fills the cell (no empty gap).
      className: 'w-[280px] max-w-[280px] min-w-0',
      cell: (row) => {
        const primary = stripHtml(row.title || row.content || '') || '—';
        const secondary =
          row.title && row.content ? stripHtml(row.content) : '';
        return (
          <div className="min-w-0 space-y-0.5 overflow-hidden">
            <TruncatedHint text={primary} className="font-medium" />
            {secondary ? (
              <TruncatedHint
                text={secondary}
                className="text-muted-foreground text-xs"
              />
            ) : null}
          </div>
        );
      },
    },
    {
      header: m['admin.payments.type'](),
      cell: (row) => (
        <Badge variant={row.kind === 'banner' ? 'secondary' : 'outline'}>
          {row.kind === 'banner'
            ? m['admin.announcements.kind_banner']()
            : m['admin.announcements.kind_notice']()}
        </Badge>
      ),
    },
    {
      header: m['admin.announcements.locale_all'](),
      cell: (row) => (
        <span className="text-xs">
          {row.locale || m['admin.announcements.locale_all']()}
        </span>
      ),
    },
    {
      header: m['admin.announcements.col.status'](),
      cell: (row) => {
        const variant =
          row.status === 'published'
            ? 'default'
            : row.status === 'draft'
              ? 'secondary'
              : 'outline';
        return (
          <Badge variant={variant}>
            {tDynamic(`admin.value.${row.status}`, row.status)}
          </Badge>
        );
      },
    },
    {
      header: m['admin.announcements.field_window'](),
      cell: (row) => {
        const start = row.startAt ? formatDateTime(row.startAt) : '—';
        const end = row.endAt ? formatDateTime(row.endAt) : '—';
        return (
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            {start} ~ {end}
          </span>
        );
      },
    },
    {
      header: m['admin.categories.created_at'](),
      cell: (row) => (
        <span className="text-muted-foreground text-xs whitespace-nowrap">
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
    {
      header: '',
      className: STICKY_ACTIONS_CLASS,
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => openEdit(row)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive size-7"
            onClick={() => setDeletingRow(row)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <TooltipProvider>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {m['admin.nav.announcements']()}
            </h1>
            <p className="text-muted-foreground text-sm">
              {m['admin.announcements.description']()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 self-start sm:self-auto">
            <Link
              href="/admin/announcements/sort"
              className={cn(buttonVariants({ variant: 'outline' }), 'gap-1.5')}
            >
              <ArrowUpDown className="size-4" />
              {m['admin.announcements.sort.action']()}
            </Link>
            <Button onClick={openCreate} className="gap-1.5">
              <Plus className="size-4" />
              {m['admin.announcements.clear']()}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent>
            <DataTable
              columns={columns}
              data={paged}
              total={filtered.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              search={search}
              onSearchChange={(s) => {
                setSearch(s);
                setPage(1);
              }}
              searchPlaceholder={m['admin.announcements.field_title']()}
              onRefresh={() =>
                queryClient.invalidateQueries({
                  queryKey: ['admin-announcements'],
                })
              }
              loading={list.isFetching}
              rowKey={(row) => row.id}
            />
          </CardContent>
        </Card>

        {/* Create / Edit Dialog */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {form.id
                  ? m['admin.announcements.edit']()
                  : m['admin.announcements.clear']()}
              </DialogTitle>
              <DialogDescription>
                {m['admin.announcements.description']()}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSave} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="announcement-kind">
                    {m['admin.payments.type']()}
                  </Label>
                  <Select
                    value={form.kind}
                    onValueChange={(v) =>
                      setForm({ ...form, kind: v || 'notice' })
                    }
                  >
                    <SelectTrigger id="announcement-kind" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="notice">
                        {m['admin.announcements.kind_notice']()}
                      </SelectItem>
                      <SelectItem value="banner">
                        {m['admin.announcements.kind_banner']()}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="announcement-status">
                    {m['admin.announcements.col.status']()}
                  </Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) =>
                      setForm({ ...form, status: v || 'published' })
                    }
                  >
                    <SelectTrigger id="announcement-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="published">
                        {m['admin.value.published']()}
                      </SelectItem>
                      <SelectItem value="draft">
                        {m['admin.value.draft']()}
                      </SelectItem>
                      <SelectItem value="archived">
                        {m['admin.value.archived']()}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="announcement-locale">
                    {m['admin.announcements.locale_all']()}
                  </Label>
                  <Select
                    value={form.locale || LOCALE_ALL}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        locale: !v || v === LOCALE_ALL ? '' : v,
                      })
                    }
                  >
                    <SelectTrigger id="announcement-locale" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={LOCALE_ALL}>
                        {m['admin.announcements.locale_all']()}
                      </SelectItem>
                      <SelectItem value="en">en</SelectItem>
                      <SelectItem value="zh">zh</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label>{m['admin.announcements.field_window']()}</Label>
                  <DateTimeRangePicker
                    value={{ start: form.startAt, end: form.endAt }}
                    invalid={(() => {
                      const s = fromLocalInput(form.startAt);
                      const e = fromLocalInput(form.endAt);
                      return !!(s && e && new Date(e) <= new Date(s));
                    })()}
                    onChange={(v) =>
                      setForm({ ...form, startAt: v.start, endAt: v.end })
                    }
                  />
                </div>
              </div>

              {form.kind !== 'banner' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="announcement-title">
                    {m['admin.announcements.field_title']()}
                  </Label>
                  <Input
                    id="announcement-title"
                    placeholder={m['admin.announcements.field_title']()}
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                    required
                  />
                </div>
              ) : null}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="announcement-content">
                    {m['admin.announcements.field_content']()}
                  </Label>
                  <button
                    type="button"
                    onClick={() => setFillConfirmOpen(true)}
                    className="text-primary cursor-pointer text-xs font-medium transition-colors hover:underline"
                  >
                    {m['admin.announcements.fill_template']()}
                  </button>
                </div>
                <Textarea
                  id="announcement-content"
                  rows={4}
                  placeholder={m['admin.announcements.field_content']()}
                  value={form.content}
                  onChange={(e) =>
                    setForm({ ...form, content: e.target.value })
                  }
                  required
                />
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormOpen(false)}
                >
                  {m['admin.categories.cancel']()}
                </Button>
                <Button type="submit" disabled={saving}>
                  {m['admin.announcements.save']()}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={fillConfirmOpen} onOpenChange={setFillConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {m['admin.announcements.fill_template.dialog_title']()}
              </DialogTitle>
              <DialogDescription>
                {m['admin.announcements.fill_template.dialog_desc']()}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFillConfirmOpen(false)}
              >
                {m['admin.announcements.fill_template.dialog_cancel']()}
              </Button>
              <Button type="button" onClick={applyContentTemplate}>
                {m['admin.announcements.fill_template.dialog_confirm']()}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={Boolean(deletingRow)}
          onOpenChange={(open) => !open && setDeletingRow(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{m['admin.announcements.delete']()}</DialogTitle>
              <DialogDescription>
                {m['admin.categories.delete_confirm']()}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeletingRow(null)}
              >
                {m['admin.categories.cancel']()}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleting}
                onClick={handleDelete}
              >
                {m['admin.announcements.delete']()}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

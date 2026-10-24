import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from '@tanstack/react-router';
import { X } from 'lucide-react';

import { apiGet } from '@/lib/api-client';
import { m } from '@/paraglide/messages.js';
import { getLocale, locales } from '@/paraglide/runtime.js';

const STORAGE_KEY = 'vm-announcement-dismissed';

function stripLocale(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  for (const locale of locales) {
    if (normalized === `/${locale}`) return '/';
    if (normalized.startsWith(`/${locale}/`)) {
      return normalized.slice(locale.length + 1) || '/';
    }
  }
  return normalized;
}

function readDismissed(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/** Dismissible published notice. Does not sit in the header. */
export function AnnouncementNotice() {
  const location = useLocation();
  const locale = getLocale();
  const hidden = stripLocale(location.pathname).startsWith('/admin');
  const [dismissed, setDismissed] = useState<string[]>([]);
  useEffect(() => setDismissed(readDismissed()), []);

  const query = useQuery({
    queryKey: ['public-announcements', locale],
    enabled: !hidden,
    queryFn: () =>
      apiGet<{ notices: { id: string; title: string; content: string }[] }>(
        `/api/announcements?locale=${locale}`
      ),
    staleTime: 60_000,
  });
  const notice = (query.data?.notices ?? []).find(
    (item) => !dismissed.includes(item.id)
  );
  if (hidden || !notice) return null;

  function close() {
    const next = [...dismissed, notice!.id];
    setDismissed(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return (
    <div className="bg-background fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md rounded-xl border p-4 shadow-lg sm:bottom-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{notice.title}</p>
          {notice.content ? (
            <p className="text-muted-foreground mt-1 text-sm whitespace-pre-wrap">
              {notice.content}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground -m-2 shrink-0 cursor-pointer rounded-md p-2"
          onClick={close}
          aria-label={m['announcements.dismiss']()}
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Bell, Check, ChevronRight, Clock, X } from 'lucide-react';
import { createPortal } from 'react-dom';

import { formatDateTime } from '@/lib/time';

import {
  formatRelativeTime,
  type AnnouncementItem,
} from './announcement-utils';

export function AnnouncementModals({
  locale,
  isListOpen,
  isDetailOpen,
  isLoading,
  announcements,
  readIds,
  activeAnnouncement,
  isCurrentActiveUnread,
  renderedHtml,
  labels,
  onCloseList,
  onOpenDetail,
  onMarkAsRead,
  onCloseDetail,
}: {
  locale: string;
  isListOpen: boolean;
  isDetailOpen: boolean;
  isLoading: boolean;
  announcements: AnnouncementItem[];
  readIds: string[];
  activeAnnouncement: AnnouncementItem | null;
  isCurrentActiveUnread: boolean;
  renderedHtml: string;
  labels: {
    title: string;
    empty: string;
    unread: string;
    read: string;
    markAsRead: string;
    close: string;
  };
  onCloseList: () => void;
  onOpenDetail: (item: AnnouncementItem) => void;
  onMarkAsRead: (id: string) => void;
  onCloseDetail: () => void;
}) {
  // Portal only after mount — `typeof document` forks SSR vs client HTML.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <>
      {isListOpen && (
        <div
          className="animate-in fade-in bg-background/50 fixed inset-0 z-[110] flex items-center justify-center p-3 backdrop-blur duration-200 sm:p-4"
          onClick={onCloseList}
        >
          <div
            className="bg-card border-border text-card-foreground animate-in zoom-in-95 flex max-h-[88dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border shadow-2xl duration-200 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-border/50 bg-muted/20 flex shrink-0 items-center justify-between border-b px-5 py-3.5 sm:px-6 sm:py-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary text-primary-foreground shadow-primary/20 flex size-9 items-center justify-center rounded-xl shadow-md">
                  <Bell className="size-4" />
                </div>
                <h3 className="text-foreground text-base font-bold sm:text-lg">
                  {labels.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={onCloseList}
                className="text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer rounded-lg p-1.5 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="divide-border/40 min-h-0 flex-1 divide-y overflow-y-auto">
              {isLoading ? (
                <div className="space-y-4 p-5">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="bg-muted/20 flex animate-pulse items-center gap-3.5 rounded-2xl p-3"
                    >
                      <div className="bg-muted/60 size-9 shrink-0 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <div className="bg-muted/60 h-4 w-2/3 rounded" />
                        <div className="bg-muted/40 h-3 w-1/4 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : announcements.length === 0 ? (
                <div className="text-muted-foreground flex h-full min-h-[220px] items-center justify-center py-12 text-center text-sm">
                  {labels.empty}
                </div>
              ) : (
                announcements.map((item) => {
                  const isRead = readIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => onOpenDetail(item)}
                      className="group hover:bg-muted/50 flex cursor-pointer items-center justify-between p-4 transition-colors sm:p-4.5"
                    >
                      <div className="flex min-w-0 items-center gap-3.5 pr-3">
                        <div
                          className={`flex size-9 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                            isRead
                              ? 'border-border/60 bg-muted/40 text-muted-foreground'
                              : 'border-primary/40 bg-primary/10 text-primary'
                          }`}
                        >
                          {isRead ? (
                            <Check className="size-4" />
                          ) : (
                            <span className="bg-primary size-2 rounded-full" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-foreground group-hover:text-primary truncate text-sm font-medium transition-colors">
                            {item.title}
                          </h4>
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            {formatRelativeTime(item.createdAt, locale)}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="text-muted-foreground/60 group-hover:text-primary size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {isDetailOpen && activeAnnouncement && (
        <div
          className="animate-in fade-in bg-background/50 fixed inset-0 z-[120] flex items-center justify-center p-3 backdrop-blur duration-200 sm:p-4"
          onClick={() => {
            if (isCurrentActiveUnread) {
              onMarkAsRead(activeAnnouncement.id);
            } else {
              onCloseDetail();
            }
          }}
        >
          <div
            className="bg-card border-border ring-border/50 text-card-foreground animate-in zoom-in-95 flex max-h-[88dvh] w-full max-w-[680px] flex-col overflow-hidden rounded-2xl border shadow-2xl ring-1 duration-200 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-border/60 from-primary/15 via-primary/5 relative shrink-0 overflow-hidden border-b bg-gradient-to-br to-transparent px-5 py-4 sm:px-8 sm:py-6">
              <div className="from-primary/10 pointer-events-none absolute top-0 right-0 h-full w-64 bg-gradient-to-l to-transparent" />
              <div className="bg-primary/15 pointer-events-none absolute -top-8 -right-8 size-32 rounded-full blur-3xl" />
              <div className="bg-primary/10 pointer-events-none absolute -bottom-4 -left-4 size-24 rounded-full blur-2xl" />

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isCurrentActiveUnread) {
                    onMarkAsRead(activeAnnouncement.id);
                  } else {
                    onCloseDetail();
                  }
                }}
                className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-4 right-4 z-30 cursor-pointer rounded-lg p-1.5 transition-colors sm:top-6 sm:right-6"
                aria-label={labels.close}
              >
                <X className="size-5" />
              </button>

              <div className="relative z-10 pr-6 sm:pr-8">
                <div className="mb-2.5 flex items-center gap-2">
                  <div className="bg-primary text-primary-foreground shadow-primary/25 flex size-9 items-center justify-center rounded-xl shadow-lg sm:size-10">
                    <Bell className="size-4 sm:size-5" />
                  </div>
                  {isCurrentActiveUnread ? (
                    <span className="bg-primary text-primary-foreground shadow-primary/20 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium shadow-md">
                      <span className="relative flex size-2">
                        <span className="bg-primary-foreground absolute inline-flex size-full animate-ping rounded-full opacity-75" />
                        <span className="bg-primary-foreground relative inline-flex size-2 rounded-full" />
                      </span>
                      {labels.unread}
                    </span>
                  ) : (
                    <span className="border-border bg-muted/60 text-muted-foreground inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
                      <Check className="text-muted-foreground size-3" />
                      {labels.read}
                    </span>
                  )}
                </div>

                <h2 className="text-foreground mb-1.5 text-lg leading-tight font-bold sm:text-2xl">
                  {activeAnnouncement.title}
                </h2>

                <div className="text-muted-foreground flex items-center gap-1.5 text-xs sm:text-sm">
                  <Clock className="size-3.5 sm:size-4" />
                  <time>
                    {formatRelativeTime(activeAnnouncement.createdAt, locale)} ·{' '}
                    {formatDateTime(activeAnnouncement.createdAt)}
                  </time>
                </div>
              </div>
            </div>

            <div className="bg-card min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-8">
              <div className="relative">
                <div className="from-primary via-primary/70 to-primary/20 absolute top-0 bottom-0 left-0 w-1 rounded-full bg-gradient-to-b" />
                <div
                  className="prose dark:prose-invert text-foreground [&_a]:text-primary max-w-none pl-4 text-sm leading-relaxed sm:pl-6 [&_a]:underline [&_a:hover]:opacity-80 [&_p]:my-2"
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
              </div>
            </div>

            <div className="border-border/60 bg-muted/30 shrink-0 border-t px-5 py-3.5 sm:px-8 sm:py-5">
              <div className="flex items-center justify-end gap-3">
                {isCurrentActiveUnread ? (
                  <button
                    type="button"
                    onClick={() => onMarkAsRead(activeAnnouncement.id)}
                    className="bg-primary text-primary-foreground shadow-primary/25 hover:bg-primary/90 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
                  >
                    <Check className="size-4" />
                    {labels.markAsRead}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onCloseDetail}
                    className="border-border bg-background text-foreground hover:bg-muted w-full cursor-pointer rounded-xl border px-6 py-2.5 text-sm font-medium transition-colors sm:w-auto"
                  >
                    {labels.close}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}

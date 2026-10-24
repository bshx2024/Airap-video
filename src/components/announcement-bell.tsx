'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from '@tanstack/react-router';
import { Bell } from 'lucide-react';

import { apiGet } from '@/lib/api-client';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';

import { AnnouncementModals } from './announcement-modals';
import {
  markAnnouncementAutoPrompted,
  readStoredAnnouncementIds,
  renderAnnouncementHtml,
  stripLocalePrefix,
  wasAnnouncementAutoPrompted,
  writeStoredAnnouncementIds,
  type AnnouncementItem,
} from './announcement-utils';

export type { AnnouncementItem } from './announcement-utils';

export function AnnouncementBell({ className }: { className?: string } = {}) {
  const [isLoading, setIsLoading] = useState(true);
  const [storageReady, setStorageReady] = useState(false);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [isListOpen, setIsListOpen] = useState(false);
  const [activeAnnouncement, setActiveAnnouncement] =
    useState<AnnouncementItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailSource, setDetailSource] = useState<'list' | 'auto'>('auto');
  const autoCheckedRef = useRef(false);

  const location = useLocation();
  const locale = getLocale();

  // Hydrate read ids before any auto-open decision (avoids race with fetch).
  useEffect(() => {
    setReadIds(readStoredAnnouncementIds());
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    let cancelled = false;
    setIsLoading(true);
    apiGet<{
      notices?: AnnouncementItem[];
      list?: AnnouncementItem[];
    }>(`/api/announcements?locale=${locale}`)
      .then((res) => {
        if (cancelled) return;
        const list = res?.list || res?.notices || [];
        setAnnouncements(
          Array.isArray(list)
            ? list.map((item) => ({ ...item, id: String(item.id) }))
            : []
        );
      })
      .catch((err) => {
        console.error('Failed to load announcements:', err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [locale, storageReady]);

  useEffect(() => {
    if (
      !storageReady ||
      isLoading ||
      announcements.length === 0 ||
      autoCheckedRef.current
    ) {
      return;
    }

    const path = stripLocalePrefix(location.pathname);
    if (path !== '/') return;

    autoCheckedRef.current = true;
    const firstUnread = announcements.find(
      (a) =>
        !readIds.includes(String(a.id)) && !wasAnnouncementAutoPrompted(a.id)
    );
    if (firstUnread) {
      markAnnouncementAutoPrompted(firstUnread.id);
      setDetailSource('auto');
      setActiveAnnouncement(firstUnread);
      setIsDetailOpen(true);
    }
  }, [storageReady, isLoading, announcements, readIds, location.pathname]);

  const unreadCount = announcements.filter(
    (a) => !readIds.includes(String(a.id))
  ).length;

  const handleMarkAsRead = (id: string) => {
    const key = String(id);
    markAnnouncementAutoPrompted(key);
    const updated = Array.from(new Set([...readIds.map(String), key]));
    setReadIds(updated);
    writeStoredAnnouncementIds(updated);

    setIsDetailOpen(false);
    if (detailSource === 'list') {
      setIsListOpen(true);
    }
  };

  const handleDirectCloseDetail = () => {
    // Auto popup: closing always counts as read so it won't keep returning.
    if (
      detailSource === 'auto' &&
      activeAnnouncement &&
      !readIds.includes(String(activeAnnouncement.id))
    ) {
      handleMarkAsRead(activeAnnouncement.id);
      return;
    }
    setIsDetailOpen(false);
    if (detailSource === 'list') {
      setIsListOpen(true);
    }
  };

  const normalizedContent = useMemo(() => {
    if (!activeAnnouncement?.content) return '';
    const rawContent = String(activeAnnouncement.content);
    return rawContent
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t');
  }, [activeAnnouncement?.content]);

  const renderedHtml = useMemo(() => {
    if (!normalizedContent) return '';
    return renderAnnouncementHtml(normalizedContent);
  }, [normalizedContent]);

  useEffect(() => {
    if (isListOpen || isDetailOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isListOpen, isDetailOpen]);

  const isCurrentActiveUnread = Boolean(
    activeAnnouncement && !readIds.includes(String(activeAnnouncement.id))
  );

  const labels = {
    title: m['announcements.bell.title'](),
    empty: m['announcements.bell.empty'](),
    unread: m['announcements.bell.unread'](),
    read: m['announcements.bell.read'](),
    markAsRead: m['announcements.bell.mark_as_read'](),
    close: m['announcements.bell.close'](),
  };

  return (
    <>
      <button
        type="button"
        aria-label={labels.title}
        onClick={() => setIsListOpen(true)}
        className={`text-foreground hover:text-foreground/80 relative inline-flex cursor-pointer items-center justify-center p-1.5 transition-colors focus:outline-none ${
          className || ''
        }`}
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex size-2">
            <span className="bg-primary absolute inline-flex size-full animate-ping rounded-full opacity-75" />
            <span className="bg-primary relative inline-flex size-2 rounded-full" />
          </span>
        )}
      </button>

      <AnnouncementModals
        locale={locale}
        isListOpen={isListOpen}
        isDetailOpen={isDetailOpen}
        isLoading={isLoading}
        announcements={announcements}
        readIds={readIds}
        activeAnnouncement={activeAnnouncement}
        isCurrentActiveUnread={isCurrentActiveUnread}
        renderedHtml={renderedHtml}
        labels={labels}
        onCloseList={() => setIsListOpen(false)}
        onOpenDetail={(item) => {
          setDetailSource('list');
          setActiveAnnouncement(item);
          setIsDetailOpen(true);
          setIsListOpen(false);
        }}
        onMarkAsRead={handleMarkAsRead}
        onCloseDetail={handleDirectCloseDetail}
      />
    </>
  );
}

import { and, asc, desc, eq, or } from 'drizzle-orm';

import { db } from '@/core/db';
import { announcement } from '@/config/db/schema';
import { getUuid } from '@/lib/hash';
import { sanitizeBannerHtml } from '@/lib/top-banner';

export const ANNOUNCEMENT_KIND = {
  BANNER: 'banner',
  NOTICE: 'notice',
} as const;

export const ANNOUNCEMENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

function cleanKind(kind?: string) {
  return kind === ANNOUNCEMENT_KIND.BANNER
    ? ANNOUNCEMENT_KIND.BANNER
    : ANNOUNCEMENT_KIND.NOTICE;
}

function cleanStatus(status?: string) {
  if (
    status === ANNOUNCEMENT_STATUS.DRAFT ||
    status === ANNOUNCEMENT_STATUS.ARCHIVED
  ) {
    return status;
  }
  return ANNOUNCEMENT_STATUS.PUBLISHED;
}

function toDate(value?: string | Date | null): Date | null {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Same semantics as promotions: open bounds when start/end is null. */
function isWithinWindow(
  startAt: Date | null,
  endAt: Date | null,
  nowMs: number
) {
  if (startAt && nowMs < startAt.getTime()) return false;
  if (endAt && nowMs > endAt.getTime()) return false;
  return true;
}

export function safeAnnouncementHref(value?: string) {
  const href = String(value || '').trim();
  if (!href) return '';
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith('/') && !href.startsWith('//')) return href;
  if (href.startsWith('#')) return href;
  return '';
}

export async function listAnnouncementsAdmin() {
  return db()
    .select()
    .from(announcement)
    .orderBy(asc(announcement.sort), desc(announcement.createdAt))
    .limit(200);
}

export async function saveAnnouncement(input: {
  id?: string;
  title: string;
  content: string;
  locale?: string;
  kind?: string;
  status?: string;
  sort?: number;
  startAt?: string | null;
  endAt?: string | null;
}) {
  const kind = cleanKind(input.kind);
  const title = String(input.title || '').trim();
  const content = String(input.content || '').trim();
  // Banners are content-only (text / URL); notices still need a title.
  if (kind !== ANNOUNCEMENT_KIND.BANNER && !title) {
    throw new Error('title_required');
  }
  if (!content) throw new Error('content_required');
  const startAt = toDate(input.startAt ?? null);
  const endAt = toDate(input.endAt ?? null);
  if (startAt && endAt && startAt.getTime() > endAt.getTime()) {
    throw new Error('invalid_time_range');
  }
  const values: {
    title: string;
    content: string;
    locale: string;
    kind: string;
    status: string;
    sort?: number;
    startAt: Date | null;
    endAt: Date | null;
    updatedAt: Date;
  } = {
    title: (kind === ANNOUNCEMENT_KIND.BANNER ? '' : title).slice(0, 200),
    content: content.slice(0, 8000),
    locale: String(input.locale || '')
      .trim()
      .slice(0, 10),
    kind,
    status: cleanStatus(input.status),
    startAt,
    endAt,
    updatedAt: new Date(),
  };
  if (input.sort !== undefined) {
    values.sort = Number.isFinite(Number(input.sort)) ? Number(input.sort) : 0;
  }
  if (input.id) {
    const [row] = await db()
      .update(announcement)
      .set(values)
      .where(eq(announcement.id, input.id))
      .returning();
    if (!row) throw new Error('not_found');
    return row;
  }
  const [row] = await db()
    .insert(announcement)
    .values({ id: getUuid(), ...values, sort: values.sort ?? 0 })
    .returning();
  return row;
}

export async function deleteAnnouncement(id: string) {
  await db().delete(announcement).where(eq(announcement.id, id));
}

/** Persist drag-and-drop order: items[0] gets sort=0. */
export async function reorderAnnouncements(
  items: { id: string; sort: number }[]
) {
  if (!Array.isArray(items) || items.length === 0) return;
  await Promise.all(
    items.map((item) =>
      db()
        .update(announcement)
        .set({
          sort: Number.isFinite(Number(item.sort)) ? Number(item.sort) : 0,
          updatedAt: new Date(),
        })
        .where(eq(announcement.id, String(item.id)))
    )
  );
}

/** Published rows for the current locale (empty locale matches every language). */
export async function listPublicAnnouncements(locale: string) {
  const nowMs = Date.now();
  const rows = await db()
    .select({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      locale: announcement.locale,
      kind: announcement.kind,
      sort: announcement.sort,
      startAt: announcement.startAt,
      endAt: announcement.endAt,
      createdAt: announcement.createdAt,
    })
    .from(announcement)
    .where(
      and(
        eq(announcement.status, ANNOUNCEMENT_STATUS.PUBLISHED),
        or(eq(announcement.locale, ''), eq(announcement.locale, locale))
      )
    )
    .orderBy(asc(announcement.sort), desc(announcement.createdAt))
    .limit(50);

  const active = rows.filter((row: any) =>
    isWithinWindow(toDate(row.startAt), toDate(row.endAt), nowMs)
  );

  const banners = active
    .filter((row: any) => row.kind === ANNOUNCEMENT_KIND.BANNER)
    .map((row: any) => {
      const content = String(row.content || '').trim();
      const title = String(row.title || '').trim();
      const href = safeAnnouncementHref(content);
      // Same content style as notices (HTML / plain text). Pure URL/path
      // content still becomes a single link for older rows.
      let text: string;
      if (href && content === href) {
        const label = (title || content)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        text = `<a href="${href.replace(/"/g, '')}">${label}</a>`;
      } else {
        text = sanitizeBannerHtml(content || title);
      }
      return {
        id: row.id,
        text,
        locale: String(row.locale || ''),
        startAt: toDate(row.startAt)?.getTime() ?? null,
        endAt: toDate(row.endAt)?.getTime() ?? null,
      };
    });
  const notices = active
    .filter((row: any) => row.kind !== ANNOUNCEMENT_KIND.BANNER)
    .map((row: any) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      createdAt: row.createdAt,
    }));
  return { banners, notices, list: notices };
}

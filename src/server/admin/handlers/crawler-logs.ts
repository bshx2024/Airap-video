import { and, count, desc, eq, gte, ilike, or } from 'drizzle-orm';
import { db } from '@/core/db';
import { crawlerLog } from '@/config/db/schema';
import { respData } from '@/lib/resp';
import type { AdminHandlerContext } from '../types';

export async function GET({ searchParams }: AdminHandlerContext) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
  const offset = (page - 1) * pageSize;
  const botType = searchParams.get('botType');
  const search = searchParams.get('search')?.trim();
  const onlyContent = searchParams.get('onlyContent') === 'true';
  const onlyVerified = searchParams.get('onlyVerified') === 'true';

  const conditions = [];
  if (botType && botType !== 'all') {
    conditions.push(eq(crawlerLog.botType, botType));
  }
  if (onlyContent) {
    conditions.push(eq(crawlerLog.isContent, 1));
  }
  if (onlyVerified) {
    conditions.push(eq(crawlerLog.isVerified, 1));
  }
  if (search) {
    conditions.push(
      or(
        ilike(crawlerLog.ip, `%${search}%`),
        ilike(crawlerLog.path, `%${search}%`),
        ilike(crawlerLog.userAgent, `%${search}%`)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // 1. Fetch Paginated Records
  const [records, totalRows] = await Promise.all([
    db()
      .select()
      .from(crawlerLog)
      .where(whereClause)
      .orderBy(desc(crawlerLog.createdAt))
      .limit(pageSize)
      .offset(offset),
    db()
      .select({ count: count() })
      .from(crawlerLog)
      .where(whereClause)
      .then((r) => r[0]?.count || 0),
  ]);

  // 2. Fetch Stats Overview (Today & Cohorts)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    totalAll,
    todayHits,
    verifiedHits,
    contentHits,
    googleHits,
    bingHits,
    openaiHits,
    claudeHits,
    byteSpiderHits,
    ahrefsHits,
    scannerHits,
  ] = await Promise.all([
    db().select({ count: count() }).from(crawlerLog).then((r) => r[0]?.count || 0),
    db().select({ count: count() }).from(crawlerLog).where(gte(crawlerLog.createdAt, todayStart)).then((r) => r[0]?.count || 0),
    db().select({ count: count() }).from(crawlerLog).where(eq(crawlerLog.isVerified, 1)).then((r) => r[0]?.count || 0),
    db().select({ count: count() }).from(crawlerLog).where(eq(crawlerLog.isContent, 1)).then((r) => r[0]?.count || 0),
    db().select({ count: count() }).from(crawlerLog).where(eq(crawlerLog.botType, 'googlebot')).then((r) => r[0]?.count || 0),
    db().select({ count: count() }).from(crawlerLog).where(eq(crawlerLog.botType, 'bingbot')).then((r) => r[0]?.count || 0),
    db().select({ count: count() }).from(crawlerLog).where(eq(crawlerLog.botType, 'openai')).then((r) => r[0]?.count || 0),
    db().select({ count: count() }).from(crawlerLog).where(eq(crawlerLog.botType, 'claude')).then((r) => r[0]?.count || 0),
    db().select({ count: count() }).from(crawlerLog).where(eq(crawlerLog.botType, 'bytespider')).then((r) => r[0]?.count || 0),
    db().select({ count: count() }).from(crawlerLog).where(eq(crawlerLog.botType, 'ahrefs')).then((r) => r[0]?.count || 0),
    db().select({ count: count() }).from(crawlerLog).where(eq(crawlerLog.botType, 'scanner')).then((r) => r[0]?.count || 0),
  ]);

  return respData({
    data: records,
    total: totalRows,
    page,
    pageSize,
    stats: {
      totalAll,
      todayHits,
      verifiedHits,
      contentHits,
      googleHits,
      bingHits,
      openaiHits,
      claudeHits,
      byteSpiderHits,
      ahrefsHits,
      scannerHits,
    },
  });
}

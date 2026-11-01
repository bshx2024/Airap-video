/**
 * CLI Crawler & AI Search Bot Diagnostic Report
 * Inspired by APIVALE's fast_detect_crawlers.mjs.
 * Evaluates Verified Real Bots, Content Milestones, and AI Engine Ingestion.
 *
 * Usage:
 *   npx tsx scripts/detect-crawlers.ts
 */

import { createClient } from '@libsql/client';

async function main() {
  const dbUrl = process.env.DATABASE_URL || 'file:data/local.db';
  const client = createClient({ url: dbUrl });

  console.log('======================================================================');
  console.log('           AIRAP VIDEO - SEO & AI CRAWLER DIAGNOSTIC REPORT           ');
  console.log('======================================================================');

  // Check table
  try {
    const totalRes = await client.execute('SELECT count(*) as count FROM crawler_log');
    const totalCount = Number(totalRes.rows[0]?.count || 0);
    console.log(`📊 数据库日志总行数: ${totalCount}`);

    if (totalCount === 0) {
      console.log('💡 当前本地数据库尚无爬虫抓取记录。');
      console.log('   如需分析线上生产数据，可通过 Cloudflare D1 执行查询，或访问:');
      console.log('   https://airap-video.net/admin/crawler-logs\n');
      return;
    }

    // Milestones by Bot
    const bots = ['googlebot', 'bingbot', 'openai', 'claude', 'apple', 'bytespider', 'ahrefs', 'semrush'];
    console.log('\n--- 🕷️ 核心搜索引擎与 AI 爬虫抓取里程碑 ---');
    console.log(`${'爬虫类型'.padEnd(14)} | ${'状态'.padEnd(10)} | ${'首次来访时间'.padEnd(20)} | ${'首次抓取页面'.padEnd(25)} | ${'实质抓取次数'}`);
    console.log('-'.repeat(85));

    for (const b of bots) {
      const botLogs = await client.execute({
        sql: `SELECT path, is_verified, is_content, datetime(created_at/1000, 'unixepoch', '+8 hours') as time_bj 
              FROM crawler_log 
              WHERE bot_type = ? 
              ORDER BY created_at ASC`,
        args: [b],
      });

      if (botLogs.rows.length === 0) {
        console.log(`${b.padEnd(14)} | ${'未曾来访'.padEnd(10)} | ${'-'.padEnd(20)} | ${'-'.padEnd(25)} | 0`);
        continue;
      }

      const firstLog = botLogs.rows[0];
      const contentLogs = botLogs.rows.filter((r) => r.is_content === 1);
      const firstContent = contentLogs[0];
      const hasVerified = botLogs.rows.some((r) => r.is_verified === 1);

      const statusTag = hasVerified ? '✅ VERIFIED' : '⚠️ UNVERIFIED';
      const firstTime = String(firstLog.time_bj || '-');
      const firstPath = firstContent ? String(firstContent.path).slice(0, 24) : '仅探针/静态文件';
      const contentCount = contentLogs.length;

      console.log(
        `${b.padEnd(14)} | ${statusTag.padEnd(10)} | ${firstTime.padEnd(20)} | ${firstPath.padEnd(25)} | ${contentCount}`
      );
    }

    console.log('======================================================================\n');
  } catch (err: unknown) {
    console.error('Diagnostic error:', err);
  }
}

main().catch(console.error);

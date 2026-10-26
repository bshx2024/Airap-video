import { createFileRoute } from '@tanstack/react-router';
import { desc, count } from 'drizzle-orm';
import { db } from '@/core/db';
import { crawlerLog } from '@/config/db/schema';

export const Route = createFileRoute('/api/diag/crawler-stats')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get('token');
        if (token !== 'airap-crawler-check-8899') {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        try {
          const [totalRes, records] = await Promise.all([
            db().select({ count: count() }).from(crawlerLog),
            db()
              .select()
              .from(crawlerLog)
              .orderBy(desc(crawlerLog.createdAt))
              .limit(100),
          ]);

          return new Response(
            JSON.stringify(
              {
                total: totalRes[0]?.count || 0,
                records,
              },
              null,
              2
            ),
            {
              headers: { 'Content-Type': 'application/json' },
            }
          );
        } catch (err: any) {
          return new Response(
            JSON.stringify({ error: err?.message || 'Database error' }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      },
    },
  },
});

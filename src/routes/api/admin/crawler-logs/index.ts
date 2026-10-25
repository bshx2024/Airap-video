import { createFileRoute } from '@tanstack/react-router';
import { runAdminRoute } from '@/server/admin/execute';

export const Route = createFileRoute('/api/admin/crawler-logs/')({
  server: {
    handlers: {
      GET: (context) => runAdminRoute('crawler_logs_list', context),
    },
  },
});

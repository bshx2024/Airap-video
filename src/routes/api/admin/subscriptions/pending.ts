import { createFileRoute } from '@tanstack/react-router';
import { runAdminRoute } from '@/server/admin/execute';

export const Route = createFileRoute('/api/admin/subscriptions/pending')({
  server: {
    handlers: {
      POST: (context) => runAdminRoute('subscriptions_sync_pending', context),
      DELETE: (context) =>
        runAdminRoute('subscriptions_clear_pending', context),
    },
  },
});

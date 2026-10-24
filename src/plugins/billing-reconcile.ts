import { definePlugin } from 'nitro';

import { runWithDbScope } from '@/core/db/request-scope';
import { reconcileLapsedSubscriptions } from '@/modules/payment/renewal-reconcile';

// Rides the existing daily Cron Trigger (wrangler `triggers.crons`): replay
// renewals / booked downgrades whose webhook was lost. See renewal-reconcile.ts.
export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook('cloudflare:scheduled', ({ controller, context }) => {
    context.waitUntil(
      runWithDbScope(() =>
        reconcileLapsedSubscriptions({ now: controller.scheduledTime })
      )
        .then((summary) => {
          console.info('Billing reconcile completed:', summary);
        })
        .catch((error) => {
          console.error('Billing reconcile failed:', error);
        })
    );
  });
});

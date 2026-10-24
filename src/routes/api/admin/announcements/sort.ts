import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { reorderAnnouncements } from '@/modules/announcements/service';
import { hasPermission } from '@/modules/rbac/service';
import { respErr, respOk } from '@/lib/resp';

async function requireAdmin(request: Request) {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) throw new Error('Unauthorized');
  const ok = await hasPermission(session.user.id, 'admin.*');
  if (!ok) throw new Error('Forbidden');
}

async function POST({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const body = await request.json().catch(() => null);
    const items = Array.isArray(body?.items) ? body.items : null;
    if (!items?.length) return respErr('Invalid body');
    await reorderAnnouncements(
      items.map((item: { id?: string; sort?: number }) => ({
        id: String(item.id || ''),
        sort: Number(item.sort) || 0,
      }))
    );
    return respOk();
  } catch (error: any) {
    return respErr(error instanceof Error ? error.message : 'internal_error');
  }
}

export const Route = createFileRoute('/api/admin/announcements/sort')({
  server: { handlers: { POST } },
});

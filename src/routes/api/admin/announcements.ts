import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  deleteAnnouncement,
  listAnnouncementsAdmin,
  saveAnnouncement,
} from '@/modules/announcements/service';
import { hasPermission } from '@/modules/rbac/service';
import { respData, respErr, respOk } from '@/lib/resp';

async function requireAdmin(request: Request) {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) throw new Error('Unauthorized');
  const ok = await hasPermission(session.user.id, 'admin.*');
  if (!ok) throw new Error('Forbidden');
}

async function GET({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    return respData({ items: await listAnnouncementsAdmin() });
  } catch (error: any) {
    return respErr(error instanceof Error ? error.message : 'internal_error');
  }
}

async function POST({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const body = await request.json().catch(() => ({}));
    const row = await saveAnnouncement(body);
    return respData(row);
  } catch (error: any) {
    return respErr(error instanceof Error ? error.message : 'internal_error');
  }
}

async function DELETE({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const id = new URL(request.url).searchParams.get('id') || '';
    if (!id) return respErr('not_found');
    await deleteAnnouncement(id);
    return respOk();
  } catch (error: any) {
    return respErr(error instanceof Error ? error.message : 'internal_error');
  }
}

export const Route = createFileRoute('/api/admin/announcements')({
  server: { handlers: { GET, POST, DELETE } },
});

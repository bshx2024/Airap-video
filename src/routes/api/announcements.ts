import { createFileRoute } from '@tanstack/react-router';

import { listPublicAnnouncements } from '@/modules/announcements/service';
import { respData, respErr } from '@/lib/resp';

async function GET({ request }: { request: Request }) {
  try {
    const locale = new URL(request.url).searchParams.get('locale') || 'en';
    const data = await listPublicAnnouncements(locale === 'zh' ? 'zh' : 'en');
    return respData(data);
  } catch (error) {
    console.error('announcements:', error);
    return respErr('announcements_unavailable');
  }
}

export const Route = createFileRoute('/api/announcements')({
  server: { handlers: { GET } },
});

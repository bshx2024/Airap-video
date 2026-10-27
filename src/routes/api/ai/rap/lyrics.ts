import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { generateRapLyrics } from '@/modules/ai/rap-workflow';
import { respData, respErr } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    // AI 试词对访客开放试用体验，成片生成则严格校验登录与积分扣除

    const body = await request.json().catch(() => ({}));
    const { topic = '', styleId = 'boom-bap', language = 'zh' } = body;

    if (!topic || typeof topic !== 'string') {
      return respErr('Topic is required');
    }

    const result = await generateRapLyrics({
      topic: topic.trim(),
      styleId,
      language,
    });

    return respData(result);
  } catch (err: any) {
    console.error('Failed to generate rap lyrics:', err);
    return respErr(err.message || 'Failed to generate rap lyrics');
  }
}

export const Route = createFileRoute('/api/ai/rap/lyrics')({
  server: {
    handlers: { POST },
  },
});

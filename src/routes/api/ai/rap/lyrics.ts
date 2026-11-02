import { createFileRoute } from '@tanstack/react-router';

import { scanPromptSafety } from '@/lib/content-safety';
import { generateRapLyrics } from '@/modules/ai/rap-workflow';
import { respData, respErr } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json().catch(() => ({}));
    const { topic = '', styleId = 'boom-bap', language = 'zh', model, vocalGender = 'auto' } = body;

    if (!topic || typeof topic !== 'string') {
      return respErr('Topic is required');
    }

    const trimmedTopic = topic.trim();
    const safetyCheck = await scanPromptSafety(
      trimmedTopic,
      language === 'zh' ? 'zh' : 'en'
    );
    if (!safetyCheck.allowed) {
      return respErr(
        safetyCheck.reason ||
          'Content safety check failed. Please adjust your topic.',
        { status: 400 }
      );
    }

    const result = await generateRapLyrics({
      topic: trimmedTopic,
      styleId,
      language,
      model,
      vocalGender,
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

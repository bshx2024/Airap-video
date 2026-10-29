import { createFileRoute } from '@tanstack/react-router';

import { generateRapLyrics } from '@/modules/ai/rap-workflow';
import { respData, respErr } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  try {
    const { topic = '', styleId = 'boom-bap', language = 'zh', model, vocalGender = 'auto' } = body;

    if (!topic || typeof topic !== 'string') {
      return respErr('Topic is required');
    }

    const result = await generateRapLyrics({
      topic: topic.trim(),
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

import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { startRapTask } from '@/modules/ai/rap-workflow';
import { respData, respErr } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return respErr('Unauthorized');
    }

    const body = await request.json().catch(() => ({}));
    const {
      imageUrl = '',
      imageUrls = [],
      studioMode = 'duo',
      prompt = '',
      styleId = 'boom-bap',
      customLyrics = '',
    } = body;

    const validImageUrls: string[] =
      Array.isArray(imageUrls) && imageUrls.length > 0
        ? imageUrls
        : imageUrl
          ? [imageUrl]
          : [];

    if (validImageUrls.length === 0) {
      return respErr('Portrait image is required');
    }

    if (!prompt && !customLyrics) {
      return respErr('Theme prompt or lyrics is required');
    }

    const taskResult = await startRapTask({
      userId: session.user.id,
      userEmail: session.user.email,
      imageUrl: validImageUrls[0],
      imageUrls: validImageUrls,
      studioMode,
      prompt: prompt || 'AI Rap Freestyle',
      styleId,
      customLyrics,
    });

    return respData({
      id: taskResult.taskId,
      taskId: taskResult.taskId,
      taskStatus: 'processing',
      costCredits: taskResult.costCredits,
    });
  } catch (err: any) {
    console.error('Failed to start rap task:', err);
    return respErr(err.message || 'Failed to start AI Rap generation');
  }
}

export const Route = createFileRoute('/api/ai/rap/generate')({
  server: {
    handlers: { POST },
  },
});

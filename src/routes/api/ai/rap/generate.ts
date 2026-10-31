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
      videoPrompt = '',
      scenarioId = '',
      styleId = 'boom-bap',
      customLyrics = '',
      referenceVideoUrl = '',
      audioOption = 'original',
      audioUrl = '',
      duration = 5,
      aspectRatio = '9:16',
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

    if (!prompt && !customLyrics && !referenceVideoUrl) {
      return respErr('Theme prompt, lyrics, or reference video is required');
    }

    const taskResult = await startRapTask({
      userId: session.user.id,
      userEmail: session.user.email,
      imageUrl: validImageUrls[0],
      imageUrls: validImageUrls,
      studioMode,
      prompt: prompt || (referenceVideoUrl ? 'Master Video Motion Mimic Rap' : 'AI Rap Freestyle'),
      videoPrompt,
      scenarioId,
      styleId,
      customLyrics,
      referenceVideoUrl,
      audioOption,
      audioUrl,
      duration: Number(duration) || 5,
      aspectRatio: aspectRatio === '16:9' ? '16:9' : '9:16',
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

import { createFileRoute } from '@tanstack/react-router';
import { and, desc, eq, isNull, ne } from 'drizzle-orm';

import { extractAudioUrl, extractMediaUrl } from '@/core/ai';
import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import { expireTimedOutTasks } from '@/modules/ai-tasks/service';
import { respData, respErr } from '@/lib/resp';

import { getPublicTaskErrorCode } from './-task-utils';

async function GET({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return respData({ items: [] });
    }

    const url = new URL(request.url);
    const mediaType = url.searchParams.get('mediaType');
    const modelParam = url.searchParams.get('model');
    const limitParam = Number(url.searchParams.get('limit')) || 24;

    const conditions = [
      eq(aiTask.userId, session.user.id),
      ne(aiTask.status, 'canceled'),
      isNull(aiTask.deletedAt),
    ];

    if (mediaType && ['image', 'video', 'music'].includes(mediaType)) {
      conditions.push(eq(aiTask.mediaType, mediaType));
    }

    if (modelParam && modelParam !== 'all') {
      conditions.push(eq(aiTask.model, modelParam));
    }

    // Select only lightweight columns to avoid loading multi-megabyte base64 strings in options/payloads
    const tasks = await db()
      .select({
        id: aiTask.id,
        taskId: aiTask.taskId,
        userId: aiTask.userId,
        mediaType: aiTask.mediaType,
        model: aiTask.model,
        prompt: aiTask.prompt,
        status: aiTask.status,
        scene: aiTask.scene,
        taskInfo: aiTask.taskInfo,
        taskResult: aiTask.taskResult,
        createdAt: aiTask.createdAt,
      })
      .from(aiTask)
      .where(and(...conditions))
      .orderBy(desc(aiTask.createdAt))
      .limit(Math.min(limitParam, 30));

    const creations = tasks
      .map((t: any) => {
        let parsedResult: any = null;
        try {
          if (t.taskResult) {
            parsedResult = JSON.parse(t.taskResult);
          }
        } catch {}

        const isMusic = t.mediaType === 'music';
        let mediaUrl = parsedResult
          ? isMusic
            ? extractAudioUrl(parsedResult)
            : extractMediaUrl(parsedResult)
          : '';

        let parsedInfo: any = null;
        if (t.taskInfo) {
          try {
            parsedInfo = JSON.parse(t.taskInfo);
          } catch {}
        }

        if (!mediaUrl && parsedInfo) {
          mediaUrl = isMusic
            ? extractAudioUrl(parsedInfo)
            : extractMediaUrl(parsedInfo);
        }

        // Never return massive data URIs in list
        if (mediaUrl && mediaUrl.startsWith('data:')) {
          mediaUrl = '';
        }

        const taskStatus = t.status || 'success';

        // Drop empty pre-flight failures
        if (
          taskStatus === 'failed' &&
          !mediaUrl &&
          !parsedInfo &&
          !parsedResult
        ) {
          return null;
        }

        if (
          !mediaUrl &&
          taskStatus !== 'failed' &&
          taskStatus !== 'pending' &&
          taskStatus !== 'processing'
        ) {
          return null;
        }

        let itemMode = !t.scene?.startsWith('ai_') ? t.scene : undefined;
        if (!itemMode) {
          if (t.mediaType === 'video') {
            itemMode = 'image-to-video';
          } else if (t.mediaType === 'music') {
            itemMode = 'text-to-music';
          } else {
            itemMode = 'text-to-image';
          }
        }

        let thumb = parsedResult?.thumbnailUrl || undefined;
        if (thumb && thumb.startsWith('data:')) {
          thumb = undefined;
        }

        return {
          id: t.taskId || t.id,
          dbId: t.id,
          mediaType: (t.mediaType as 'image' | 'video' | 'music') || 'video',
          mode: itemMode,
          status: taskStatus,
          errorCode:
            taskStatus === 'failed'
              ? getPublicTaskErrorCode({
                  taskInfo: parsedInfo,
                  taskResult: parsedResult,
                })
              : undefined,
          prompt: t.prompt,
          model: t.model,
          url: mediaUrl,
          thumbnailUrl: thumb,
          createdAt:
            t.createdAt instanceof Date
              ? t.createdAt.getTime()
              : Number(t.createdAt) || Date.now(),
        };
      })
      .filter(Boolean);

    return respData({ items: creations });
  } catch (error: any) {
    console.error('Failed to fetch user creations:', error);
    return respErr('Failed to fetch creations');
  }
}

export const Route = createFileRoute('/api/ai/creations')({
  server: {
    handlers: { GET },
  },
});

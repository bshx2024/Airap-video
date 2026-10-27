import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { getAIProvider } from '@/modules/ai/service';
import { isMockMode } from '@/modules/config/service';
import { getUuid } from '@/lib/hash';
import { respData, respErr } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      lyrics = '',
      title = 'AI Rap Track',
      style = 'boom-bap, heavy 808 bass, 95 bpm',
      instrumental = false,
      model = 'suno-v4',
      mock: reqMock,
    } = body;

    if (!lyrics && !instrumental) {
      return respErr('Lyrics is required when instrumental is false');
    }

    const mock = reqMock !== undefined ? Boolean(reqMock) : await isMockMode();

    if (mock) {
      // 0 成本调试模拟
      const mockTaskId = `mock_music_${getUuid().slice(0, 8)}`;
      return respData({
        taskId: mockTaskId,
        status: 'success',
        audioUrl: 'https://pixanyoss.16781678.xyz/test.mp3',
        mock: true,
        message: 'Mock 模式：已即时生成示例音频',
      });
    }

    const provider = await getAIProvider();
    if (!provider) {
      return respErr('No AI Provider (APIMart / KIE) configured for Suno music.');
    }

    const callbackUrl = `${envConfigs.app_url || 'https://airap.video'}/api/ai/task`;

    const res = await provider.generate({
      params: {
        mediaType: 'music' as any,
        prompt: lyrics,
        model,
        callbackUrl,
        options: {
          customMode: true,
          title,
          style,
          lyrics,
          instrumental: Boolean(instrumental),
        },
      },
    });

    return respData({
      taskId: res.taskId,
      status: 'processing',
      mock: false,
      message: '已成功向 Suno 调度编曲任务',
    });
  } catch (err: any) {
    console.error('Workflow Music Error:', err);
    return respErr(err.message || 'Failed to generate music');
  }
}

export const Route = createFileRoute('/api/ai/workflow/music')({
  server: {
    handlers: { POST },
  },
});

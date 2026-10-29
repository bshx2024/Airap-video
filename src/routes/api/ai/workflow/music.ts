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
      vocalGender = 'auto',
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

    // Check if Alibaba Cloud Model Studio should handle music (Fun-Music model or fallback)
    const { getAllConfigs } = await import('@/modules/config/service');
    const configs = await getAllConfigs();
    const alibabaApiKey = configs.alibaba_api_key || envConfigs.alibaba_api_key;
    const alibabaBaseUrl = configs.alibaba_base_url || envConfigs.alibaba_base_url;

    const isAlibabaModel =
      model.toLowerCase().includes('fun-music') ||
      model.toLowerCase().includes('alibaba');
    const shouldUseAlibaba = (isAlibabaModel || !provider) && Boolean(alibabaApiKey);

    if (shouldUseAlibaba && alibabaApiKey) {
      const origin = new URL(
        alibabaBaseUrl || 'https://ws-2txa9apyfxruykae.us-east-1.maas.aliyuncs.com'
      ).origin;
      const endpoint = `${origin}/api/v1/services/audio/music/generation`;

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${alibabaApiKey.trim()}`,
        },
        body: JSON.stringify({
          model: 'fun-music-v1',
          input: {
            prompt: style || 'heavy 808 bass, 140 bpm, hiphop flow, rap beat',
            lyrics: lyrics || undefined,
            is_instrumental: Boolean(instrumental),
            gender: vocalGender === 'female' ? 'female' : 'male',
          },
        }),
      });

      const json: any = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(
          json?.message ||
          json?.output?.message ||
          `阿里百炼 Fun-Music 编曲接口调用失败 (${resp.status})`
        );
      }

      // Check if output returned direct audio URL
      const directAudioUrl = json?.output?.audio?.url || json?.output?.audio_url;
      if (directAudioUrl) {
        return respData({
          taskId: json.request_id || `ali_music_${Date.now()}`,
          status: 'success',
          audioUrl: directAudioUrl,
          mock: false,
          message: '阿里百炼 Fun-Music 编曲完成',
        });
      }

      // Check if async task
      const asyncTaskId = json?.output?.task_id || json?.request_id;
      if (asyncTaskId) {
        return respData({
          taskId: asyncTaskId,
          status: 'processing',
          provider: 'alibaba',
          mock: false,
          message: '已成功向阿里百炼 Fun-Music 提交编曲任务',
        });
      }

      throw new Error('阿里百炼 Fun-Music 未返回音频地址或任务ID');
    }

    if (!provider) {
      return respErr(
        '未检测到 Suno 音乐渠道配置。若需使用 Suno v4，请在后台设置 [Settings -> AI -> KIE] 中填入 KIE API Key；或使用阿里百炼 Fun-Music 编曲。'
      );
    }

    const callbackUrl = `${envConfigs.app_url || 'https://airap.video'}/api/ai/task`;

    let finalStyle = style;
    if (vocalGender === 'female' && !finalStyle.toLowerCase().includes('female vocal')) {
      finalStyle = `female vocal, melodic rap flow, ${finalStyle}`;
    } else if (vocalGender === 'duet' && !finalStyle.toLowerCase().includes('duet')) {
      finalStyle = `male and female rap duet, back and forth cypher, alternating vocalists, ${finalStyle}`;
    } else if (vocalGender === 'male' && !finalStyle.toLowerCase().includes('male vocal')) {
      finalStyle = `male vocal, aggressive rap flow, ${finalStyle}`;
    }

    const res = await provider.generate({
      params: {
        mediaType: 'music' as any,
        prompt: lyrics,
        model,
        callbackUrl,
        options: {
          customMode: true,
          title: (title || 'Hotel Lobby Cypher')
            .replace(/(quavo|takeoff|migos|drake|eminem|kanye|travis|carti|kendrick)/gi, 'MC')
            .trim() || 'Hotel Lobby Cypher',
          style: finalStyle,
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

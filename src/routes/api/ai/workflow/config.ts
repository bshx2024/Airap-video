import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { RAP_STYLE_PRESETS } from '@/config/rap-presets';
import { getAllConfigs, isMockMode } from '@/modules/config/service';
import { respData, respErr } from '@/lib/resp';

async function GET() {
  try {
    const configs = await getAllConfigs();
    const mock = await isMockMode();

    return respData({
      mock,
      videoModel: envConfigs.rap_video_model || 'happyhorse-1.1-r2v',
      videoResolution: envConfigs.rap_video_resolution || '480p',
      musicModel: 'suno-v4',
      lyricsModel: configs.alibaba_model || envConfigs.alibaba_model || 'deepseek-v4.1-flash-1017',
      styles: RAP_STYLE_PRESETS,
      availableVideoModels: [
        { id: 'happyhorse-1.1-r2v', name: 'HappyHorse 1.1 R2V (超低成本调试 ~$0.025/s)' },
        { id: 'seedance-2-5', name: 'Seedance 2.5 (大动作全身编舞 ~$1.50/次)' },
        { id: 'minimax-h3', name: 'MiniMax Hailuo H3 (超写实电影感)' },
        { id: 'wan-2-7', name: 'Wan 2.7 Image-to-Video' },
      ],
      availableMusicModels: [
        { id: 'suno-v4', name: 'Suno v4 (高燃 808 与说唱 Flow)' },
        { id: 'suno-v3.5', name: 'Suno v3.5 (经典稳定版)' },
      ],
      availableLyricsModels: [
        { id: 'deepseek-v4.1-flash-1017', name: 'DeepSeek V3 / R1 (阿里百炼高燃作词)' },
        { id: 'template-engine', name: '内置双押高品质模板库 (100% 稳定)' },
      ],
    });
  } catch (err: any) {
    return respErr(err.message || 'Failed to load workflow configs');
  }
}

export const Route = createFileRoute('/api/ai/workflow/config')({
  server: {
    handlers: { GET },
  },
});

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
      videoModel: configs.alibaba_video_model || envConfigs.rap_video_model || 'happyhorse-1.1-r2v',
      videoResolution: configs.alibaba_video_resolution || envConfigs.rap_video_resolution || '480p',
      musicModel: configs.kie_api_key ? 'suno-v4' : (configs.alibaba_api_key ? 'fun-music-v1' : 'suno-v4'),
      lyricsModel: configs.alibaba_model || envConfigs.alibaba_model || 'deepseek-v4.1-flash-1017',
      styles: RAP_STYLE_PRESETS,
      availableVideoModels: [
        { id: 'happyhorse-1.1-i2v', name: 'HappyHorse 1.1 I2V (单人人像·自由生成·推荐)' },
        { id: 'wan3.0-video', name: 'Wan 3.0 Video (万相3.0·原版姿态/高保真)' },
        { id: 'happyhorse-1.1-r2v', name: 'HappyHorse 1.1 R2V (阿里双人·多图驱动)' },
      ],
      availableMusicModels: [
        { id: 'fun-music-v1', name: 'Fun-Music v1 (阿里百炼·说唱谱曲与伴奏)' },
        { id: 'suno-v4', name: 'Suno v4 (重低音 808 与卡点说唱·需 KIE 密钥)' },
        { id: 'suno-v3.5', name: 'Suno v3.5 (旋律嘻哈标准版·需 KIE 密钥)' },
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

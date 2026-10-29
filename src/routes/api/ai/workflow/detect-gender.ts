import { createFileRoute } from '@tanstack/react-router';
import { envConfigs } from '@/config';
import { getAllConfigs } from '@/modules/config/service';
import { respData, respErr } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json().catch(() => ({}));
    const { imageUrl } = body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return respData({ gender: 'male', confidence: 0.5 });
    }

    const configs = await getAllConfigs();
    const alibabaKey = configs.alibaba_api_key || envConfigs.alibaba_api_key;
    const alibabaBaseUrl =
      configs.alibaba_base_url ||
      envConfigs.alibaba_base_url ||
      'https://ws-2txa9apyfxruykae.us-east-1.maas.aliyuncs.com/compatible-mode/v1';

    // If Alibaba API key is present, attempt Qwen-VL detection
    if (alibabaKey && imageUrl.startsWith('http')) {
      try {
        const resp = await fetch(`${alibabaBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${alibabaKey.trim()}`,
          },
          body: JSON.stringify({
            model: 'qwen-vl-plus',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'image_url', image_url: { url: imageUrl } },
                  {
                    type: 'text',
                    text: 'Identify the gender of the primary person in this portrait image. Reply ONLY with the word "male" or "female". Do not add any punctuation or other words.',
                  },
                ],
              },
            ],
            max_tokens: 10,
          }),
        });

        if (resp.ok) {
          const json = await resp.json();
          const text = (json?.choices?.[0]?.message?.content || '').toLowerCase().trim();
          if (text.includes('female') || text.includes('woman') || text.includes('girl')) {
            return respData({ gender: 'female', confidence: 0.95 });
          }
          if (text.includes('male') || text.includes('man') || text.includes('boy')) {
            return respData({ gender: 'male', confidence: 0.95 });
          }
        }
      } catch (err) {
        console.warn('Qwen-VL gender detection fallback:', err);
      }
    }

    // Default fallback
    return respData({ gender: 'male', confidence: 0.6 });
  } catch (err: any) {
    return respErr(err.message || 'Gender detection failed');
  }
}

export const Route = createFileRoute('/api/ai/workflow/detect-gender')({
  server: {
    handlers: { POST },
  },
});

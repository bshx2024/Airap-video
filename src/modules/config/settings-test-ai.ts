import { ApimartProvider } from '@/core/ai/apimart';
import { FalProvider } from '@/core/ai/fal';
import { KieProvider } from '@/core/ai/kie';
import { ReplicateProvider } from '@/core/ai/replicate';
import { AIMediaType } from '@/core/ai/types';

import type { TestResult } from './settings-test-specs';
import { need } from './settings-test-utils';

export async function testOpenAI(
  inputs: Record<string, string>,
  configs: Record<string, string>
): Promise<TestResult> {
  const missing = need(configs, ['openai_api_key']);
  if (missing) return { success: false, message: missing };

  const baseUrl = (
    configs.openai_base_url || 'https://api.openai.com/v1'
  ).replace(/\/+$/, '');
  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${configs.openai_api_key}`,
    },
    body: JSON.stringify({
      model: inputs.model,
      messages: [{ role: 'user', content: inputs.prompt }],
      max_tokens: 64,
    }),
  });

  const data: any = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    return {
      success: false,
      message: data?.error?.message || `Request failed (${resp.status})`,
    };
  }

  const reply = String(data?.choices?.[0]?.message?.content ?? '').trim();
  return {
    success: true,
    message: 'OpenAI accepted the request',
    details: {
      Model: data?.model || inputs.model,
      Reply: reply.slice(0, 200) || '(empty)',
    },
  };
}

export async function testAnthropic(
  inputs: Record<string, string>,
  configs: Record<string, string>
): Promise<TestResult> {
  const missing = need(configs, ['anthropic_api_key']);
  if (missing) return { success: false, message: missing };

  const baseUrl = (
    configs.anthropic_base_url || 'https://api.anthropic.com'
  ).replace(/\/+$/, '');
  const resp = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': configs.anthropic_api_key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: inputs.model,
      max_tokens: 64,
      messages: [{ role: 'user', content: inputs.prompt }],
    }),
  });

  const data: any = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    return {
      success: false,
      message: data?.error?.message || `Request failed (${resp.status})`,
    };
  }

  const reply = Array.isArray(data?.content)
    ? data.content
        .map((b: any) => b?.text || '')
        .join('')
        .trim()
    : '';
  return {
    success: true,
    message: 'Anthropic accepted the request',
    details: {
      Model: data?.model || inputs.model,
      Reply: reply.slice(0, 200) || '(empty)',
    },
  };
}

export async function testReplicate(
  inputs: Record<string, string>,
  configs: Record<string, string>
): Promise<TestResult> {
  const missing = need(configs, ['replicate_api_token']);
  if (missing) return { success: false, message: missing };

  const provider = new ReplicateProvider({
    apiToken: configs.replicate_api_token,
  });
  const result = await provider.generate({
    params: {
      mediaType: AIMediaType.IMAGE,
      model: inputs.model,
      prompt: inputs.prompt,
    },
  });
  return {
    success: true,
    message: 'Replicate accepted the request',
    details: { 'Task ID': result.taskId, Status: result.taskStatus },
  };
}

export async function testFal(
  inputs: Record<string, string>,
  configs: Record<string, string>
): Promise<TestResult> {
  const missing = need(configs, ['fal_api_key']);
  if (missing) return { success: false, message: missing };

  const provider = new FalProvider({ apiKey: configs.fal_api_key });
  const result = await provider.generate({
    params: {
      mediaType: AIMediaType.IMAGE,
      model: inputs.model,
      prompt: inputs.prompt,
    },
  });
  return {
    success: true,
    message: 'Fal accepted the request',
    details: { 'Task ID': result.taskId, Status: result.taskStatus },
  };
}

export async function testApimart(
  inputs: Record<string, string>,
  configs: Record<string, string>
): Promise<TestResult> {
  const missing = need(configs, ['apimart_api_key']);
  if (missing) return { success: false, message: missing };

  const provider = new ApimartProvider({
    apiKey: configs.apimart_api_key,
    baseUrl: configs.apimart_base_url,
  });
  const result = await provider.generate({
    params: {
      mediaType: AIMediaType.IMAGE,
      model: 'flux-2',
      prompt: inputs.prompt || 'a cute cat',
    },
  });
  return {
    success: true,
    message: 'APIMart accepted the request',
    details: { 'Task ID': result.taskId, Status: result.taskStatus },
  };
}

export async function testKie(
  inputs: Record<string, string>,
  configs: Record<string, string>
): Promise<TestResult> {
  const missing = need(configs, ['kie_api_key']);
  if (missing) return { success: false, message: missing };

  const provider = new KieProvider({
    apiKey: configs.kie_api_key,
    baseUrl: configs.kie_base_url,
  });
  const result = await provider.generate({
    params: {
      mediaType: AIMediaType.IMAGE,
      model: 'flux-2',
      prompt: inputs.prompt || 'a cute cat',
    },
  });
  return {
    success: true,
    message: 'KIE accepted the request',
    details: { 'Task ID': result.taskId, Status: result.taskStatus },
  };
}

export async function testAlibaba(
  inputs: Record<string, string>,
  configs: Record<string, string>
): Promise<TestResult> {
  const missing = need(configs, ['alibaba_api_key']);
  if (missing) return { success: false, message: missing };

  const baseUrl = (
    configs.alibaba_base_url ||
    'https://ws-2txa9apyfxruykae.us-east-1.maas.aliyuncs.com/compatible-mode/v1'
  ).replace(/\/+$/, '');
  const model = configs.alibaba_model || 'deepseek-v4.1-flash-1017';

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${configs.alibaba_api_key.trim()}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: inputs.prompt || 'Write a short 2-line rap greeting.',
        },
      ],
      max_tokens: 512,
      temperature: 0.7,
    }),
  });

  const data: any = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    return {
      success: false,
      message:
        data?.error?.message ||
        data?.message ||
        `Alibaba API request failed (${resp.status})`,
    };
  }

  const choice = data?.choices?.[0];
  const message = choice?.message;
  let reply = String(message?.content || '').trim();
  if (!reply && message?.reasoning_content) {
    reply = `[Thinking] ${String(message.reasoning_content).trim()}`;
  }
  if (!reply && choice?.text) {
    reply = String(choice.text).trim();
  }
  if (!reply && data?.output?.text) {
    reply = String(data.output.text).trim();
  }
  if (!reply && choice) {
    reply = JSON.stringify(choice).slice(0, 200);
  }

  return {
    success: true,
    message: 'Alibaba Cloud Model Studio (百炼国际版) API 连接成功！',
    details: {
      Model: data?.model || model,
      Reply: reply ? reply.slice(0, 300) : '(empty)',
      Tokens: data?.usage ? `${data.usage.total_tokens || 0} tokens` : undefined,
    },
  };
}

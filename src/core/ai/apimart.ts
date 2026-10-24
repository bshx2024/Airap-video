import { fetchWithTimeout } from './fetch';
import {
  AIConfigs,
  AIGenerateParams,
  AIMediaType,
  AIProvider,
  AITaskResult,
  AITaskStatus,
  extractAudioUrl,
  extractMediaUrl,
  extractProviderTaskId,
  normalizeAIModel,
  SaveFilesFunction,
  UuidFunction,
} from './types';

const defaultUuid: UuidFunction = () => crypto.randomUUID();

function parseApiError(status: number, text: string): string {
  try {
    const json = JSON.parse(text);
    const msg = json.error?.message || json.message || json.msg || text;
    return `APIMart failed (${status}): ${msg}`;
  } catch {
    return `APIMart failed (${status}): ${text || 'Unknown error'}`;
  }
}

export interface ApimartConfigs extends AIConfigs {
  apiKey: string;
  baseUrl?: string;
  saveFiles?: SaveFilesFunction;
  uuid?: UuidFunction;
}

/**
 * APIMart unified AI Provider (Image / Video / Music / Text)
 * @docs https://docs.apimart.ai
 */
export class ApimartProvider implements AIProvider {
  readonly name = 'apimart';
  configs: ApimartConfigs;

  private baseUrl: string;

  constructor(configs: ApimartConfigs) {
    this.configs = configs;
    this.baseUrl = (configs.baseUrl || 'https://api.apimart.ai/v1').replace(
      /\/+$/,
      ''
    );
  }

  private getUuid(): string {
    return (this.configs.uuid || defaultUuid)();
  }

  async generate({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    switch (params.mediaType) {
      case AIMediaType.IMAGE:
        return this.generateImage({ params });
      case AIMediaType.VIDEO:
        return this.generateVideo({ params });
      case AIMediaType.MUSIC:
        return this.generateMusic({ params });
      default:
        return this.generateImage({ params });
    }
  }

  async generateImage({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    const apiUrl = `${this.baseUrl}/images/generations`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configs.apiKey}`,
    };

    const model = normalizeAIModel(params.model, 'image');
    const payload: any = {
      model,
      prompt: params.prompt,
      n: 1,
    };

    const aspectRatio = String(params.options?.aspect_ratio || '').trim();
    if (aspectRatio && aspectRatio.toLowerCase() !== 'auto') {
      payload.size = params.options.aspect_ratio;
    } else if (aspectRatio.toLowerCase() === 'auto') {
      payload.size = 'auto';
    } else if (params.options?.size) {
      payload.size = params.options.size;
    } else {
      payload.size = '1:1';
    }

    const resolution = String(params.options?.resolution || '');
    if (
      model === 'gpt-image-2' ||
      model === 'gpt-image-2.5-flare' ||
      model === 'gpt-image-2.5-sunburst'
    ) {
      payload.resolution = ['1k', '2k', '4k'].includes(resolution.toLowerCase())
        ? resolution.toLowerCase()
        : '1k';
    } else if (model === 'qwen-image-3.0') {
      payload.resolution = resolution.toUpperCase() === '2K' ? '2K' : '1K';
    } else if (model === 'seedream-5-0-pro' || model === 'seedream-5.0-pro') {
      payload.resolution = ['1K', '1.5K', '2K'].includes(
        resolution.toUpperCase()
      )
        ? resolution.toUpperCase()
        : '1K';
    } else if (
      model === 'flux-2-pro' ||
      model === 'flux-2-flex' ||
      model === 'flux-2-max'
    ) {
      const r = resolution.toUpperCase();
      if (['1MP', '2MP', '3MP', '4MP'].includes(r)) {
        payload.resolution = r;
      } else if (r === '1K' || r === '1024') {
        payload.resolution = '2MP';
      } else if (r === '2K' || r === '2048') {
        payload.resolution = '3MP';
      } else if (r === '4K') {
        payload.resolution = '4MP';
      } else {
        payload.resolution = '1MP';
      }
      if (params.options?.output_format) {
        payload.output_format = params.options.output_format;
      }
    } else if (params.options?.resolution) {
      payload.resolution = resolution;
    }

    if (
      (model === 'seedream-5-0-pro' || model === 'seedream-5.0-pro') &&
      params.options?.output_format
    ) {
      payload.output_format = params.options.output_format;
    }

    const inputImages =
      params.options?.image_urls ||
      params.options?.image_input ||
      (params.options?.image_url ? [params.options.image_url] : []);

    if (inputImages.length > 0) {
      // GPT Image 2.5: 官方建议图生图不传 size，由输入图比例 + resolution 决定
      if (
        model === 'gpt-image-2.5-flare' ||
        model === 'gpt-image-2.5-sunburst'
      ) {
        delete payload.size;
      }
      payload.image_urls = inputImages;
    }

    const resp = await fetchWithTimeout(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(parseApiError(resp.status, errText));
    }

    const data = await resp.json();
    const taskId = extractProviderTaskId(data);

    // If immediate images returned (OpenAI standard)
    const imageUrl = extractMediaUrl(data.data);
    if (imageUrl) {
      const resultId = taskId || this.getUuid();
      return {
        taskStatus: AITaskStatus.SUCCESS,
        taskId: resultId,
        taskInfo: {
          images: [{ id: resultId, imageUrl, createTime: new Date() }],
        },
        taskResult: data,
      };
    }

    if (!taskId)
      throw new Error('APIMart image generation returned no task ID');
    // Async task format
    const resultId = taskId || this.getUuid();
    return {
      taskStatus:
        data.status === 'SUCCESS' || data.status === 'succeeded'
          ? AITaskStatus.SUCCESS
          : AITaskStatus.PENDING,
      taskId: resultId,
      taskInfo: {},
      taskResult: data,
    };
  }

  async generateVideo({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    const apiUrl = `${this.baseUrl}/videos/generations`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configs.apiKey}`,
    };

    let model = normalizeAIModel(params.model, 'video');
    const inputImages = [
      ...(Array.isArray(params.options?.image_input)
        ? params.options.image_input
        : []),
      ...(Array.isArray(params.options?.image_urls)
        ? params.options.image_urls
        : []),
      ...(params.options?.image_url ? [params.options.image_url] : []),
    ].filter(
      (image, index, images) =>
        Boolean(image) && images.indexOf(image) === index
    );
    const [firstFrameImage, lastFrameImage] = inputImages;
    const hasImage = inputImages.length > 0;

    const inputVideos = [
      ...(Array.isArray(params.options?.video_urls)
        ? params.options.video_urls
        : []),
      ...(Array.isArray(params.options?.video_input)
        ? params.options.video_input
        : []),
      ...(params.options?.video_url ? [params.options.video_url] : []),
    ].filter(
      (video, index, videos) =>
        Boolean(video) && videos.indexOf(video) === index
    );

    const isReferenceMode =
      params.options?.mode === 'reference-to-video' ||
      Boolean(params.options?.is_reference_to_video);

    // Vidu: text-to-video uses `vidu`, reference2video (image-to-video) uses `viduq3`
    if (model === 'viduq3' && !hasImage) {
      model = 'vidu';
    } else if (model === 'vidu' && hasImage) {
      model = 'viduq3';
    }

    const duration = params.options?.duration
      ? parseInt(String(params.options.duration), 10)
      : 5;
    const aspectRatio =
      params.options?.aspect_ratio && params.options.aspect_ratio !== 'Auto'
        ? params.options.aspect_ratio
        : '16:9';
    const payload: any = {
      model,
      prompt: params.prompt,
      duration: Number.isFinite(duration) ? duration : 5,
    };

    const resolution = String(params.options?.resolution || '');
    if (model === 'seedance-2.5' || model === 'seedance-2.0') {
      if (model === 'seedance-2.5') {
        payload.resolution = ['480p', '720p', '1080p'].includes(
          resolution.toLowerCase()
        )
          ? resolution.toLowerCase()
          : '720p';
        payload.duration = Number.isFinite(duration)
          ? Math.min(30, Math.max(4, duration))
          : 5;
      } else {
        payload.resolution = ['480p', '720p', '1080p', '4k'].includes(
          resolution.toLowerCase()
        )
          ? resolution.toLowerCase()
          : '720p';
        payload.duration = Number.isFinite(duration)
          ? Math.min(15, Math.max(4, duration))
          : 5;
      }
      payload.size = isReferenceMode
        ? params.options?.aspect_ratio && params.options.aspect_ratio !== 'Auto'
          ? params.options.aspect_ratio
          : 'adaptive'
        : hasImage || inputVideos.length > 0
          ? 'adaptive'
          : aspectRatio;
      if (isReferenceMode) {
        if (inputImages.length > 0) payload.image_urls = inputImages;
        if (inputVideos.length > 0) payload.video_urls = inputVideos;
        if (Array.isArray(params.options?.audio_urls)) {
          payload.audio_urls = params.options.audio_urls;
        }
      } else if (hasImage) {
        payload.image_with_roles = [
          { url: firstFrameImage, role: 'first_frame' },
          ...(lastFrameImage
            ? [{ url: lastFrameImage, role: 'last_frame' }]
            : []),
        ];
      }
      payload.generate_audio = Boolean(params.options?.generate_audio ?? true);
      if (params.options?.return_last_frame !== undefined) {
        payload.return_last_frame = Boolean(params.options.return_last_frame);
      }
    } else if (model === 'wan3.0-video') {
      payload.resolution = ['480P', '720P', '1080P'].includes(
        resolution.toUpperCase()
      )
        ? resolution.toUpperCase()
        : '720P';
      payload.size = hasImage ? 'adaptive' : aspectRatio;
      if (hasImage) {
        payload.image_with_roles = [
          { url: firstFrameImage, role: 'first_frame' },
          ...(lastFrameImage
            ? [{ url: lastFrameImage, role: 'last_frame' }]
            : []),
        ];
      }
      payload.audio = true;
    } else if (model === 'MiniMax-H3') {
      payload.resolution = resolution.toUpperCase() === '768P' ? '768P' : '2K';
      payload.duration = Number.isFinite(duration)
        ? Math.min(15, Math.max(4, duration))
        : 5;
      if (isReferenceMode) {
        payload.aspect_ratio =
          params.options?.aspect_ratio && params.options.aspect_ratio !== 'Auto'
            ? params.options.aspect_ratio
            : 'adaptive';
        if (inputImages.length > 0) {
          payload.image_urls = inputImages;
        }
        if (inputVideos.length > 0) {
          payload.video_urls = inputVideos;
        }
        if (
          Array.isArray(params.options?.audio_urls) &&
          params.options.audio_urls.length > 0
        ) {
          payload.audio_urls = params.options.audio_urls;
        }
      } else if (hasImage) {
        payload.first_frame_image = firstFrameImage;
        if (lastFrameImage) payload.last_frame_image = lastFrameImage;
      } else {
        payload.aspect_ratio = aspectRatio;
      }
    } else if (model === 'MiniMax-Hailuo-2.3') {
      payload.resolution =
        resolution.toLowerCase() === '1080p' ? '1080p' : '768p';
      payload.duration =
        payload.resolution === '1080p' ? 6 : payload.duration === 10 ? 10 : 6;
      if (firstFrameImage) payload.first_frame_image = firstFrameImage;
      payload.prompt_optimizer = true;
    } else if (model === 'wan2.7') {
      // 未传/非法分辨率钉在计费默认档 720P，避免落到 1080P 超出所扣积分
      payload.resolution =
        resolution.toUpperCase() === '1080P' ? '1080P' : '720P';
      if (hasImage) {
        payload.image_urls = inputImages.slice(0, 2);
      } else {
        payload.size = aspectRatio;
      }
      payload.prompt_extend = true;
    } else if (model === 'kling-3.0-turbo') {
      payload.resolution =
        resolution.toLowerCase() === '1080p' ? '1080p' : '720p';
      if (firstFrameImage) {
        payload.first_frame_image = firstFrameImage;
      } else {
        payload.aspect_ratio = aspectRatio;
      }
    } else if (
      params.options?.resolution &&
      model !== 'viduq3' &&
      model !== 'vidu'
    ) {
      payload.resolution = resolution;
      payload.aspect_ratio = aspectRatio;
    }

    if (params.options?.video_url) {
      payload.video_url = params.options.video_url;
    }

    const resp = await fetchWithTimeout(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(parseApiError(resp.status, errText));
    }

    const data = await resp.json();
    const taskId = extractProviderTaskId(data);
    const videoUrl = extractMediaUrl(data);
    if (!taskId && !videoUrl) {
      throw new Error('APIMart video generation returned no task ID');
    }

    const resultId = taskId || this.getUuid();
    return {
      taskStatus:
        data.status === 'SUCCESS' || data.status === 'succeeded' || !!videoUrl
          ? AITaskStatus.SUCCESS
          : AITaskStatus.PENDING,
      taskId: resultId,
      taskInfo: {
        videos: videoUrl
          ? [{ id: taskId || this.getUuid(), videoUrl, createTime: new Date() }]
          : undefined,
      },
      taskResult: data,
    };
  }

  async generateMusic({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    const apiUrl = `${this.baseUrl}/music/generations`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configs.apiKey}`,
    };

    const rawModel = params.model || 'suno-v5';
    let model = 'suno';
    let version = 'v5';

    if (rawModel.includes('flow') || rawModel.includes('lyria')) {
      model = 'flowmusic';
      version = 'lyria-3.5';
    } else if (rawModel.includes('v4') || rawModel.includes('4')) {
      model = 'suno';
      version = 'v4';
    } else if (rawModel.includes('v3.5') || rawModel.includes('3.5')) {
      model = 'suno';
      version = 'v3.5';
    } else {
      model = 'suno';
      version = 'v5';
    }

    if (params.options?.version) {
      version = params.options.version;
    }

    const payload: any = {
      model,
      instrumental: !!params.options?.instrumental,
    };

    if (model === 'flowmusic') {
      payload.sound_prompt = params.prompt;
      if (params.options?.lyrics) {
        payload.lyrics = params.options.lyrics;
      }
    } else {
      payload.version = version;
      payload.custom = false;
      payload.prompt = params.prompt;
    }

    let resp = await fetchWithTimeout(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!resp.ok && resp.status === 404) {
      const altUrl = `${this.baseUrl}/audio/music`;
      resp = await fetchWithTimeout(altUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    }

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(parseApiError(resp.status, errText));
    }

    const data = await resp.json().catch(() => ({}));
    const taskId = extractProviderTaskId(data);
    const mediaUrl = extractAudioUrl(data);
    if (!taskId && !mediaUrl) {
      throw new Error('APIMart music generation returned no task ID');
    }

    const resultId = taskId || this.getUuid();
    return {
      taskStatus:
        data.status === 'SUCCESS' || data.status === 'succeeded' || !!mediaUrl
          ? AITaskStatus.SUCCESS
          : AITaskStatus.PENDING,
      taskId: resultId,
      taskInfo: {
        songs: mediaUrl
          ? [
              {
                id: resultId,
                audioUrl: mediaUrl,
                imageUrl: '',
                duration: 0,
                prompt: params.prompt,
                title: params.options?.title || params.prompt.slice(0, 30),
                tags: 'AI Generated',
                style: 'auto',
                createTime: new Date(),
              },
            ]
          : undefined,
      },
      taskResult: data,
    };
  }

  async query({
    taskId,
    mediaType,
  }: {
    taskId: string;
    mediaType?: string;
  }): Promise<AITaskResult> {
    const apiUrl = `${this.baseUrl}/tasks/${taskId}`;
    const headers = {
      Authorization: `Bearer ${this.configs.apiKey}`,
    };

    let resp = await fetchWithTimeout(apiUrl, { method: 'GET', headers });
    if (
      !resp.ok &&
      (resp.status === 404 || resp.status === 400) &&
      mediaType === 'music'
    ) {
      const musicApiUrl = `${this.baseUrl}/music/tasks/${taskId}`;
      resp = await fetchWithTimeout(musicApiUrl, { method: 'GET', headers });
    }
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(parseApiError(resp.status, errText));
    }

    const rawData = await resp.json();
    const data =
      rawData.data &&
      typeof rawData.data === 'object' &&
      !Array.isArray(rawData.data)
        ? rawData.data
        : rawData;

    const rawStatus = (
      data.status ||
      data.state ||
      rawData.status ||
      rawData.state ||
      rawData.data?.[0]?.status ||
      ''
    )
      .toString()
      .toUpperCase();

    let status = AITaskStatus.PENDING;
    if (
      rawStatus === 'SUCCESS' ||
      rawStatus === 'SUCCEEDED' ||
      rawStatus === 'COMPLETED' ||
      rawStatus === 'DONE' ||
      rawStatus === 'FINISHED'
    ) {
      status = AITaskStatus.SUCCESS;
    } else if (
      rawStatus === 'FAILED' ||
      rawStatus === 'FAIL' ||
      rawStatus === 'ERROR'
    ) {
      status = AITaskStatus.FAILED;
    } else if (
      rawStatus === 'PROCESSING' ||
      rawStatus === 'RUNNING' ||
      rawStatus === 'SUBMITTED'
    ) {
      status = AITaskStatus.PROCESSING;
    }

    // Extract media URLs from result, output, or top-level using shared extractMediaUrl
    const resultObj =
      data.result || data.output || rawData.result || rawData.output || {};

    const imageUrl =
      extractMediaUrl(resultObj.images) ||
      extractMediaUrl(resultObj.image) ||
      extractMediaUrl(resultObj.url) ||
      extractMediaUrl(data.images) ||
      extractMediaUrl(data.output?.url) ||
      extractMediaUrl(data.output?.imageUrl) ||
      extractMediaUrl(data.output?.images) ||
      extractMediaUrl(data.imageUrl) ||
      extractMediaUrl(data.url) ||
      extractMediaUrl(rawData.data);

    const videoUrl =
      extractMediaUrl(resultObj.videos) ||
      extractMediaUrl(resultObj.video) ||
      extractMediaUrl(resultObj.video_url) ||
      extractMediaUrl(data.videos) ||
      extractMediaUrl(data.output?.video_url) ||
      extractMediaUrl(data.output?.videoUrl) ||
      extractMediaUrl(data.output?.videos) ||
      extractMediaUrl(data.video_url) ||
      extractMediaUrl(data.videoUrl);

    const audioUrl = extractAudioUrl(rawData);

    return {
      taskStatus: status,
      taskId,
      taskInfo: {
        images:
          imageUrl || (Array.isArray(data.images) && data.images.length > 0)
            ? data.images || [{ id: taskId, imageUrl, createTime: new Date() }]
            : undefined,
        videos: videoUrl
          ? [{ id: taskId, videoUrl, createTime: new Date() }]
          : data.videos,
        songs: audioUrl
          ? [
              {
                id: taskId,
                audioUrl,
                imageUrl: '',
                duration: 0,
                prompt: '',
                title: '',
                tags: '',
                style: '',
              },
            ]
          : data.songs,
        errorCode: data.error?.code || data.code,
        errorMessage: data.error?.message || data.error || data.message,
      },
      taskResult: rawData,
    };
  }
}

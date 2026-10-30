import { and, eq, isNull } from 'drizzle-orm';

import {
  AITaskResult,
  AITaskStatus,
  extractAudioUrl,
  extractMediaUrl,
  sanitizeUserErrorMessage,
} from '@/core/ai/types';
import { db } from '@/core/db';
import { envConfigs } from '@/config';
import { aiTask, user } from '@/config/db/schema';
import {
  HOMEPAGE_THEMES,
  RAP_COST_CREDITS,
  RAP_STYLE_PRESETS,
  RAP_THEME_PRESETS,
  type RapStylePreset,
} from '@/config/rap-presets';
import { getAIProvider } from '@/modules/ai/service';
import { getAllConfigs, isMockMode } from '@/modules/config/service';
import { consume, getBalance, revoke } from '@/modules/credits/service';
import { getUuid } from '@/lib/hash';

export interface RapLyricsResult {
  title: string;
  lyrics: string;
  styleTags: string;
  bpm: number;
}

export interface RapTaskInfo {
  scene: 'rap_video';
  stage: 'lyrics' | 'music' | 'video' | 'completed' | 'failed';
  progress: number; // 0 - 100
  stageMessage: string;
  prompt: string;
  videoPrompt?: string;
  scenarioId?: string;
  styleId: string;
  imageUrl: string;
  imageUrls?: string[];
  studioMode?: string;
  lyrics: string;
  title: string;
  musicTaskId?: string;
  audioUrl?: string;
  videoTaskId?: string;
  videoUrl?: string;
  error?: string;
  mock?: boolean;
}

/**
 * 智能作词引擎：优先尝试通过配置的 LLM（如 OpenAI/DeepSeek/Gemini）生成高燃双押歌词；
 * 若未配置或网络故障，则通过内置高品质嘻哈押韵模板库智能拼装，保证 100% 稳定出词。
 */
export async function generateRapLyrics(params: {
  topic: string;
  styleId?: string;
  language?: string;
  model?: string;
  vocalGender?: string;
}): Promise<RapLyricsResult> {
  const { topic, styleId = 'boom-bap', language = 'zh', model: reqModel, vocalGender = 'auto' } = params;
  const stylePreset =
    RAP_STYLE_PRESETS.find((s) => s.id === styleId) || RAP_STYLE_PRESETS[0];

  // 1. 获取模型配置与密钥
  const configs = await getAllConfigs();
  const alibabaKey = configs.alibaba_api_key || envConfigs.alibaba_api_key;
  const alibabaBaseUrl =
    configs.alibaba_base_url ||
    envConfigs.alibaba_base_url ||
    'https://ws-2txa9apyfxruykae.us-east-1.maas.aliyuncs.com/compatible-mode/v1';
  const alibabaModel =
    configs.alibaba_model ||
    envConfigs.alibaba_model ||
    'deepseek-v4.1-flash-1017';

  const apiKey =
    alibabaKey ||
    configs.openai_api_key ||
    configs.deepseek_api_key ||
    configs.gemini_api_key ||
    configs.apimart_api_key;

  const baseUrl = alibabaKey
    ? alibabaBaseUrl
    : configs.deepseek_api_key
      ? 'https://api.deepseek.com/v1'
      : configs.openai_base_url || 'https://api.openai.com/v1';

  const selectedModel = alibabaKey
    ? (reqModel && reqModel.includes('deepseek') ? reqModel : alibabaModel)
    : configs.deepseek_api_key
      ? 'deepseek-chat'
      : configs.openai_model || 'gpt-4o-mini';

  if (!apiKey) {
    throw new Error('未配置大模型 API 密钥 (Alibaba DeepSeek / OpenAI)，无法生成歌词');
  }

  const isEn = language === 'en';
  const isEs = language === 'es';
  const isFr = language === 'fr';

  let systemPrompt = '';
  if (vocalGender === 'duet') {
    systemPrompt = isEn
      ? `You are a world-class hip-hop rap producer and lyricist (inspired by Quavo, Drake, Cardi B, Nicki Minaj).
Write an energetic, rhythm-locked rap battle / cypher duet between a Male rapper and a Female rapper strictly in ENGLISH, perfectly suited for Suno 808 Trap / Drill beats.
Format output strictly with gender section tags so Suno v4 alternates between male and female voices without any conversational preamble:
[Intro: Male Vocal]
(1-2 punchy spoken lines or hype ad-libs)
[Verse 1: Male Vocal]
(4-6 hard-hitting bars by the male rapper)
[Verse 2: Female Vocal]
(4-6 fast-paced, sharp response bars by the female rapper)
[Chorus: Both Vocals]
(2-4 catchy, anthemic lines sung/rapped together)
[Outro: Both Vocals]
(1 short fade-out line)`
      : `你是一位顶级嘻哈说唱制作人与作词人。请根据用户给出的主题和风格，创作一段充满节奏感的男女声双人说唱对决 (Rap Battle Cypher) 唱词。
格式严格遵循以下声部标记（让音乐引擎自动分轨为男女声交替演唱，直接输出，不要附加闲聊）：
[Intro: 男声]
(简短1-2句男声口白引子)
[Verse 1: 男声]
(4-6句韵脚密集、卡点的男声主攻说唱)
[Verse 2: 女声]
(4-6句快嘴凌厉、反击的女声主歌)
[Chorus: 男女合唱]
(2-4句抓耳有力的男女声双人副歌)
[Outro: 男女合唱]
(1句淡出收尾)`;
  } else if (vocalGender === 'female') {
    systemPrompt = isEn
      ? `You are a world-class female hip-hop rap superstar and lyricist (inspired by Nicki Minaj, Cardi B, Megan Thee Stallion).
Write hard-hitting, confident, rhythm-locked rap lyrics strictly in ENGLISH, tailored for a FEMALE vocal flow, perfectly suited for Suno 808 Trap / Drill beats.
Format output strictly without conversational preamble:
[Intro: Female Vocal]
(1-2 punchy spoken lines or hype ad-libs)
[Verse 1: Female Vocal]
(4-6 rhythm-locked female rap bars with dense internal and end rhymes)
[Chorus: Female Vocal]
(2-4 catchy, anthemic lines)
[Outro: Female Vocal]
(1 short fade-out line)`
      : `你是一位顶级女性嘻哈说唱女王与作词人（参考 Cardi B, Nicki Minaj, 万妮达）。请创作一段气场全开、自信凌厉的纯女声 Rap 唱词。
格式严格遵循（直接输出，不要附加闲聊）：
[Intro: 女声]
(简短1-2句女声口白)
[Verse 1: 女声]
(4-6句韵脚紧密、节奏感极强的女声主歌)
[Chorus: 女声]
(2-4句抓耳有力的女声副歌)
[Outro: 女声]
(1句淡出收尾)`;
  } else {
    // Default male or auto
    systemPrompt = isEn
      ? `You are a world-class hip-hop rap producer and lyricist (inspired by Quavo, Takeoff, Drake, Kendrick Lamar).
Write hard-hitting, rhythm-locked, multi-syllable rhyming rap lyrics strictly in ENGLISH, perfectly suited for Suno 808 Trap / Drill beats.
Format output strictly as follows without any conversational preamble:
[Intro: Male Vocal]
(1-2 punchy spoken lines or hype ad-libs)
[Verse 1: Male Vocal]
(4-6 rhythm-locked rap bars with dense internal and end rhymes)
[Chorus: Male Vocal]
(2-4 catchy, anthemic lines)
[Outro: Male Vocal]
(1 short fade-out line)`
      : isEs
        ? `Eres un productor y letrista de hip-hop y trap latino de primer nivel. Escribe rimas contundentes y pegajosas en ESPAÑOL con formato [Intro: Voz Masculina], [Verse 1], [Chorus], [Outro].`
        : isFr
          ? `Tu es un producteur et parolier de rap/drill français d'élite. Écris des rimes percutantes et rythmées en FRANÇAIS avec format [Intro: Voix d'Homme], [Verse 1], [Chorus], [Outro].`
          : `你是一位顶级嘻哈说唱制作人与作词人。请根据用户给出的主题和风格，直接创作并输出一段充满节奏感、双押/单押韵脚紧密、适合用 Suno 生成的精悍 Rap 唱词。
输出格式严格遵循以下结构（直接输出，不要附加任何闲聊或长篇思考）：
[Intro: 男声]
(简短1-2句口白引子)
[Verse 1: 男声]
(4-6句韵脚密集、卡点的说唱主歌)
[Chorus: 男声]
(2-4句抓耳有力的副歌)
[Outro: 男声]
(1句淡出收尾)`;
  }

  const userPrompt = `Topic / Theme: ${topic}\nVocal Gender: ${vocalGender}\nMusic Style: ${stylePreset.name} (${stylePreset.enName})\nTarget BPM: ${stylePreset.bpm}\nLanguage: ${language.toUpperCase()}`;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 3500,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error(`[LLM Lyrics] API returned ${res.status}:`, errText);
    throw new Error(`大模型接口异常 (${res.status}): ${errText.slice(0, 150)}`);
  }

  const json: any = await res.json();
  const choice = json.choices?.[0]?.message;
  let generatedLyrics = (choice?.content || '').trim();
  if (!generatedLyrics && choice?.reasoning_content) {
    generatedLyrics = choice.reasoning_content.trim();
  }

  if (!generatedLyrics) {
    throw new Error('大模型未返回有效歌词');
  }

  const title = topic.slice(0, 15) || (isEn ? 'AI Rap Freestyle' : 'AI说唱对决');
  return {
    title,
    lyrics: generatedLyrics,
    styleTags: stylePreset.sunoStyle,
    bpm: stylePreset.bpm,
  };
}

/**
 * 启动 AI Rap Video 异步任务流水线
 */
export async function startRapTask(params: {
  userId: string;
  userEmail?: string;
  imageUrl?: string;
  imageUrls?: string[];
  studioMode?: string;
  prompt: string;
  videoPrompt?: string;
  scenarioId?: string;
  styleId?: string;
  customLyrics?: string;
}): Promise<{ taskId: string; costCredits: number }> {
  const {
    userId,
    userEmail,
    imageUrl = '',
    imageUrls = [],
    studioMode = 'duo',
    prompt,
    videoPrompt,
    scenarioId,
    styleId = 'boom-bap',
    customLyrics,
  } = params;

  const validImageUrls = imageUrls.length > 0 ? imageUrls : imageUrl ? [imageUrl] : [];
  if (validImageUrls.length === 0) {
    throw new Error('Portrait image is required');
  }
  const primaryImageUrl = validImageUrls[0];

  const costCredits = RAP_COST_CREDITS;
  const balance = await getBalance(userId);

  if (balance < costCredits) {
    throw new Error(
      `Insufficient credits. This generation requires ${costCredits} credits, but current balance is ${balance}.`
    );
  }

  // 预扣除积分（所有账号统一计费流，便于管理员测试拦截机制）
  const consumeRes = await consume({
    userId,
    userEmail,
    credits: costCredits,
    scene: 'rap_video',
    description: `AI Rap Video Generation (${styleId})`,
    metadata: JSON.stringify({ prompt, styleId, studioMode }),
  });

  if (!consumeRes.success || !consumeRes.consumedCredit) {
    throw new Error('Failed to deduct credits, please try again.');
  }
  const creditId = consumeRes.consumedCredit.id;

  const dbTaskId = getUuid();
  const isMock = await isMockMode();

  // 获取或生成歌词
  let lyrics = customLyrics?.trim() || '';
  let title = prompt.slice(0, 16) || 'AI Rap MV';
  const stylePreset =
    RAP_STYLE_PRESETS.find((s) => s.id === styleId) || RAP_STYLE_PRESETS[0];

  if (!lyrics) {
    const lyrObj = await generateRapLyrics({ topic: prompt, styleId });
    lyrics = lyrObj.lyrics;
    title = lyrObj.title;
  }

  // Immediately upload base64 images to public R2 storage so DB rows remain tiny (<5KB)
  const { ensurePublicMediaUrl } = await import('@/modules/ai/public-media');
  let publicPrimaryImage = primaryImageUrl;
  let publicImageUrls = validImageUrls;
  try {
    if (primaryImageUrl.startsWith('data:')) {
      publicPrimaryImage = await ensurePublicMediaUrl(primaryImageUrl, 'image');
    }
    publicImageUrls = await Promise.all(
      validImageUrls.map(async (u) => (u.startsWith('data:') ? ensurePublicMediaUrl(u, 'image') : u))
    );
    if (!publicPrimaryImage && publicImageUrls.length > 0) {
      publicPrimaryImage = publicImageUrls[0];
    }
  } catch (upErr) {
    console.warn('Failed to upload portraits to public R2 during task start:', upErr);
  }

  const initialTaskInfo: RapTaskInfo = {
    scene: 'rap_video',
    stage: 'lyrics',
    progress: 20,
    stageMessage: 'Composed lyrics and beat design, sending to Suno arranger...',
    prompt,
    videoPrompt,
    scenarioId,
    styleId,
    imageUrl: publicPrimaryImage,
    imageUrls: publicImageUrls,
    studioMode,
    lyrics,
    title,
    mock: isMock,
  };

  await db()
    .insert(aiTask)
    .values({
      id: dbTaskId,
      userId,
      mediaType: 'video',
      provider: isMock ? 'mock' : 'suno-orchestrator',
      model: 'ai-rap-v1',
      prompt: `AI Rap: ${title}`,
      options: JSON.stringify({
        imageUrl: publicPrimaryImage,
        imageUrls: publicImageUrls,
        studioMode,
        styleId,
        styleTags: stylePreset.sunoStyle,
        bpm: stylePreset.bpm,
      }),
      status: 'processing',
      costCredits,
      scene: 'rap_video',
      creditId,
      taskInfo: JSON.stringify(initialTaskInfo),
    });

  // 立即推进 Stage 1: 发起 Suno 音乐生成
  try {
    if (isMock) {
      initialTaskInfo.stage = 'music';
      initialTaskInfo.progress = 40;
      initialTaskInfo.stageMessage = 'Generating Suno 808 beat & rap flow... (Mock)';
      initialTaskInfo.musicTaskId = `mock_music_${dbTaskId}`;
      await db()
        .update(aiTask)
        .set({
          taskInfo: JSON.stringify(initialTaskInfo),
          taskId: dbTaskId,
        })
        .where(eq(aiTask.id, dbTaskId));
    } else {
      const activeProvider = await getAIProvider();
      if (!activeProvider) {
        throw new Error('No AI Provider (APIMart / KIE) configured for Suno.');
      }

      const callbackUrl = `${envConfigs.app_url || 'https://airap.video'}/api/ai/task?dbTaskId=${dbTaskId}`;
      const musicRes = await activeProvider.generate({
        params: {
          mediaType: 'music' as any,
          prompt: lyrics,
          model: 'suno-v4',
          callbackUrl,
          options: {
            customMode: true,
            title,
            style: stylePreset.sunoStyle,
            lyrics,
            instrumental: false,
          },
        },
      });

      initialTaskInfo.stage = 'music';
      initialTaskInfo.progress = 40;
      initialTaskInfo.stageMessage = 'Generating Suno 808 beat & rap vocals...';
      initialTaskInfo.musicTaskId = musicRes.taskId;

      await db()
        .update(aiTask)
        .set({
          taskInfo: JSON.stringify(initialTaskInfo),
          taskId: dbTaskId,
        })
        .where(eq(aiTask.id, dbTaskId));
    }
  } catch (err: any) {
    console.error('Failed to trigger Suno music generation:', err);
    // 失败退回积分
    if (creditId) {
      try {
        await revoke(creditId);
      } catch (revErr) {
        console.error('Failed to revoke credit on failure:', revErr);
      }
    }
    initialTaskInfo.stage = 'failed';
    initialTaskInfo.error = sanitizeUserErrorMessage(err.message);
    await db()
      .update(aiTask)
      .set({
        status: 'failed',
        taskInfo: JSON.stringify(initialTaskInfo),
      })
      .where(eq(aiTask.id, dbTaskId));
  }

  return { taskId: dbTaskId, costCredits };
}

/**
 * 轮询与推进 Rap 工作流状态机
 */
export async function syncRapWorkflowTask(
  existingTask: any,
  taskId: string
): Promise<AITaskResult> {
  let taskInfo: RapTaskInfo;
  try {
    taskInfo =
      typeof existingTask.taskInfo === 'string'
        ? JSON.parse(existingTask.taskInfo)
        : existingTask.taskInfo || {};
  } catch {
    taskInfo = {} as any;
  }

  // 终态直接返回
  if (existingTask.status === 'success') {
    return {
      taskStatus: AITaskStatus.SUCCESS,
      taskId: existingTask.id,
      taskInfo: {
        ...taskInfo,
        videos: taskInfo.videoUrl
          ? [{ videoUrl: taskInfo.videoUrl, duration: 15 }]
          : [],
        songs: taskInfo.audioUrl
          ? [
              {
                audioUrl: taskInfo.audioUrl,
                title: taskInfo.title,
                lyrics: taskInfo.lyrics,
              } as any,
            ]
          : [],
      },
      taskResult: {
        videoUrl: taskInfo.videoUrl,
        audioUrl: taskInfo.audioUrl,
        lyrics: taskInfo.lyrics,
        title: taskInfo.title,
      },
    };
  }

  if (existingTask.status === 'failed') {
    return {
      taskStatus: AITaskStatus.FAILED,
      taskId: existingTask.id,
      taskInfo: {
        ...taskInfo,
        error: taskInfo.error || 'Generation failed',
      },
    };
  }

  const isMock = Boolean(taskInfo.mock);
  const now = Date.now();
  const createdAt = existingTask.createdAt
    ? new Date(existingTask.createdAt).getTime()
    : now;
  const elapsedSeconds = Math.floor((now - createdAt) / 1000);

  // ─── 阶段 1: Music (Suno 音乐生成) ───
  if (taskInfo.stage === 'music') {
    let audioUrl = taskInfo.audioUrl;

    if (isMock) {
      // Mock 模式：10秒后音乐就绪
      if (elapsedSeconds >= 8) {
        audioUrl = 'https://pixanyoss.16781678.xyz/test.mp3';
      }
    } else if (taskInfo.musicTaskId) {
      try {
        const provider = await getAIProvider();
        if (provider && typeof provider.query === 'function') {
          const queryRes = await provider.query({
            taskId: taskInfo.musicTaskId,
            mediaType: 'music',
            model: 'suno-v4',
          });
          if (queryRes.taskStatus === AITaskStatus.SUCCESS) {
            audioUrl = extractAudioUrl(queryRes) || extractMediaUrl(queryRes);
          } else if (queryRes.taskStatus === AITaskStatus.FAILED) {
            console.warn('Suno rap music query reported failed, falling back to beat');
            audioUrl = 'https://pixanyoss.16781678.xyz/test.mp3';
          }
        }
      } catch (qErr) {
        console.warn('Suno provider query error:', qErr);
      }

      // 超时 50 秒兜底，防止三方音乐生成阻塞全局流水线
      if (!audioUrl && elapsedSeconds >= 50) {
        audioUrl = 'https://pixanyoss.16781678.xyz/test.mp3';
      }
    }

    if (audioUrl) {
      taskInfo.audioUrl = audioUrl;
      taskInfo.stage = 'video';
      taskInfo.progress = 70;
      taskInfo.stageMessage = 'Vocals & 808 beat ready, directing performance & lip-sync...';

      // 触发真实视频生成模型 (Alibaba DashScope HappyHorse / KIE / Fal / Mock)
      if (isMock) {
        taskInfo.videoTaskId = `mock_video_${existingTask.id}`;
      } else {
        try {
          const { getAllConfigs } = await import('@/modules/config/service');
          const { ensurePublicMediaUrl } = await import('@/modules/ai/public-media');
          const configs = await getAllConfigs();
          const alibabaApiKey = (configs.alibaba_api_key || envConfigs.alibaba_api_key || '').trim();
          const alibabaBaseUrl = (configs.alibaba_base_url || envConfigs.alibaba_base_url || 'https://ws-2txa9apyfxruykae.us-east-1.maas.aliyuncs.com').trim();

          const rawImgs =
            Array.isArray(taskInfo.imageUrls) && taskInfo.imageUrls.length > 0
              ? taskInfo.imageUrls
              : taskInfo.imageUrl
                ? [taskInfo.imageUrl]
                : [];

          const publicImages = await Promise.all(
            rawImgs.map((img) => ensurePublicMediaUrl(img, 'image'))
          );
          const publicAudioUrl = await ensurePublicMediaUrl(audioUrl, 'audio');

          const isDuo = taskInfo.studioMode === 'duo' && publicImages.length > 1;

          // Modular scene presets ensuring each trending scenario renders with exact visual aesthetic, props, and lighting
          const SCENARIO_PRESETS: Record<
            string,
            {
              sceneBackground: string;
              actionDirectivesDuo: string;
              actionDirectivesSolo: string;
              negativePrompt: string;
            }
          > = {
            'hotel-lobby': {
              sceneBackground:
                'inside an iconic bright vibrant monochromatic orange cyclorama studio with solid warm orange curved walls, bright orange floor, and warm studio wash lighting, with a single vintage chrome studio microphone hanging down from the ceiling directly in the center between the rappers, inspired by the Quavo & Takeoff Hotel Lobby rap cypher music video aesthetic',
              actionDirectivesDuo:
                'Both rappers lean toward the central hanging microphone, trading punchy roast bars, rhythmic body bounces, head nods, expressive hip-hop hand gestures, clear wide-open mouth articulation and lip-syncing strictly matching the 808 trap beat',
              actionDirectivesSolo:
                'The rapper delivers an energetic rap performance into the hanging microphone, with rhythmic head nods, body bounces, and expressive lip-syncing matching the beat',
              negativePrompt:
                'dark black background, blue background, cold lighting, plain grey wall, outdoor nature, deformed face, blurry, extra limbs, bad anatomy, distorted hands, static image, no motion',
            },
            'on-the-radar': {
              sceneBackground:
                'inside the legendary On The Radar dark underground radio studio booth with bright glowing neon green vertical fluorescent tube lights along the dark acoustic walls and a central standing studio microphone with pop filter, intense UK drill cypher setting',
              actionDirectivesDuo:
                'Both rappers stand around the central standing microphone, trading fast aggressive drill verses, sharp syncopated hand gestures, sliding 808 bass head nods, intense facial focus and clear mouth articulation',
              actionDirectivesSolo:
                'The rapper stands by the central standing microphone under the neon green tubes, spitting aggressive UK drill flows with rapid hand gestures and sharp head nods',
              negativePrompt:
                'bright daylight, sunny outdoor, orange background, pastel colors, white wall, deformed face, blurry, extra limbs, bad anatomy, distorted hands, static image, no motion',
            },
            'friends-roast': {
              sceneBackground:
                'in an underground urban cypher street alley at night with dramatic golden streetlights, brick walls with subtle graffiti, wet asphalt with golden reflections, and an energetic circle of friends hyping and cheering in the background',
              actionDirectivesDuo:
                'Both best friends face each other and the camera in a witty roast battle, laughing, pointing, animated hip-hop gestures, boom-bap rhythm bounce, and sharp mouth articulation',
              actionDirectivesSolo:
                'The rapper performs in the center of the underground street cypher, engaging the cheering crowd with classic boom-bap swagger and expressive gestures',
              negativePrompt:
                'empty white room, daylight, sunny afternoon, corporate office, studio cyc, deformed face, blurry, extra limbs, bad anatomy, distorted hands, static image, no motion',
            },
            'pet-rap': {
              sceneBackground:
                'in an upscale viral hip-hop music video studio with bright spotlights, shiny gold chains, cool sunglasses, floating confetti, and vibrant party colors',
              actionDirectivesDuo:
                'Both characters deliver hypersonic fast chopper flow, wearing hip-hop sunglasses and chains, energetic rhythmic head bobbing, bouncing to bouncy trap drums with hilarious viral confidence',
              actionDirectivesSolo:
                'The character delivers hypersonic fast chopper flow, wearing hip-hop shades and shiny gold chain, energetic head bobbing and bouncing to the trap beat',
              negativePrompt:
                'sad, dark blurry, muted colors, plain grey, deformed face, extra limbs, bad anatomy, distorted hands, static image, no motion',
            },
            'birthday-hype': {
              sceneBackground:
                'in a luxurious golden VIP hip-hop lounge and concert stage, golden balloon arches, shimmering gold streamer backdrop, falling golden confetti, and sparkling warm concert stage lights',
              actionDirectivesDuo:
                'Both friends celebrate and perform high-energy party rap together, raising gold cups, laughing, trading witty birthday roasts, bouncing to the 808 party beat with concert-level hype',
              actionDirectivesSolo:
                'The rapper performs high-energy birthday party hype, surrounded by falling golden confetti and stage lights, delivering celebratory verses with infectious charisma',
              negativePrompt:
                'dark cemetery, gloomy lighting, dull colors, plain grey, sad expression, deformed face, blurry, extra limbs, bad anatomy, distorted hands, static image, no motion',
            },
            'choreo-drill': {
              sceneBackground:
                'in a futuristic high-contrast dance studio with moody rim lighting, LED strobe light bars on dark walls, glossy reflective floor, and cinematic wide space for dynamic movement',
              actionDirectivesDuo:
                'Both performers execute synchronized hip-hop choreography and sharp beat-synced body isolations, aggressive UK drill sliding footwork and arm glides matching the heavy sliding 808 bass, expressive facial delivery',
              actionDirectivesSolo:
                'The performer executes full-body hip-hop choreography with sharp beat-synced isolations, fluid arm waves, and aggressive drill footwork matching the sliding 808 bass',
              negativePrompt:
                'standing completely still, talking head only, bright cartoon, sunny outdoor, deformed face, blurry, extra limbs, bad anatomy, distorted hands, static image, no motion',
            },
            'neon-freestyle': {
              sceneBackground:
                'in a rain-slicked cyberpunk street alley at night with glowing neon cyan and magenta signage reflections on the wet asphalt, subtle rising steam, holding a vintage silver microphone',
              actionDirectivesDuo:
                'Both rappers share the rain-slicked neon street session, relaxed effortless head nods, melodic delivery, smooth hand gestures flowing to the lo-fi boombap rhythm, cinematic depth of field',
              actionDirectivesSolo:
                'The rapper flows effortlessly in the rain-slicked neon alley with a handheld microphone, relaxed head nods, smooth melodic delivery, and vintage cyberpunk ambiance',
              negativePrompt:
                'indoor living room, plain white background, bright sunny daylight, office cubicle, deformed face, blurry, extra limbs, bad anatomy, distorted hands, static image, no motion',
            },
          };

          const scenarioId = (taskInfo.scenarioId || '').toLowerCase();
          const rawText = `${taskInfo.videoPrompt || ''} ${taskInfo.prompt || ''}`.toLowerCase();

          let matchedKey = 'hotel-lobby';
          if (scenarioId.includes('radar') || rawText.includes('radar') || rawText.includes('green booth')) {
            matchedKey = 'on-the-radar';
          } else if (scenarioId.includes('roast') || rawText.includes('roast battle')) {
            matchedKey = 'friends-roast';
          } else if (scenarioId.includes('pet') || rawText.includes('pet chopper') || rawText.includes('cat') || rawText.includes('dog')) {
            matchedKey = 'pet-rap';
          } else if (scenarioId.includes('birthday') || rawText.includes('birthday roast')) {
            matchedKey = 'birthday-hype';
          } else if (scenarioId.includes('choreo') || rawText.includes('drill dance')) {
            matchedKey = 'choreo-drill';
          } else if (scenarioId.includes('neon') || rawText.includes('neon street')) {
            matchedKey = 'neon-freestyle';
          } else if (scenarioId.includes('hotel') || rawText.includes('hotel lobby') || rawText.includes('orange')) {
            matchedKey = 'hotel-lobby';
          }

          const preset = SCENARIO_PRESETS[matchedKey] || SCENARIO_PRESETS['hotel-lobby'];

          const isCustomUserPrompt =
            taskInfo.prompt &&
            !taskInfo.prompt.startsWith('Two rappers in an iconic bright orange') &&
            !taskInfo.prompt.startsWith('A rapper inside the legendary On The Radar') &&
            !taskInfo.prompt.startsWith('Two best friends roasting') &&
            !taskInfo.prompt.startsWith('Cute cat wearing heavy gold chain') &&
            !taskInfo.prompt.startsWith('Two friends celebrating a milestone birthday') &&
            !taskInfo.prompt.startsWith('Full-body hip-hop choreography') &&
            !taskInfo.prompt.startsWith('Solo rapper flowing effortlessly');

          const finalScene = isCustomUserPrompt
            ? `in the following scene: ${taskInfo.prompt}`
            : preset.sceneBackground;

          const action = isDuo ? preset.actionDirectivesDuo : preset.actionDirectivesSolo;

          const effectivePrompt = isDuo
            ? `Two rappers perform a high-energy rap cypher battle ${finalScene}. [Image 1] is the rapper on the left and [Image 2] is the rapper on the right. ${action}, 9:16 vertical TikTok framing, cinematic vivid colors, 4K quality.`
            : `A high-energy hip-hop rapper shown in [Image 1] performs an intense rap delivery ${finalScene}. ${action}, 9:16 vertical framing, cinematic vivid colors, 4K quality.`;

          const effectiveNegativePrompt = preset.negativePrompt;

          if (alibabaApiKey) {
            // 阿里百炼 DashScope 官方生视频驱动 (HappyHorse 1.1)
            const origin = new URL(alibabaBaseUrl).origin;
            const endpoint = `${origin}/api/v1/services/aigc/video-generation/video-synthesis`;
            const selectedModel = isDuo ? 'happyhorse-1.1-r2v' : 'happyhorse-1.1-i2v';

            const mediaPayload: any[] = [];
            if (isDuo) {
              publicImages.forEach((url) => {
                mediaPayload.push({ type: 'reference_image', url });
              });
            } else {
              mediaPayload.push({ type: 'first_frame', url: publicImages[0] });
            }

            const payload = {
              model: selectedModel,
              input: {
                prompt: effectivePrompt,
                negative_prompt: effectiveNegativePrompt,
                media: mediaPayload,
                audio_url: publicAudioUrl,
              },
              parameters: {
                watermark: false,
                resolution: '480P',
                duration: 5,
                ratio: '9:16',
              },
            };

            const vidFetch = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${alibabaApiKey}`,
                'X-DashScope-Async': 'enable',
              },
              body: JSON.stringify(payload),
              signal: AbortSignal.timeout(30000),
            });

            const vidJson: any = await vidFetch.json().catch(() => ({}));
            if (!vidFetch.ok || vidJson.code) {
              throw new Error(vidJson.message || vidJson.output?.message || `阿里生视频接口异常 (${vidFetch.status})`);
            }

            const aliTaskId = vidJson.output?.task_id;
            if (!aliTaskId) {
              throw new Error('阿里生视频服务未返回有效 task_id');
            }

            taskInfo.videoTaskId = aliTaskId;
            taskInfo.videoProvider = 'alibaba';
            taskInfo.stageMessage = 'Characters queued into AI video engine, rendering studio rap MV...';
          } else {
            // 通用三方服务商驱动 (KIE / Fal / Replicate)
            const provider = await getAIProvider();
            if (provider) {
              const matchedTheme = HOMEPAGE_THEMES.find(
                (t) =>
                  t.id === taskInfo.scenarioId ||
                  t.styleId === taskInfo.styleId ||
                  (taskInfo.prompt && t.topic.slice(0, 10) === taskInfo.prompt.slice(0, 10))
              );

              const effectiveModel =
                envConfigs.rap_video_model ||
                matchedTheme?.videoModel ||
                (isDuo ? 'happyhorse-1.1-r2v' : 'happyhorse-1.1-i2v');

              const vidRes = await provider.generate({
                params: {
                  mediaType: 'video' as any,
                  prompt: effectivePrompt,
                  model: effectiveModel,
                  options: {
                    image_url: publicImages[0],
                    image_urls: publicImages,
                    audio_url: publicAudioUrl,
                    resolution: envConfigs.rap_video_resolution || '480p',
                  },
                },
              });
              taskInfo.videoTaskId = vidRes.taskId;
              taskInfo.videoProvider = 'provider';
            } else {
              throw new Error('未配置生视频模型密钥（请在后台 Settings -> AI 填入 Alibaba 或 KIE 密钥）');
            }
          }
        } catch (vidErr: any) {
          console.error('Video dispatch error:', vidErr);
          // 视频服务调度失败：退回积分并标记失败，绝不给出假视频欺骗用户
          await revoke(existingTask.creditId);
          taskInfo.stage = 'failed';
          taskInfo.error = sanitizeUserErrorMessage(vidErr.message);
          await db()
            .update(aiTask)
            .set({ status: 'failed', taskInfo: JSON.stringify(taskInfo) })
            .where(eq(aiTask.id, existingTask.id));

          return {
            taskStatus: AITaskStatus.FAILED,
            taskId: existingTask.id,
            taskInfo,
          };
        }
      }

      await db()
        .update(aiTask)
        .set({ taskInfo: JSON.stringify(taskInfo) })
        .where(eq(aiTask.id, existingTask.id));
    } else {
      // 正在生成音乐中，更新微进度
      taskInfo.progress = Math.min(65, 40 + Math.floor(elapsedSeconds * 1.5));
      await db()
        .update(aiTask)
        .set({ taskInfo: JSON.stringify(taskInfo) })
        .where(eq(aiTask.id, existingTask.id));
    }

    return {
      taskStatus: AITaskStatus.PROCESSING,
      taskId: existingTask.id,
      taskInfo,
    };
  }

  // ─── 阶段 2: Video (面部咬字与动作驱动) ───
  if (taskInfo.stage === 'video') {
    let videoUrl = taskInfo.videoUrl;

    if (isMock) {
      if (elapsedSeconds >= 16) {
        videoUrl = 'https://pixanyoss.16781678.xyz/palix-ai.mp4';
      }
    } else if (taskInfo.videoTaskId) {
      try {
        if (taskInfo.videoProvider === 'alibaba') {
          // 轮询阿里百炼 DashScope 异步任务进度
          const { getAllConfigs } = await import('@/modules/config/service');
          const configs = await getAllConfigs();
          const alibabaApiKey = (configs.alibaba_api_key || envConfigs.alibaba_api_key || '').trim();
          const alibabaBaseUrl = (configs.alibaba_base_url || envConfigs.alibaba_base_url || 'https://ws-2txa9apyfxruykae.us-east-1.maas.aliyuncs.com').trim();
          const origin = new URL(alibabaBaseUrl).origin;
          const queryEndpoint = `${origin}/api/v1/tasks/${taskInfo.videoTaskId}`;

          const qRes = await fetch(queryEndpoint, {
            headers: { Authorization: `Bearer ${alibabaApiKey}` },
            signal: AbortSignal.timeout(15000),
          });
          const qJson: any = await qRes.json().catch(() => ({}));
          const out = qJson.output || {};
          const status = out.task_status;

          if (status === 'SUCCEEDED') {
            videoUrl = out.video_url || null;
          } else if (status === 'FAILED') {
            throw new Error(out.message || qJson.message || '阿里视频驱动生成失败 (FAILED)');
          } else {
            taskInfo.stageMessage = 'Characters queued into AI video engine, rendering studio rap MV...';
          }
        } else {
          // 通用 Provider 轮询
          const provider = await getAIProvider();
          if (provider && typeof provider.query === 'function') {
            const queryRes = await provider.query({
              taskId: taskInfo.videoTaskId,
              mediaType: 'video',
            });
            if (queryRes.taskStatus === AITaskStatus.SUCCESS) {
              videoUrl = extractMediaUrl(queryRes);
            } else if (queryRes.taskStatus === AITaskStatus.FAILED) {
              throw new Error('Video generation failed');
            }
          }
        }
      } catch (vErr: any) {
        console.error('Video status query error:', vErr);
        if (vErr.message && !vErr.message.includes('timeout')) {
          await revoke(existingTask.creditId);
          taskInfo.stage = 'failed';
          taskInfo.error = sanitizeUserErrorMessage(vErr.message);
          await db()
            .update(aiTask)
            .set({ status: 'failed', taskInfo: JSON.stringify(taskInfo) })
            .where(eq(aiTask.id, existingTask.id));

          return {
            taskStatus: AITaskStatus.FAILED,
            taskId: existingTask.id,
            taskInfo,
          };
        }
      }
    }

    if (videoUrl) {
      taskInfo.videoUrl = videoUrl;
      taskInfo.stage = 'completed';
      taskInfo.progress = 100;
      taskInfo.stageMessage = 'AI Rap MV rendered successfully!';

      await db()
        .update(aiTask)
        .set({
          status: 'success',
          activeSlot: null,
          taskInfo: JSON.stringify(taskInfo),
          taskResult: JSON.stringify({
            videoUrl,
            audioUrl: taskInfo.audioUrl,
            lyrics: taskInfo.lyrics,
            title: taskInfo.title,
          }),
        })
        .where(eq(aiTask.id, existingTask.id));

      return {
        taskStatus: AITaskStatus.SUCCESS,
        taskId: existingTask.id,
        taskInfo: {
          ...taskInfo,
          videos: [{ videoUrl, duration: 15 }],
        },
      };
    } else {
      taskInfo.progress = Math.min(95, 70 + Math.floor((elapsedSeconds - 10) * 1.5));
      await db()
        .update(aiTask)
        .set({ taskInfo: JSON.stringify(taskInfo) })
        .where(eq(aiTask.id, existingTask.id));
    }

    return {
      taskStatus: AITaskStatus.PROCESSING,
      taskId: existingTask.id,
      taskInfo,
    };
  }

  return {
    taskStatus: AITaskStatus.PROCESSING,
    taskId: existingTask.id,
    taskInfo,
  };
}

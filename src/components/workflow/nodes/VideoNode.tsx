import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Clapperboard, Download, Eye, Film, Loader2, Music, Sparkles, Video, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import { HOMEPAGE_THEMES } from '@/config/rap-presets';
import { NodeExecutionStatus } from '../types';

export const PROMPT_PRESETS = {
  leftLead:
    'Replace the left rapper in [Video 1] with the character shown in [Image 1]. The new left character [Image 1] is the energetic LEAD VOCALIST, delivering aggressive punchline rap vocals directly into the hanging mic with wide pronounced syllable mouth articulation, energetic head nods, and body bounce in sync with the 808 beat. Keep the orange cyclorama studio, lighting, camera framing, and right character strictly unchanged. Motion transfer: Strictly transfer the head gestures, pointing hand motions, and microphone cypher choreography from [Video 1], with flawless syllable lip-sync matching the rap audio track, 4K cinematic quality.',
  dualLead:
    'Replace the left rapper in [Video 1] with the character from [Image 1], and replace the right rapper in [Video 1] with the character from [Image 2]. Both characters perform high-energy rap cypher, with [Image 1] on the left and [Image 2] on the right, vigorously bouncing knees and tilting toward the hanging mic, with wide pronounced mouth lip-sync articulation matching the audio vocals. Keep the orange studio setting unchanged. Motion transfer: Strictly transfer the pointing hand gestures, head nods, and microphone choreography from [Video 1], flawless rap lip-sync, 4K cinematic quality.',
  rightLead:
    'Replace the right rapper in [Video 1] with the character shown in [Image 2]. Keep the left character strictly unchanged. The right character [Image 2] is the primary lead vocalist pointing forward and rapping into the mic with pronounced mouth lip-sync, while Left rapper heavily bounces with rhythmic head nods. Keep the studio setting and motion timing from [Video 1] strictly preserved, 4K cinematic quality.',
  freeStyle:
    'A high-energy hip-hop rapper shown in [Image 1] performing dynamically in the studio, free rhythmic body bounce, energetic natural hand gestures pointing at camera, expressive facial expressions, singing passionately with mouth lip-sync matching the 808 trap beat, cinematic studio lighting, 4K quality.',
  freeStyleDual:
    'Two high-energy hip-hop rappers, [Image 1] on the left and [Image 2] on the right, performing dynamically together in the orange studio, free rhythmic body bounce, alternating cypher rap gestures pointing at the camera, expressive facial lip-sync matching the rap vocals, 4K cinematic quality.',
};

export const DEFAULT_VIDEO_PROMPT = PROMPT_PRESETS.dualLead;

interface VideoNodeData {
  topic?: string;
  styleId?: string;
  photo1: string;
  photo2?: string;
  studioMode?: 'solo' | 'duo';
  generatedAudioUrl?: string;
  referenceVideoUrl?: string;
  motionSyncEnabled?: boolean;
  lipSyncEnabled?: boolean;
  videoModel: string;
  videoResolution: string;
  videoRatio?: string;
  videoDuration?: number;
  videoPrompt?: string;
  videoTaskId?: string;
  generatedVideoUrl?: string;
  latency?: number;
  status: NodeExecutionStatus;
  mock: boolean;
  onChange: (updates: any) => void;
  onRunStep: () => Promise<void>;
}

export function VideoNode({ data }: { data: VideoNodeData }) {
  const isRunning = data.status === 'running';
  const isSuccess = data.status === 'success' || Boolean(data.generatedVideoUrl);
  const [videoLoadError, setVideoLoadError] = React.useState(false);
  const [syncAudio, setSyncAudio] = React.useState(true);
  const [showRefVideo, setShowRefVideo] = React.useState(false);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const currentTheme = React.useMemo(() => {
    return HOMEPAGE_THEMES.find(
      (t) =>
        (data.topic && t.topic.slice(0, 10) === data.topic.slice(0, 10)) ||
        t.videoPrompt === data.videoPrompt ||
        t.id === data.styleId
    );
  }, [data.topic, data.videoPrompt, data.styleId]);

  const isSoloDuoMismatch =
    (data.studioMode === 'solo' || !data.photo2) && data.videoModel === 'happyhorse-1.1-r2v';

  const isPromptAligned = currentTheme && data.videoPrompt === currentTheme.videoPrompt;

  React.useEffect(() => {
    setVideoLoadError(false);
  }, [data.generatedVideoUrl]);

  const handleVideoPlay = () => {
    if (syncAudio && audioRef.current && videoRef.current) {
      audioRef.current.currentTime = videoRef.current.currentTime;
      audioRef.current.play().catch(() => {});
    }
  };

  const handleVideoPause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const handleVideoTimeUpdate = () => {
    if (syncAudio && audioRef.current && videoRef.current) {
      if (Math.abs(audioRef.current.currentTime - videoRef.current.currentTime) > 0.25) {
        audioRef.current.currentTime = videoRef.current.currentTime;
      }
    }
  };

  const handleVideoSeeked = () => {
    if (syncAudio && audioRef.current && videoRef.current) {
      audioRef.current.currentTime = videoRef.current.currentTime;
    }
  };

  return (
    <div
      className={`w-[400px] rounded-2xl border bg-[#0d1527]/95 p-4 text-white shadow-2xl backdrop-blur-xl transition-all ${
        isRunning
          ? 'border-cyan-500 shadow-[0_0_25px_rgba(6,182,212,0.35)]'
          : isSuccess
            ? 'border-cyan-500/50 hover:border-cyan-400'
            : 'border-white/10 hover:border-white/25'
      }`}
    >
      {/* Input Ports */}
      <Handle
        type="target"
        position={Position.Left}
        id="image-in"
        style={{ top: '25%' }}
        className="!size-3.5 !bg-amber-400 !border-2 !border-[#0d1527] transition hover:scale-125"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="audio-in"
        style={{ top: '75%' }}
        className="!size-3.5 !bg-rose-400 !border-2 !border-[#0d1527] transition hover:scale-125"
      />

      {/* Node Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
            <Film className="size-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Video Driver</div>
            <div className="text-sm font-semibold">音画对齐与动作驱动</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data.latency != null && (
            <span className="text-[10px] text-slate-400">{data.latency}ms</span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              isRunning
                ? 'bg-cyan-500/20 text-cyan-300 animate-pulse'
                : isSuccess
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-slate-800 text-slate-400'
            }`}
          >
            {isRunning ? '渲染中...' : isSuccess ? '已成片' : 'Idle'}
          </span>
        </div>
      </div>

      {/* Active Theme & Alignment Status Indicator */}
      {currentTheme && (
        <div className="mt-2.5 flex items-center justify-between rounded-xl border border-cyan-500/20 bg-cyan-950/20 px-2.5 py-1.5 text-[10px]">
          <div className="flex items-center gap-1.5 truncate">
            <Sparkles className="size-3 text-cyan-400 shrink-0" />
            <span className="text-slate-400">场景协同:</span>
            <span className="font-semibold text-cyan-300 truncate max-w-[150px]">{currentTheme.name}</span>
          </div>
          <span
            className={`rounded px-1.5 py-0.5 text-[9px] font-semibold shrink-0 ${
              isPromptAligned
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
          >
            {isPromptAligned ? '✓ 全链路已对齐' : '⚡ 已自定义微调'}
          </span>
        </div>
      )}

      {/* Solo-Duo Mismatch Guardrail Banner */}
      {isSoloDuoMismatch && (
        <div className="mt-2 flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-500/10 p-2 text-[10px] text-amber-300">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-amber-400 shrink-0" />
            <span>当前为单人模式，已检测到双人驱动模型冲突</span>
          </div>
          <button
            type="button"
            onClick={() => {
              data.onChange({
                videoModel: 'happyhorse-1.1-i2v',
                motionSyncEnabled: false,
              });
              toast.success('已自动适配为单人自由驱动模型 (HappyHorse 1.1 I2V)');
            }}
            className="rounded bg-amber-500 px-2 py-0.5 font-bold text-black hover:bg-amber-400 transition cursor-pointer shrink-0"
          >
            一键修正
          </button>
        </div>
      )}

      {/* Body */}
      <div className="mt-3 space-y-3 text-xs">
        {/* Model, Ratio, Resolution & Duration Select */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="mb-1 block font-medium text-slate-300">驱动模型</label>
            <select
              value={data.videoModel || 'wan3.0-video'}
              onChange={(e) => {
                const newModel = e.target.value;
                const isFreeStyle = newModel.includes('happyhorse');
                data.onChange({
                  videoModel: newModel,
                  motionSyncEnabled: !isFreeStyle,
                });
              }}
              className="w-full rounded-lg border border-white/15 bg-slate-900 px-2 py-1.5 text-[11px] text-white focus:border-cyan-400 focus:outline-none"
            >
              <option value="happyhorse-1.1-i2v">HappyHorse 1.1 I2V (单人自由生成·推荐)</option>
              <option value="wan3.0-video">Wan 3.0 (原版姿态驱动/高保真·推荐)</option>
              <option value="happyhorse-1.1-r2v">HappyHorse 1.1 R2V (双人同框·推荐)</option>
              <option value="seedance-2-5">Seedance 2.5 (音素级口型咬字对齐)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block font-medium text-cyan-300">画幅比例</label>
            <select
              value={data.videoRatio || '9:16'}
              onChange={(e) => data.onChange({ videoRatio: e.target.value })}
              className="w-full rounded-lg border border-cyan-500/40 bg-slate-900 px-2 py-1.5 text-[11px] font-semibold text-cyan-300 focus:border-cyan-400 focus:outline-none"
            >
              <option value="9:16">📱 9:16 (竖屏·短视频/TikTok)</option>
              <option value="16:9">🖥️ 16:9 (横屏·宽屏/YouTube)</option>
              <option value="1:1">⬛ 1:1 (方形·正方形)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-300">清晰度</label>
            <select
              value={data.videoResolution || '480p'}
              onChange={(e) => data.onChange({ videoResolution: e.target.value })}
              className="w-full rounded-lg border border-white/15 bg-slate-900 px-2 py-1.5 text-[11px] text-white focus:border-cyan-400 focus:outline-none"
            >
              <option value="480p">480p (超低成本调试)</option>
              <option value="720p">720p (标清高清)</option>
              <option value="1080p">1080p (全高清)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block font-medium text-amber-300">生成时长</label>
            <select
              value={data.videoDuration || 5}
              onChange={(e) => data.onChange({ videoDuration: Number(e.target.value) })}
              className="w-full rounded-lg border border-amber-500/40 bg-slate-900 px-2 py-1.5 text-[11px] font-semibold text-amber-300 focus:border-amber-400 focus:outline-none"
            >
              <option value={5}>5 秒 (推荐)</option>
              <option value={10}>10 秒</option>
              <option value={15}>15 秒</option>
            </select>
          </div>
        </div>

        {/* Original Video Motion Reference & Lip-Sync Panel */}
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/30 p-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Film className="size-3.5 text-cyan-400" />
              <span className="font-semibold text-cyan-300">原版动作与姿态驱动源</span>
            </div>
            <button
              type="button"
              onClick={() => setShowRefVideo((prev) => !prev)}
              className="flex items-center gap-1 text-[10px] text-cyan-400 hover:underline"
            >
              <Eye className="size-3" />
              <span>{showRefVideo ? '折叠预览' : '查看原版 5 秒'}</span>
            </button>
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
            <span className="truncate max-w-[190px]">
              {currentTheme?.referenceLabel || (data.studioMode === 'solo' ? '单人节奏律动自由发挥' : 'Hotel Lobby 原版5秒动作模版')}
            </span>
            {data.motionSyncEnabled !== false ? (
              <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-cyan-300 font-medium">Video-to-Video 驱动</span>
            ) : (
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-amber-300 font-semibold border border-amber-500/30">
                ✨ 自由动作 (无骨骼束缚)
              </span>
            )}
          </div>

          {showRefVideo && (
            <div className="mt-2 overflow-hidden rounded-lg border border-white/10 bg-black">
              <video
                src={data.referenceVideoUrl || '/videos/reference-5s.mp4'}
                controls
                loop
                className="max-h-36 w-full object-contain"
              />
              <div className="bg-slate-900/80 p-1.5 text-center text-[10px] text-slate-400">
                原版参考动作源：用于提取 Takeoff 指镜头挥手与 Quavo 律动骨架
              </div>
            </div>
          )}

          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-white/10 pt-2 text-[10px]">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={data.motionSyncEnabled !== false}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  const isDuo = data.studioMode === 'duo' || Boolean(data.photo2);
                  data.onChange({
                    motionSyncEnabled: enabled,
                    videoModel: enabled ? 'wan3.0-video' : (isDuo ? 'happyhorse-1.1-r2v' : 'happyhorse-1.1-i2v'),
                  });
                }}
                className="rounded border-white/20 bg-slate-900 text-cyan-500 focus:ring-0"
              />
              <span>骨骼姿态迁移 (Motion)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={data.lipSyncEnabled !== false}
                onChange={(e) => data.onChange({ lipSyncEnabled: e.target.checked })}
                className="rounded border-white/20 bg-slate-900 text-cyan-500 focus:ring-0"
              />
              <span>音素级口型对齐 (Lip-Sync)</span>
            </label>
          </div>
        </div>

        {/* Prompt Input Section */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="font-medium text-slate-300">动作与分镜提示词</label>
            <div className="flex items-center gap-1">
              {currentTheme && !isPromptAligned && (
                <button
                  type="button"
                  onClick={() => {
                    data.onChange({
                      videoPrompt: currentTheme.videoPrompt,
                      videoModel:
                        currentTheme.videoModel || (data.studioMode === 'duo' ? 'happyhorse-1.1-r2v' : 'happyhorse-1.1-i2v'),
                      motionSyncEnabled: currentTheme.motionSyncEnabled ?? (data.studioMode === 'duo'),
                      lipSyncEnabled: currentTheme.lipSyncEnabled ?? true,
                    });
                    toast.success(`已恢复为「${currentTheme.name}」专属分镜`);
                  }}
                  className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-300 hover:bg-cyan-500/30 transition cursor-pointer border border-cyan-500/30"
                  title="一键还原当前场景官方推荐的分镜提示词与模型设置"
                >
                  🔄 还原场景分镜
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const isDuo = data.studioMode === 'duo' || Boolean(data.photo2);
                  const targetModel = isDuo ? 'happyhorse-1.1-r2v' : 'happyhorse-1.1-i2v';
                  data.onChange({
                    videoPrompt: isDuo ? PROMPT_PRESETS.freeStyleDual : PROMPT_PRESETS.freeStyle,
                    motionSyncEnabled: false,
                    lipSyncEnabled: true,
                    videoModel: targetModel,
                  });
                  toast.success(
                    isDuo
                      ? '已切换为双人 AI 自由发挥模式：自动同步切换为 HappyHorse 1.1 R2V (双人同框)，解绑原版骨骼约束！'
                      : '已切换为 AI 自由发挥模式：自动同步切换为 HappyHorse 1.1 I2V，解绑原版骨骼约束！'
                  );
                }}
                className={`rounded px-1.5 py-0.5 text-[9px] font-semibold transition cursor-pointer ${
                  data.motionSyncEnabled === false
                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
                title="AI 自由发挥：解除原版视频骨骼动作约束，由 AI 自由演化身体律动与手势"
              >
                🎲 AI自由发挥
              </button>
              <button
                type="button"
                onClick={() =>
                  data.onChange({
                    videoPrompt: PROMPT_PRESETS.leftLead,
                    motionSyncEnabled: true,
                    videoModel: 'wan3.0-video',
                  })
                }
                className={`rounded px-1.5 py-0.5 text-[9px] font-semibold transition cursor-pointer ${
                  data.motionSyncEnabled !== false && data.videoPrompt === PROMPT_PRESETS.leftLead
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
                title="重点对齐左边替换人物的歌唱大口型与动作 (右边保持原版不变)"
              >
                🔥 仅换左侧
              </button>
              <button
                type="button"
                onClick={() =>
                  data.onChange({
                    videoPrompt: PROMPT_PRESETS.dualLead,
                    motionSyncEnabled: true,
                    videoModel: 'wan3.0-video',
                  })
                }
                className={`rounded px-1.5 py-0.5 text-[9px] font-semibold transition cursor-pointer ${
                  data.motionSyncEnabled !== false && data.videoPrompt === PROMPT_PRESETS.dualLead
                    ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.25)]'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
                title="双人全部替换：图1替换左边人物，图2替换右边人物 (男女双人同框对唱)"
              >
                👥 双人全景 (全换)
              </button>
              <button
                type="button"
                onClick={() =>
                  data.onChange({
                    videoPrompt: PROMPT_PRESETS.rightLead,
                    motionSyncEnabled: true,
                    videoModel: 'wan3.0-video',
                  })
                }
                className={`rounded px-1.5 py-0.5 text-[9px] font-semibold transition cursor-pointer ${
                  data.motionSyncEnabled !== false && data.videoPrompt === PROMPT_PRESETS.rightLead
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
                title="仅替换右侧人物：将右侧人物替换为图2人像 (左边保持原版不变)"
              >
                仅换右侧
              </button>
            </div>
          </div>
          <textarea
            rows={4}
            value={data.videoPrompt !== undefined ? data.videoPrompt : DEFAULT_VIDEO_PROMPT}
            onChange={(e) => data.onChange({ videoPrompt: e.target.value })}
            placeholder="输入说唱动作、同框机位与场景描述..."
            className="w-full rounded-lg border border-white/15 bg-white/5 p-2 text-[11px] leading-relaxed text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
          />
        </div>

        {/* Action Button: Single-step debug */}
        <div>
          <button
            type="button"
            disabled={isRunning || !data.photo1}
            onClick={() => data.onRunStep()}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 transition hover:brightness-110 disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>驱动嘴型与身体节拍渲染中...</span>
              </>
            ) : (
              <>
                <Sparkles className="size-3.5 text-cyan-200" />
                <span>⚡ 单步调试：独立生成 MV 视频</span>
              </>
            )}
          </button>
        </div>

        {/* Video Player Preview */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="font-medium text-slate-300">视频播放器与预览</span>
            {data.generatedAudioUrl && data.generatedVideoUrl && (
              <button
                type="button"
                onClick={() => setSyncAudio((prev) => !prev)}
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
                  syncAudio
                    ? 'border border-cyan-500/40 bg-cyan-500/20 text-cyan-300 shadow-sm'
                    : 'border border-white/10 bg-slate-800 text-slate-400'
                }`}
                title="开启后播放视频将自动同步播放第2步的编曲伴奏音频"
              >
                {syncAudio ? (
                  <>
                    <Volume2 className="size-3 text-cyan-400" />
                    <span>伴奏双轨联播: 开启</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="size-3 text-slate-400" />
                    <span>伴奏双轨联播: 关闭</span>
                  </>
                )}
              </button>
            )}
          </div>

          {data.generatedVideoUrl ? (
            <div className="relative overflow-hidden rounded-xl border border-white/15 bg-black">
              {/* Synchronized Accompaniment Audio Element */}
              {data.generatedAudioUrl && (
                <audio
                  ref={audioRef}
                  src={data.generatedAudioUrl}
                  preload="auto"
                  loop
                  className="hidden"
                />
              )}

              <video
                ref={videoRef}
                src={data.generatedVideoUrl}
                controls
                autoPlay
                loop
                muted={syncAudio && Boolean(data.generatedAudioUrl)}
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
                onTimeUpdate={handleVideoTimeUpdate}
                onSeeked={handleVideoSeeked}
                onError={() => setVideoLoadError(true)}
                className="max-h-52 w-full object-contain"
              />

              {videoLoadError && (
                <div className="border-t border-amber-500/30 bg-amber-950/80 p-2.5 text-[11px] text-amber-200">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <span>⚠️ 视频拉取超时 (ERR_TIMED_OUT)</span>
                  </div>
                  <div className="mt-1 leading-relaxed text-[10px] text-slate-300">
                    因阿里百炼国际版生成在美东机房，国内代理分流默认直连导致被防火墙阻断。
                    <br />
                    👉 <strong>解决方式</strong>：将代理软件（如 NekoBox/Clash）切为<strong>「全局模式」</strong>后刷新；或在上方驱动模型切换为 <strong>「Seedance 2.5 (字节跳动)」</strong>。
                  </div>
                </div>
              )}

              {/* Status & Sync Note */}
              <div className="border-t border-white/10 bg-black/60 p-2 text-[10px]">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="truncate max-w-[200px]">{data.generatedVideoUrl}</span>
                  <a
                    href={data.generatedVideoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-cyan-400 hover:underline"
                  >
                    <Download className="size-3" />
                    <span>下载 MP4</span>
                  </a>
                </div>
                {data.generatedAudioUrl && (
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-cyan-300/80">
                    <Music className="size-3 text-cyan-400 shrink-0" />
                    <span className="truncate">已关联伴奏：{data.generatedAudioUrl}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-28 flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-slate-500">
              <Video className="size-5 mb-1 opacity-50" />
              <span>需先有图片与伴奏音频</span>
              <span className="text-[10px] text-slate-600">点击上方单步调试或一键全流程运行</span>
            </div>
          )}
        </div>
      </div>

      {/* Output Port (Passes Video to Output Node) */}
      <Handle
        type="source"
        position={Position.Right}
        id="video-out"
        className="!size-3.5 !bg-cyan-400 !border-2 !border-[#0d1527] transition hover:scale-125"
      />
    </div>
  );
}

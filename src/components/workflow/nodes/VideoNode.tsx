import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Clapperboard, Download, Eye, Film, Loader2, Sparkles, Video } from 'lucide-react';
import { NodeExecutionStatus } from '../types';

export const DEFAULT_VIDEO_PROMPT =
  'Continuous single-take two-shot, NO cuts, camera stays fixed. Both [Image 1] and [Image 2] always in the same frame against a solid bright orange studio background. A vintage chrome microphone hangs from the ceiling in the exact center between them. On the left, [Image 1] in red satin jacket, on the right, [Image 2] in black tactical vest. They heavily bounce their bodies to the 808 trap beat, with deep rhythmic head nods and fast expressive hip-hop hand gestures. They trade aggressive rap bars, alternating leaning into the hanging center mic, turning to face each other in an intense battle, perfectly lip-synced.';

interface VideoNodeData {
  photo1: string;
  generatedAudioUrl?: string;
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

  React.useEffect(() => {
    setVideoLoadError(false);
  }, [data.generatedVideoUrl]);

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

      {/* Body */}
      <div className="mt-3 space-y-3 text-xs">
        {/* Model, Ratio, Resolution & Duration Select */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="mb-1 block font-medium text-slate-300">驱动模型</label>
            <select
              value={data.videoModel || 'happyhorse-1.1-r2v'}
              onChange={(e) => data.onChange({ videoModel: e.target.value })}
              className="w-full rounded-lg border border-white/15 bg-slate-900 px-2 py-1.5 text-[11px] text-white focus:border-cyan-400 focus:outline-none"
            >
              <option value="happyhorse-1.1-r2v">HappyHorse 1.1 R2V (阿里调试)</option>
              <option value="happyhorse-1.1-i2v">HappyHorse 1.1 I2V (单人人像)</option>
              <option value="wan3.0-video">Wan 3.0 Video (万象性价比)</option>
              <option value="wan2.1-i2v-plus">Wan 2.1 Plus (万象高品质)</option>
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

        {/* Prompt Input Section */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="font-medium text-slate-300">动作与分镜提示词 (Prompt)</label>
            <button
              type="button"
              onClick={() => data.onChange({ videoPrompt: DEFAULT_VIDEO_PROMPT })}
              className="text-[10px] text-cyan-400 hover:underline"
            >
              重置预置
            </button>
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
          <span className="mb-1 block font-medium text-slate-300">视频播放器与预览</span>
          {data.generatedVideoUrl ? (
            <div className="relative overflow-hidden rounded-xl border border-white/15 bg-black">
              <video
                src={data.generatedVideoUrl}
                controls
                autoPlay
                loop
                muted
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
              <div className="flex items-center justify-between border-t border-white/10 bg-black/60 p-2 text-[10px] text-slate-400">
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

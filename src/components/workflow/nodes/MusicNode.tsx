import React, { useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Headphones, Loader2, Music, Pause, Play, Sparkles, Volume2 } from 'lucide-react';
import { NodeExecutionStatus } from '../types';

interface MusicNodeData {
  generatedLyrics: string;
  musicModel: string;
  musicTaskId?: string;
  generatedAudioUrl?: string;
  latency?: number;
  status: NodeExecutionStatus;
  mock: boolean;
  onChange: (updates: any) => void;
  onRunStep: () => Promise<void>;
}

export function MusicNode({ data }: { data: MusicNodeData }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current || !data.generatedAudioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const isRunning = data.status === 'running';
  const isSuccess = data.status === 'success' || Boolean(data.generatedAudioUrl);

  return (
    <div
      className={`w-96 rounded-2xl border bg-[#0d1527]/95 p-4 text-white shadow-2xl backdrop-blur-xl transition-all ${
        isRunning
          ? 'border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.35)]'
          : isSuccess
            ? 'border-rose-500/50 hover:border-rose-400'
            : 'border-white/10 hover:border-white/25'
      }`}
    >
      {/* Input Port (Receives Lyrics from Lyrics Node) */}
      <Handle
        type="target"
        position={Position.Left}
        id="lyrics-in"
        className="!size-3.5 !bg-purple-400 !border-2 !border-[#0d1527] transition hover:scale-125"
      />

      {/* Node Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400">
            <Music className="size-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-rose-400 uppercase tracking-wider">Music Engine</div>
            <div className="text-sm font-semibold">Suno 编曲与伴奏</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data.latency != null && (
            <span className="text-[10px] text-slate-400">{data.latency}ms</span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              isRunning
                ? 'bg-rose-500/20 text-rose-300 animate-pulse'
                : isSuccess
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-slate-800 text-slate-400'
            }`}
          >
            {isRunning ? '编曲中...' : isSuccess ? '已生成' : 'Idle'}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="mt-3 space-y-3 text-xs">
        {/* Model Select */}
        <div>
          <label className="mb-1 block font-medium text-slate-300">Suno 音乐版本</label>
          <select
            value={data.musicModel}
            onChange={(e) => data.onChange({ musicModel: e.target.value })}
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:border-rose-400 focus:outline-none"
          >
            <option value="suno-v4">Suno v4 (重低音 808 与卡点说唱)</option>
            <option value="suno-v3.5">Suno v3.5 (旋律嘻哈标准版)</option>
          </select>
        </div>

        {/* Action Button: Single-step debug */}
        <div>
          <button
            type="button"
            disabled={isRunning}
            onClick={() => data.onRunStep()}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-rose-500/25 transition hover:brightness-110 disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Suno 正在生成 808 鼓点与伴奏...</span>
              </>
            ) : (
              <>
                <Sparkles className="size-3.5 text-amber-300" />
                <span>⚡ 单步调试：独立生成 Suno 音频</span>
              </>
            )}
          </button>
        </div>

        {/* Audio Player Preview */}
        <div>
          <span className="mb-1 block font-medium text-slate-300">伴奏试听与波形</span>
          {data.generatedAudioUrl ? (
            <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/40 p-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-rose-500 text-white shadow-md shadow-rose-500/30 transition hover:scale-105"
                >
                  {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 fill-current ml-0.5" />}
                </button>
                <div className="flex-1 px-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full bg-gradient-to-r from-rose-500 to-amber-500 ${
                        isPlaying ? 'animate-pulse' : ''
                      }`}
                      style={{ width: isPlaying ? '70%' : '100%' }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                    <span>808 Trap Beat</span>
                    <span>Ready</span>
                  </div>
                </div>
              </div>

              <audio
                ref={audioRef}
                src={data.generatedAudioUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />

              <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[10px] text-slate-400">
                <span className="truncate max-w-[200px]">{data.generatedAudioUrl}</span>
                <a
                  href={data.generatedAudioUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-rose-400 hover:underline"
                >
                  下载 MP3
                </a>
              </div>
            </div>
          ) : (
            <div className="flex h-16 items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-slate-500">
              <Headphones className="size-4 mr-1.5 opacity-50" />
              <span>暂无音频，点击上方调试或整跑生成</span>
            </div>
          )}
        </div>
      </div>

      {/* Output Port (Passes Audio to Video Node) */}
      <Handle
        type="source"
        position={Position.Right}
        id="audio-out"
        className="!size-3.5 !bg-rose-400 !border-2 !border-[#0d1527] transition hover:scale-125"
      />
    </div>
  );
}

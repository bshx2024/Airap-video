import React, { useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Headphones, Link2, Loader2, Music, Pause, Play, RotateCcw, Sparkles, Upload } from 'lucide-react';
import { NodeExecutionStatus } from '../types';

interface MusicNodeData {
  generatedLyrics: string;
  musicModel: string;
  musicTaskId?: string;
  generatedAudioUrl?: string;
  latency?: number;
  status: NodeExecutionStatus;
  mock: boolean;
  vocalGender?: 'auto' | 'male' | 'female' | 'duet';
  effectiveVocalGender?: 'male' | 'female' | 'duet';
  onChange: (updates: any) => void;
  onRunStep: () => Promise<void>;
}

export function MusicNode({ data }: { data: MusicNodeData }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      data.onChange({
        generatedAudioUrl: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const isRunning = data.status === 'running';
  const isSuccess = data.status === 'success' || Boolean(data.generatedAudioUrl);

  const effectiveGender =
    data.vocalGender && data.vocalGender !== 'auto'
      ? data.vocalGender
      : data.effectiveVocalGender || 'male';

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
            <div className="text-sm font-semibold">AI 编曲与伴奏</div>
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
          <label className="mb-1 block font-medium text-slate-300">编曲伴奏模型</label>
          <select
            value={data.musicModel || 'fun-music-v1'}
            onChange={(e) => data.onChange({ musicModel: e.target.value })}
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:border-rose-400 focus:outline-none"
          >
            <option value="fun-music-v1">Fun-Music v1 (阿里百炼·说唱谱曲与伴奏)</option>
            <option value="suno-v4">Suno v4 (高燃 808 与卡点说唱·需 KIE 密钥)</option>
            <option value="suno-v3.5">Suno v3.5 (旋律嘻哈标准版·需 KIE 密钥)</option>
          </select>
        </div>

        {/* Vocal Gender Selector */}
        <div>
          <div className="mb-1 flex items-center justify-between text-slate-300 font-medium">
            <span>演唱人声与音色</span>
            <span className="text-[10px] text-rose-300 font-semibold">
              当前: {
                effectiveGender === 'duet'
                  ? '👥 双人对唱'
                  : effectiveGender === 'female'
                    ? '👩 纯女声'
                    : '👨 纯男声'
              }
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            <button
              type="button"
              onClick={() => data.onChange({ vocalGender: 'auto' })}
              className={`rounded-lg border px-1.5 py-1.5 text-center text-[10px] font-bold transition cursor-pointer ${
                (data.vocalGender === 'auto' || !data.vocalGender)
                  ? 'border-rose-400 bg-rose-500/20 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                  : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-slate-200'
              }`}
              title="根据 Start 节点上传的人物照片自动匹配男女声"
            >
              🤖 自适应
            </button>
            <button
              type="button"
              onClick={() => data.onChange({ vocalGender: 'male' })}
              className={`rounded-lg border px-1.5 py-1.5 text-center text-[10px] font-bold transition cursor-pointer ${
                data.vocalGender === 'male'
                  ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.3)]'
                  : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-slate-200'
              }`}
            >
              👨 男声
            </button>
            <button
              type="button"
              onClick={() => data.onChange({ vocalGender: 'female' })}
              className={`rounded-lg border px-1.5 py-1.5 text-center text-[10px] font-bold transition cursor-pointer ${
                data.vocalGender === 'female'
                  ? 'border-pink-400 bg-pink-500/20 text-pink-300 shadow-[0_0_8px_rgba(244,114,182,0.3)]'
                  : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-slate-200'
              }`}
            >
              👩 女声
            </button>
            <button
              type="button"
              onClick={() => data.onChange({ vocalGender: 'duet' })}
              className={`rounded-lg border px-1.5 py-1.5 text-center text-[10px] font-bold transition cursor-pointer ${
                data.vocalGender === 'duet'
                  ? 'border-purple-400 bg-purple-500/20 text-purple-300 shadow-[0_0_8px_rgba(192,132,252,0.3)]'
                  : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-slate-200'
              }`}
              title="男女声轮流交替演唱与副歌合唱"
            >
              👥 双人对唱
            </button>
          </div>
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
                <span>正在生成 808 鼓点与伴奏...</span>
              </>
            ) : (
              <>
                <Sparkles className="size-3.5 text-amber-300" />
                <span>⚡ 单步调试：独立生成伴奏音频</span>
              </>
            )}
          </button>
        </div>

        {/* Hidden Audio File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.ogg"
          onChange={handleAudioUpload}
          className="hidden"
        />

        {/* Fast Reuse / Upload Toolbar to Save Testing Costs */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] py-1.5 px-2 text-[11px] font-medium text-slate-300 transition hover:bg-white/[0.08] hover:border-white/20 hover:text-white"
            title="上传本地 MP3 / WAV 伴奏，无需重复生成省成本"
          >
            <Upload className="size-3 text-rose-400" />
            <span>上传已有音频</span>
          </button>
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] py-1.5 px-2 text-[11px] font-medium text-slate-300 transition hover:bg-white/[0.08] hover:border-white/20 hover:text-white"
            title="粘贴之前生成的 MP3 链接，直接复用"
          >
            <Link2 className="size-3 text-amber-400" />
            <span>粘贴音频链接</span>
          </button>
          {data.generatedAudioUrl && (
            <button
              type="button"
              onClick={() => data.onChange({ generatedAudioUrl: '' })}
              className="flex size-7 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
              title="清除当前伴奏"
            >
              <RotateCcw className="size-3" />
            </button>
          )}
        </div>

        {/* Optional URL Paste Expandable Box */}
        {showUrlInput && (
          <div className="flex gap-1.5 rounded-lg border border-rose-500/30 bg-black/40 p-1.5 animate-fadeIn">
            <input
              type="text"
              value={urlInputValue}
              onChange={(e) => setUrlInputValue(e.target.value)}
              placeholder="粘贴历史生成的 MP3 链接..."
              className="flex-1 rounded-md border border-white/10 bg-slate-900 px-2 py-1 text-[11px] text-white placeholder-slate-500 focus:border-rose-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (urlInputValue.trim()) {
                  data.onChange({ generatedAudioUrl: urlInputValue.trim() });
                  setShowUrlInput(false);
                  setUrlInputValue('');
                }
              }}
              className="rounded-md bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-500"
            >
              应用
            </button>
          </div>
        )}

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
                    <span className="text-emerald-400">已就绪 (可供视频驱动)</span>
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
                <span className="truncate max-w-[200px]" title={data.generatedAudioUrl}>
                  {data.generatedAudioUrl.startsWith('data:') ? '本地上传的音频文件' : data.generatedAudioUrl}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-slate-400 hover:text-white"
                  >
                    替换
                  </button>
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
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex h-16 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-slate-400 transition hover:border-rose-400/50 hover:bg-rose-500/[0.03]"
            >
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <Upload className="size-3.5 text-rose-400" />
                <span>点击上传本地 MP3 / 拖拽音频文件</span>
              </div>
              <span className="mt-0.5 text-[10px] text-slate-500">也可点击上方单步调试自动生成</span>
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

import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Bot, Check, Copy, Edit3, Loader2, Play, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { NodeExecutionStatus } from '../types';

interface LyricsNodeData {
  topic: string;
  styleId: string;
  lyricsModel: string;
  lyricsLanguage?: string;
  generatedTitle: string;
  generatedLyrics: string;
  latency?: number;
  status: NodeExecutionStatus;
  onChange: (updates: any) => void;
  onRunStep: () => Promise<void>;
}

export function LyricsNode({ data }: { data: LyricsNodeData }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!data.generatedLyrics) return;
    navigator.clipboard.writeText(data.generatedLyrics);
    setCopied(true);
    toast.success('唱词已复制到剪贴板');
    setTimeout(() => setCopied(false), 2000);
  };

  const isRunning = data.status === 'running';
  const isSuccess = data.status === 'success' || Boolean(data.generatedLyrics);

  return (
    <div
      className={`w-96 rounded-2xl border bg-[#0d1527]/95 p-4 text-white shadow-2xl backdrop-blur-xl transition-all ${
        isRunning
          ? 'border-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.35)]'
          : isSuccess
            ? 'border-purple-500/50 hover:border-purple-400'
            : 'border-white/10 hover:border-white/25'
      }`}
    >
      {/* Input Port (Receives Prompt from Start Node) */}
      <Handle
        type="target"
        position={Position.Left}
        id="prompt-in"
        className="!size-3.5 !bg-amber-400 !border-2 !border-[#0d1527] transition hover:scale-125"
      />

      {/* Node Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
            <Bot className="size-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-purple-400 uppercase tracking-wider">LLM Engine</div>
            <div className="text-sm font-semibold">智能双押作词</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data.latency != null && (
            <span className="text-[10px] text-slate-400">{data.latency}ms</span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              isRunning
                ? 'bg-purple-500/20 text-purple-300 animate-pulse'
                : isSuccess
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-slate-800 text-slate-400'
            }`}
          >
            {isRunning ? '生成中...' : isSuccess ? '就绪' : 'Idle'}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="mt-3 space-y-3 text-xs">
        {/* Model & Language Select */}
        <div className="grid grid-cols-5 gap-2">
          <div className="col-span-3">
            <label className="mb-1 block font-medium text-slate-300">作词模型 (LLM)</label>
            <select
              value={data.lyricsModel}
              onChange={(e) => data.onChange({ lyricsModel: e.target.value })}
              className="w-full rounded-lg border border-white/15 bg-slate-900 px-2 py-1.5 text-[11px] text-white focus:border-purple-400 focus:outline-none"
            >
              <option value="deepseek-v4.1-flash-1017">DeepSeek V3 / R1 (阿里百炼)</option>
              <option value="template-engine">内置说唱模板库</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="mb-1 block font-medium text-amber-300">唱词语言</label>
            <select
              value={data.lyricsLanguage || 'en'}
              onChange={(e) => data.onChange({ lyricsLanguage: e.target.value })}
              className="w-full rounded-lg border border-amber-500/40 bg-slate-900 px-2 py-1.5 text-[11px] font-semibold text-amber-300 focus:border-amber-400 focus:outline-none"
            >
              <option value="en">🇺🇸 英文 (欧美嘻哈)</option>
              <option value="zh">🇨🇳 中文 (双押说唱)</option>
              <option value="es">🇪🇸 西语 (Latin Trap)</option>
              <option value="fr">🇫🇷 法语 (French Drill)</option>
              <option value="ja">🇯🇵 日语 (J-Rap)</option>
              <option value="ko">🇰🇷 韩语 (K-Rap)</option>
            </select>
          </div>
        </div>

        {/* Action Button: Single-step debug */}
        <div>
          <button
            type="button"
            disabled={isRunning}
            onClick={() => data.onRunStep()}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-purple-500/25 transition hover:brightness-110 disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>DeepSeek 构思押韵中...</span>
              </>
            ) : (
              <>
                <Sparkles className="size-3.5 text-amber-300" />
                <span>⚡ 单步调试：独立生成歌词</span>
              </>
            )}
          </button>
        </div>

        {/* Editable Lyrics Preview */}
        <div>
          <div className="mb-1 flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1 font-medium">
              <Edit3 className="size-3 text-slate-400" />
              <span>唱词预览与实时修改 (可手改)</span>
            </span>
            {data.generatedLyrics && (
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white"
              >
                {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                <span>{copied ? '已复制' : '复制'}</span>
              </button>
            )}
          </div>
          <textarea
            rows={6}
            value={data.generatedLyrics}
            onChange={(e) => data.onChange({ generatedLyrics: e.target.value })}
            placeholder="[Intro]&#10;Check the mic...&#10;[Verse 1]&#10;点击上方单步调试或在此处自由编辑双押唱词..."
            className="w-full font-mono rounded-lg border border-white/15 bg-black/40 p-2 text-[11px] leading-relaxed text-purple-200 placeholder-slate-600 focus:border-purple-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Output Port (Passes Lyrics to Suno Music Node) */}
      <Handle
        type="source"
        position={Position.Right}
        id="lyrics-out"
        className="!size-3.5 !bg-purple-400 !border-2 !border-[#0d1527] transition hover:scale-125"
      />
    </div>
  );
}

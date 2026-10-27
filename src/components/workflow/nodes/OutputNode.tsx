import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Award, CheckCircle2, Download, FileJson, Share2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { NodeExecutionStatus } from '../types';

interface OutputNodeData {
  generatedVideoUrl?: string;
  generatedAudioUrl?: string;
  totalLatency?: number;
  status: NodeExecutionStatus;
  onExportJson?: () => void;
}

export function OutputNode({ data }: { data: OutputNodeData }) {
  const isSuccess = Boolean(data.generatedVideoUrl);

  const handleCopyLink = () => {
    if (!data.generatedVideoUrl) return;
    navigator.clipboard.writeText(data.generatedVideoUrl);
    toast.success('成片视频直链已复制');
  };

  return (
    <div
      className={`w-80 rounded-2xl border bg-[#0d1527]/95 p-4 text-white shadow-2xl backdrop-blur-xl transition-all ${
        isSuccess
          ? 'border-emerald-500/70 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
          : 'border-white/10 hover:border-white/25'
      }`}
    >
      {/* Input Port (Receives Video from Video Node) */}
      <Handle
        type="target"
        position={Position.Left}
        id="video-in"
        className="!size-3.5 !bg-cyan-400 !border-2 !border-[#0d1527] transition hover:scale-125"
      />

      {/* Node Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <Award className="size-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Output Node</div>
            <div className="text-sm font-semibold">成片交付与资产导出</div>
          </div>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            isSuccess ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
          }`}
        >
          {isSuccess ? '已成片' : '等待输入'}
        </span>
      </div>

      {/* Body */}
      <div className="mt-3 space-y-3 text-xs">
        {isSuccess ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
              <CheckCircle2 className="mx-auto size-6 text-emerald-400" />
              <div className="mt-1 font-bold text-emerald-300">AI Rap MV 制作闭环完成！</div>
              <div className="mt-0.5 text-[10px] text-emerald-400/80">音画对齐与 808 鼓点已同步合成</div>
            </div>

            <div className="space-y-2">
              <a
                href={data.generatedVideoUrl}
                target="_blank"
                rel="noreferrer"
                download="ai-rap-mv.mp4"
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:brightness-110"
              >
                <Download className="size-3.5" />
                <span>下载高清视频成片 (.mp4)</span>
              </a>

              <button
                type="button"
                onClick={handleCopyLink}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                <Share2 className="size-3.5" />
                <span>复制在线播放外链</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-center text-slate-500 p-4">
            <Sparkles className="size-6 mb-2 opacity-40 text-emerald-400" />
            <span className="font-medium text-slate-400">等待前序节点处理完成</span>
            <span className="mt-1 text-[10px] text-slate-500">点击画布上方「▶ 一键运行全工作流」即可自动串行推进</span>
          </div>
        )}

        {/* Export Workflow DAG Button */}
        {data.onExportJson && (
          <div className="border-t border-white/10 pt-2">
            <button
              type="button"
              onClick={data.onExportJson}
              className="flex w-full items-center justify-center gap-1.5 text-[10px] text-slate-400 hover:text-white"
            >
              <FileJson className="size-3 text-amber-400" />
              <span>导出当前工作流配置 JSON (Coze/ComfyUI 规范)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

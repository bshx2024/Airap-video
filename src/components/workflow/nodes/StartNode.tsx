import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Play, Sparkles, Upload, Users, Image as ImageIcon } from 'lucide-react';
import { RAP_STYLE_PRESETS } from '@/config/rap-presets';
import { NodeExecutionStatus } from '../types';

interface StartNodeData {
  topic: string;
  styleId: string;
  bpm: number;
  studioMode: 'duo' | 'solo';
  photo1: string;
  photo2?: string;
  status: NodeExecutionStatus;
  onChange: (updates: any) => void;
  onRunStep?: () => void;
}

export function StartNode({ data }: { data: StartNodeData }) {
  const fileInputRef1 = React.useRef<HTMLInputElement>(null);
  const fileInputRef2 = React.useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (slot === 1) {
        data.onChange({ photo1: reader.result as string });
      } else {
        data.onChange({ photo2: reader.result as string });
      }
    };
    reader.readAsDataURL(file);
  };

  const selectedStyle =
    RAP_STYLE_PRESETS.find((s) => s.id === data.styleId) || RAP_STYLE_PRESETS[0];

  return (
    <div className="w-80 rounded-2xl border border-amber-500/30 bg-[#0d1527]/95 p-4 text-white shadow-2xl backdrop-blur-xl transition-all hover:border-amber-400">
      {/* Node Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
            <Play className="size-4 fill-current" />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">Start Node</div>
            <div className="text-sm font-semibold">输入与题材设定</div>
          </div>
        </div>
        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
          Ready
        </span>
      </div>

      {/* Body */}
      <div className="mt-3 space-y-3 text-xs">
        {/* Topic Input */}
        <div>
          <label className="mb-1 block font-medium text-slate-300">主题 / 剧情梗概</label>
          <input
            type="text"
            value={data.topic}
            onChange={(e) => data.onChange({ topic: e.target.value })}
            placeholder="例如: 兄弟在橙色录音棚说唱互呛"
            className="w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
          />
        </div>

        {/* Style Preset */}
        <div>
          <label className="mb-1 block font-medium text-slate-300">音乐流派与氛围</label>
          <select
            value={data.styleId}
            onChange={(e) => {
              const matched = RAP_STYLE_PRESETS.find((s) => s.id === e.target.value);
              data.onChange({
                styleId: e.target.value,
                bpm: matched?.bpm || data.bpm,
              });
            }}
            className="w-full rounded-lg border border-white/15 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
          >
            {RAP_STYLE_PRESETS.map((s) => (
              <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                {s.name} ({s.enName}) · {s.bpm} BPM
              </option>
            ))}
          </select>
        </div>

        {/* Studio Mode & Photos */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="font-medium text-slate-300">说唱歌手人像</span>
            <div className="flex gap-1 rounded-md bg-white/5 p-0.5">
              <button
                type="button"
                onClick={() => data.onChange({ studioMode: 'solo' })}
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition ${
                  data.studioMode === 'solo' ? 'bg-amber-500 text-black' : 'text-slate-400'
                }`}
              >
                Solo 单人
              </button>
              <button
                type="button"
                onClick={() => data.onChange({ studioMode: 'duo' })}
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition ${
                  data.studioMode === 'duo' ? 'bg-amber-500 text-black' : 'text-slate-400'
                }`}
              >
                Duo 双人对决
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            {/* Photo 1 */}
            <div
              onClick={() => fileInputRef1.current?.click()}
              className="group relative flex h-20 flex-1 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-white/20 bg-white/[0.02] transition hover:border-amber-400 hover:bg-white/[0.06]"
            >
              {data.photo1 ? (
                <img src={data.photo1} alt="Rapper 1" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-slate-400">
                  <Upload className="size-4" />
                  <span className="text-[10px]">主唱 MC</span>
                </div>
              )}
              <input
                ref={fileInputRef1}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhotoUpload(e, 1)}
              />
            </div>

            {/* Photo 2 (Duo) */}
            {data.studioMode === 'duo' && (
              <div
                onClick={() => fileInputRef2.current?.click()}
                className="group relative flex h-20 flex-1 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-white/20 bg-white/[0.02] transition hover:border-amber-400 hover:bg-white/[0.06]"
              >
                {data.photo2 ? (
                  <img src={data.photo2} alt="Rapper 2" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-400">
                    <Upload className="size-4" />
                    <span className="text-[10px]">副唱 / 对手</span>
                  </div>
                )}
                <input
                  ref={fileInputRef2}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePhotoUpload(e, 2)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Output Port: Topic & Images */}
      <Handle
        type="source"
        position={Position.Right}
        id="prompt-out"
        className="!size-3.5 !bg-amber-400 !border-2 !border-[#0d1527] transition hover:scale-125"
      />
    </div>
  );
}

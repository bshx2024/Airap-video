import React, { useState, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Play, Sparkles, Upload, Users, Image as ImageIcon, Loader2, Wand2 } from 'lucide-react';
import { RAP_STYLE_PRESETS, HOMEPAGE_THEMES } from '@/config/rap-presets';
import { PROMPT_PRESETS } from './VideoNode';
import { NodeExecutionStatus } from '../types';

interface StartNodeData {
  topic: string;
  styleId: string;
  bpm: number;
  studioMode: 'duo' | 'solo';
  photo1: string;
  photo2?: string;
  photo1Gender?: 'male' | 'female';
  photo2Gender?: 'male' | 'female';
  status: NodeExecutionStatus;
  onChange: (updates: any) => void;
  onRunStep?: () => void;
}

/**
 * Client-side canvas image downscaling to prevent multi-megabyte base64 payloads
 * from crashing browser fetch or exceeding Cloudflare edge request limits.
 */
function compressImageToBlob(
  file: File,
  maxDimension = 1280,
  quality = 0.85
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas 2D context unavailable'));
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, dataUrl });
            } else {
              reject(new Error('Canvas toBlob failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('图片解析失败'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('读取本地图片失败'));
    reader.readAsDataURL(file);
  });
}

export function StartNode({ data }: { data: StartNodeData }) {
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  const [uploadingSlot, setUploadingSlot] = useState<1 | 2 | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSlot(slot);
    try {
      // 1. Client-side compression (reduces 10MB to ~150KB)
      const { blob, dataUrl } = await compressImageToBlob(file, 1280, 0.85);

      // 2. Upload to public CDN storage (/api/storage/upload-media)
      const formData = new FormData();
      const safeName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
      formData.append('files', blob, safeName);

      let finalUrl = dataUrl;
      try {
        const res = await fetch('/api/storage/upload-media', {
          method: 'POST',
          body: formData,
        });
        const json = await res.json().catch(() => ({}));
        if (json?.code === 0 && json?.data?.urls?.[0]) {
          finalUrl = json.data.urls[0];
        }
      } catch (uploadErr) {
        console.warn('Storage upload network error, fallback to compressed local image:', uploadErr);
      }

      const isFemaleKeyword = /(girl|woman|female|lady|her|she|nv|jie|mei|femme|chick|frau|donna)/i.test(file.name);
      const isMaleKeyword = /(boy|man|male|guy|his|he|nan|bro)/i.test(file.name);

      if (slot === 1) {
        const initialGender = isFemaleKeyword ? 'female' : (isMaleKeyword ? 'male' : (data.photo1Gender || 'male'));
        data.onChange({ photo1: finalUrl, rawPhoto1: dataUrl, processedPhoto1: '', photo1Gender: initialGender });
        fetch('/api/ai/workflow/detect-gender', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: finalUrl }),
        })
          .then((r) => r.json())
          .then((res) => {
            if (res?.data?.gender && !isFemaleKeyword && !isMaleKeyword) {
              data.onChange({ photo1Gender: res.data.gender });
            }
          })
          .catch(() => {});
      } else {
        const initialGender = isFemaleKeyword ? 'female' : (isMaleKeyword ? 'male' : (data.photo1Gender === 'male' ? 'female' : 'male'));
        data.onChange({ photo2: finalUrl, rawPhoto2: dataUrl, processedPhoto2: '', photo2Gender: initialGender });
        fetch('/api/ai/workflow/detect-gender', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: finalUrl }),
        })
          .then((r) => r.json())
          .then((res) => {
            if (res?.data?.gender && !isFemaleKeyword && !isMaleKeyword) {
              data.onChange({ photo2Gender: res.data.gender });
            }
          })
          .catch(() => {});
      }
    } catch (err) {
      console.error('Photo upload process failed:', err);
    } finally {
      setUploadingSlot(null);
      if (e.target) e.target.value = '';
    }
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
        {/* Topic Input with Homepage Theme Switcher */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="font-medium text-slate-300">主题 / 剧情梗概</label>
            <div className="flex items-center gap-1 text-[10px] text-amber-400 font-medium">
              <Sparkles className="size-3" />
              <span>预设主题联动</span>
            </div>
          </div>

          {/* Quick Theme Switcher Select */}
          <div className="mb-1.5">
            <select
              onChange={(e) => {
                const theme = HOMEPAGE_THEMES.find((t) => t.id === e.target.value);
                if (theme) {
                  const matchedStyle = RAP_STYLE_PRESETS.find((s) => s.id === theme.styleId);
                  data.onChange({
                    topic: theme.topic,
                    styleId: theme.styleId,
                    bpm: matchedStyle?.bpm || theme.bpm,
                    studioMode: theme.studioMode,
                    generatedLyrics: theme.lyrics,
                    videoPrompt: theme.videoPrompt,
                    generatedTitle: theme.name.replace(/^[^\w\u4e00-\u9fa5]+/, '').trim(),
                  });
                }
              }}
              defaultValue=""
              className="w-full rounded-lg border border-amber-500/40 bg-amber-950/40 px-2 py-1.5 text-[11px] font-semibold text-amber-300 focus:border-amber-400 focus:outline-none"
            >
              <option value="" disabled className="bg-slate-900 text-slate-400">
                ⚡ 快速载入首页 7 大精选主题...
              </option>
              {HOMEPAGE_THEMES.map((theme) => (
                <option key={theme.id} value={theme.id} className="bg-slate-900 text-white font-normal">
                  {theme.name} · {theme.tag}
                </option>
              ))}
            </select>
          </div>

          <textarea
            rows={2}
            value={data.topic}
            onChange={(e) => data.onChange({ topic: e.target.value })}
            placeholder="例如: 兄弟在橙色录音棚说唱互呛"
            className="w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none resize-none leading-relaxed"
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
                onClick={() => data.onChange({ studioMode: 'solo', videoPrompt: PROMPT_PRESETS.leftLead })}
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition ${
                  data.studioMode === 'solo' ? 'bg-amber-500 text-black' : 'text-slate-400'
                }`}
              >
                Solo 单人
              </button>
              <button
                type="button"
                onClick={() => data.onChange({ studioMode: 'duo', videoPrompt: PROMPT_PRESETS.dualLead })}
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition ${
                  data.studioMode === 'duo' ? 'bg-amber-500 text-black' : 'text-slate-400'
                }`}
              >
                Duo 双人对决
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            {/* Photo 1 Container */}
            <div className="flex flex-1 flex-col gap-1">
              <div
                onClick={() => !uploadingSlot && fileInputRef1.current?.click()}
                className="group relative flex h-20 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-white/20 bg-white/[0.02] transition hover:border-amber-400 hover:bg-white/[0.06]"
              >
                {uploadingSlot === 1 ? (
                  <div className="flex flex-col items-center gap-1.5 text-amber-400">
                    <Loader2 className="size-5 animate-spin" />
                    <span className="text-[10px] font-medium">上传中...</span>
                  </div>
                ) : data.photo1 ? (
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
                  disabled={uploadingSlot !== null}
                  onChange={(e) => handlePhotoUpload(e, 1)}
                />
              </div>

              {/* Explicit Gender Toggle 1 */}
              <div className="flex rounded-md bg-white/5 p-0.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => data.onChange({ photo1Gender: 'male' })}
                  className={`flex-1 py-0.5 text-center font-bold rounded transition cursor-pointer ${
                    (data.photo1Gender === 'male' || !data.photo1Gender)
                      ? 'bg-amber-500 text-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  👨 男声
                </button>
                <button
                  type="button"
                  onClick={() => data.onChange({ photo1Gender: 'female' })}
                  className={`flex-1 py-0.5 text-center font-bold rounded transition cursor-pointer ${
                    data.photo1Gender === 'female'
                      ? 'bg-rose-500 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  👩 女声
                </button>
              </div>
            </div>

            {/* Photo 2 Container (Duo) */}
            {data.studioMode === 'duo' && (
              <div className="flex flex-1 flex-col gap-1">
                <div
                  onClick={() => !uploadingSlot && fileInputRef2.current?.click()}
                  className="group relative flex h-20 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-white/20 bg-white/[0.02] transition hover:border-amber-400 hover:bg-white/[0.06]"
                >
                  {uploadingSlot === 2 ? (
                    <div className="flex flex-col items-center gap-1.5 text-amber-400">
                      <Loader2 className="size-5 animate-spin" />
                      <span className="text-[10px] font-medium">上传中...</span>
                    </div>
                  ) : data.photo2 ? (
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
                    disabled={uploadingSlot !== null}
                    onChange={(e) => handlePhotoUpload(e, 2)}
                  />
                </div>

                {/* Explicit Gender Toggle 2 */}
                <div className="flex rounded-md bg-white/5 p-0.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => data.onChange({ photo2Gender: 'male' })}
                    className={`flex-1 py-0.5 text-center font-bold rounded transition cursor-pointer ${
                      data.photo2Gender === 'male'
                        ? 'bg-amber-500 text-black shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    👨 男声
                  </button>
                  <button
                    type="button"
                    onClick={() => data.onChange({ photo2Gender: 'female' })}
                    className={`flex-1 py-0.5 text-center font-bold rounded transition cursor-pointer ${
                      (data.photo2Gender === 'female' || (!data.photo2Gender && data.photo1Gender === 'male'))
                        ? 'bg-rose-500 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    👩 女声
                  </button>
                </div>
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

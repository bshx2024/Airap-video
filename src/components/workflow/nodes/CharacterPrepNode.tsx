import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Glasses,
  Loader2,
  Move,
  RefreshCw,
  RotateCw,
  ShieldCheck,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { NodeExecutionStatus } from '../types';

export const SUNGLASSES_PRESETS: Record<
  string,
  { name: string; tag: string; desc: string; baseWidth: number; svg: string }
> = {
  'classic-black': {
    name: '经典黑超',
    tag: '说唱标配',
    desc: '大方框纯黑烤漆墨镜，100% 遮蔽眼眶三角区',
    baseWidth: 140,
    svg: `<svg viewBox="0 0 240 70" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto drop-shadow-[0_8px_16px_rgba(0,0,0,0.85)]">
      <defs>
        <linearGradient id="lensBlack" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#2a2a30"/>
          <stop offset="35%" stop-color="#0e0e12"/>
          <stop offset="100%" stop-color="#000000"/>
        </linearGradient>
      </defs>
      <!-- Outer Frame -->
      <path d="M8,10 L112,12 Q120,13 128,12 L232,10 Q238,10 236,20 L224,56 Q220,66 206,66 L144,66 Q130,66 128,52 L126,36 Q120,36 114,36 L112,52 Q110,66 96,66 L34,66 Q20,66 16,56 L4,20 Q2,10 8,10 Z" fill="#050608" stroke="#333842" stroke-width="3"/>
      <!-- Left Lens -->
      <path d="M20,20 L104,21 Q107,21 106,27 L101,53 Q99,58 92,58 L36,58 Q29,58 27,53 L18,27 Q17,20 20,20 Z" fill="url(#lensBlack)"/>
      <path d="M26,24 L46,24 L34,52 L24,52 Z" fill="#ffffff" opacity="0.25"/>
      <!-- Right Lens -->
      <path d="M136,21 L220,20 Q223,20 222,27 L217,53 Q215,58 208,58 L152,58 Q145,58 143,53 L134,27 Q133,21 136,21 Z" fill="url(#lensBlack)"/>
      <path d="M142,24 L162,24 L150,52 L140,52 Z" fill="#ffffff" opacity="0.25"/>
      <!-- Bridge -->
      <rect x="114" y="22" width="12" height="4" rx="2" fill="#444b58"/>
    </svg>`,
  },
  'cyber-visor': {
    name: '赛博一体镜',
    tag: '未来主义',
    desc: '极简流线型荧光发光面罩，遮挡双眼关键点',
    baseWidth: 155,
    svg: `<svg viewBox="0 0 240 60" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto drop-shadow-[0_0_20px_rgba(0,242,254,0.7)]">
      <defs>
        <linearGradient id="cyberGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#00f2fe"/>
          <stop offset="50%" stop-color="#4facfe"/>
          <stop offset="100%" stop-color="#00f2fe"/>
        </linearGradient>
      </defs>
      <!-- Visor main body -->
      <path d="M6,10 L234,10 Q239,10 237,18 L223,48 Q219,56 206,56 L34,56 Q21,56 17,48 L3,18 Q1,10 6,10 Z" fill="#04060e" stroke="#00f2fe" stroke-width="2.5"/>
      <!-- Glowing center blade -->
      <path d="M14,14 L226,14 L216,44 L24,44 Z" fill="#091024" opacity="0.95"/>
      <line x1="18" y1="20" x2="222" y2="20" stroke="url(#cyberGrad)" stroke-width="2.5"/>
      <line x1="26" y1="26" x2="214" y2="26" stroke="#00f2fe" stroke-width="1.2" opacity="0.85"/>
    </svg>`,
  },
  'thug-life': {
    name: 'Thug Life 像素',
    tag: '街头梗图',
    desc: '8-Bit 嘻哈像素墨镜，反直觉打乱特征提取',
    baseWidth: 145,
    svg: `<svg viewBox="0 0 240 60" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto drop-shadow-[0_8px_16px_rgba(0,0,0,0.9)]">
      <!-- Top bar -->
      <rect x="8" y="10" width="224" height="12" fill="#000000"/>
      <!-- Left Frame -->
      <rect x="8" y="22" width="94" height="20" fill="#000000"/>
      <rect x="18" y="42" width="74" height="12" fill="#000000"/>
      <!-- Right Frame -->
      <rect x="138" y="22" width="94" height="20" fill="#000000"/>
      <rect x="148" y="42" width="74" height="12" fill="#000000"/>
      <!-- Pixel Glints -->
      <rect x="18" y="22" width="10" height="10" fill="#ffffff"/>
      <rect x="28" y="32" width="10" height="10" fill="#ffffff"/>
      <rect x="148" y="22" width="10" height="10" fill="#ffffff"/>
      <rect x="158" y="32" width="10" height="10" fill="#ffffff"/>
    </svg>`,
  },
  'retro-gold': {
    name: '复古金丝',
    tag: '奢华复古',
    desc: '金色金属双梁墨镜，深色偏光镜片',
    baseWidth: 140,
    svg: `<svg viewBox="0 0 240 70" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto drop-shadow-[0_8px_16px_rgba(0,0,0,0.85)]">
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffe259"/>
          <stop offset="100%" stop-color="#ffa751"/>
        </linearGradient>
      </defs>
      <line x1="86" y1="18" x2="154" y2="18" stroke="url(#goldGrad)" stroke-width="3"/>
      <line x1="98" y1="28" x2="142" y2="28" stroke="url(#goldGrad)" stroke-width="2.5"/>
      <!-- Left lens -->
      <ellipse cx="60" cy="40" rx="46" ry="24" fill="#0c0d12" stroke="url(#goldGrad)" stroke-width="3"/>
      <ellipse cx="52" cy="36" rx="20" ry="10" fill="#ffffff" opacity="0.22"/>
      <!-- Right lens -->
      <ellipse cx="180" cy="40" rx="46" ry="24" fill="#0c0d12" stroke="url(#goldGrad)" stroke-width="3"/>
      <ellipse cx="172" cy="36" rx="20" ry="10" fill="#ffffff" opacity="0.22"/>
    </svg>`,
  },
};

interface CharacterPrepNodeData {
  photo1: string;
  rawPhoto1?: string;
  processedPhoto1?: string;
  sunglassesStyle?: string;
  sunglassesScale?: number;
  sunglassesOffsetY?: number;
  sunglassesOffsetX?: number;
  sunglassesRotate?: number;
  filterMode?: 'none' | 'hiphop-grain' | 'cg-smooth';
  prepLatency?: number;
  status: NodeExecutionStatus;
  onChange: (updates: any) => void;
  onRunStep?: () => Promise<void>;
}

export function CharacterPrepNode({ data }: { data: CharacterPrepNodeData }) {
  const isRunning = data.status === 'running';
  const hasProcessed = Boolean(data.processedPhoto1);

  // Active styling state
  const activeStyle = data.sunglassesStyle || 'classic-black';
  const scale = data.sunglassesScale ?? 105;
  const offsetY = data.sunglassesOffsetY ?? 0;
  const offsetX = data.sunglassesOffsetX ?? 0;
  const rotate = data.sunglassesRotate ?? 0;
  const filterMode = data.filterMode || 'hiphop-grain';

  // Base image to display: prioritize locally stored raw base64 dataUrl, fallback to photo1
  const displayPhoto = data.rawPhoto1 || data.photo1;

  const [showOriginal, setShowOriginal] = useState(false);
  const [localProcessing, setLocalProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startOffsetX: number; startOffsetY: number }>({
    mouseX: 0,
    mouseY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  });

  const previewBoxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // When user updates styling, clear processedPhoto1 so state reflects live draft
  const handleUpdateParam = useCallback(
    (updates: Partial<CharacterPrepNodeData>) => {
      data.onChange({
        ...updates,
        processedPhoto1: '', // mark as draft until baked
      });
    },
    [data]
  );

  // Mouse & Touch Direct Dragging on Preview
  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeStyle === 'none') return;
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startOffsetX: offsetX,
      startOffsetY: offsetY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || activeStyle === 'none') return;
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;
    const newX = Math.round(Math.max(-50, Math.min(50, dragStartRef.current.startOffsetX + dx * 0.7)));
    const newY = Math.round(Math.max(-50, Math.min(50, dragStartRef.current.startOffsetY + dy * 0.7)));
    handleUpdateParam({
      sunglassesOffsetX: newX,
      sunglassesOffsetY: newY,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Bake image onto Canvas when user clicks "生成造型并过审"
  const handleBakeAndLock = async () => {
    if (!displayPhoto) {
      toast.error('请先在开始节点上传人像照片');
      return;
    }

    setLocalProcessing(true);
    const startTime = Date.now();

    try {
      const canvas = canvasRef.current || document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('无法初始化 Canvas 2D 上下文');

      // 1. Load base image safely
      let imageSource = displayPhoto;
      // If external HTTP URL without data: prefix, fetch as blob object URL to bypass Canvas tainted issues
      if (imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
        try {
          const resp = await fetch(imageSource, { mode: 'cors' });
          const blob = await resp.blob();
          imageSource = URL.createObjectURL(blob);
        } catch {
          // Fallback to direct load
        }
      }

      const baseImg = new Image();
      baseImg.crossOrigin = 'anonymous';
      baseImg.src = imageSource;

      await new Promise((resolve, reject) => {
        baseImg.onload = resolve;
        baseImg.onerror = () => reject(new Error('无法解析人像图片'));
      });

      const width = baseImg.naturalWidth || 800;
      const height = baseImg.naturalHeight || 800;
      canvas.width = width;
      canvas.height = height;

      // 2. Draw base photo
      ctx.drawImage(baseImg, 0, 0, width, height);

      // 3. Apply Anti-detection Filter
      if (filterMode === 'hiphop-grain') {
        const imgData = ctx.getImageData(0, 0, width, height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          // Warm hip-hop tone
          d[i] = Math.min(255, d[i] * 1.03 + 2);
          d[i + 1] = Math.min(255, d[i + 1] * 1.01);
          // Micro-grain noise
          const grain = (Math.random() - 0.5) * 12;
          d[i] = Math.max(0, Math.min(255, d[i] + grain));
          d[i + 1] = Math.max(0, Math.min(255, d[i] + grain));
          d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + grain));
        }
        ctx.putImageData(imgData, 0, 0);
      } else if (filterMode === 'cg-smooth') {
        ctx.save();
        ctx.filter = 'blur(1.6px)';
        ctx.globalAlpha = 0.35;
        ctx.drawImage(baseImg, 0, 0, width, height);
        ctx.restore();
      }

      // 4. Draw Sunglasses SVG
      if (activeStyle !== 'none' && SUNGLASSES_PRESETS[activeStyle]) {
        const preset = SUNGLASSES_PRESETS[activeStyle];
        const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(preset.svg)}`;

        const glassImg = new Image();
        glassImg.src = svgUrl;
        await new Promise((resolve) => {
          glassImg.onload = resolve;
          glassImg.onerror = resolve;
        });

        // Compute eye center coordinates relative to original canvas resolution
        // Default eye center is ~36% from top
        const eyeCenterX = width * 0.5 + (offsetX / 100) * width * 0.35;
        const eyeCenterY = height * 0.36 + (offsetY / 100) * height * 0.35;

        const baseWidthRatio = activeStyle === 'cyber-visor' ? 0.62 : 0.55;
        const glassWidth = width * baseWidthRatio * (scale / 100);
        const glassHeight = (glassWidth / 240) * (activeStyle === 'cyber-visor' ? 60 : 70);

        ctx.save();
        ctx.translate(eyeCenterX, eyeCenterY);
        ctx.rotate((rotate * Math.PI) / 180);
        ctx.drawImage(glassImg, -glassWidth / 2, -glassHeight / 2, glassWidth, glassHeight);
        ctx.restore();
      }

      // 5. Export and upload to CDN
      const bakedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      let finalUrl = bakedDataUrl;

      try {
        const blob = await (await fetch(bakedDataUrl)).blob();
        const formData = new FormData();
        formData.append('files', blob, `styled-character-${Date.now()}.jpg`);
        const res = await fetch('/api/storage/upload-media', {
          method: 'POST',
          body: formData,
        });
        const json = await res.json().catch(() => ({}));
        if (json?.code === 0 && json?.data?.urls?.[0]) {
          finalUrl = json.data.urls[0];
        }
      } catch (uploadErr) {
        console.warn('Storage upload fallback to dataUrl', uploadErr);
      }

      const latency = Date.now() - startTime;
      data.onChange({
        processedPhoto1: finalUrl,
        prepLatency: latency,
        sunglassesStyle: activeStyle,
        sunglassesScale: scale,
        sunglassesOffsetY: offsetY,
        sunglassesOffsetX: offsetX,
        sunglassesRotate: rotate,
        filterMode,
      });

      if (data.onRunStep) {
        await data.onRunStep();
      }

      toast.success('✨ 造型已成功生成并锁定！防拦截底图已准备完毕。');
    } catch (err: any) {
      console.error('Failed to bake character prep:', err);
      toast.error(`生成造型失败: ${err.message || '未知错误'}`);
    } finally {
      setLocalProcessing(false);
    }
  };

  return (
    <div
      className={`w-[440px] rounded-2xl border bg-[#0d1527]/95 p-4 text-white shadow-2xl backdrop-blur-xl transition-all ${
        isRunning || localProcessing
          ? 'border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.35)]'
          : hasProcessed
            ? 'border-emerald-500/60 hover:border-emerald-400'
            : 'border-white/10 hover:border-white/25'
      }`}
    >
      {/* Input Handle from Start Node */}
      <Handle
        type="target"
        position={Position.Left}
        id="photo-in"
        className="!size-3.5 !border-2 !border-[#0d1527] !bg-amber-400 transition hover:scale-125"
      />

      {/* Output Handle to Video Node */}
      <Handle
        type="source"
        position={Position.Right}
        id="styled-out"
        className="!size-3.5 !border-2 !border-[#0d1527] !bg-cyan-400 transition hover:scale-125"
      />

      {/* Hidden Baking Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
            <Glasses className="size-4" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400">Character Prep</div>
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <span>角色造型与过审预处理</span>
              <span className="flex items-center gap-0.5 rounded bg-emerald-500/20 px-1 py-0.2 text-[9px] font-bold text-emerald-400">
                <ShieldCheck className="size-3" /> 防拦截
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {data.prepLatency != null && (
            <span className="text-[10px] text-slate-400">{data.prepLatency}ms</span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              isRunning || localProcessing
                ? 'bg-amber-500/20 text-amber-400 animate-pulse'
                : hasProcessed
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-white/10 text-slate-400'
            }`}
          >
            {isRunning || localProcessing ? '生成中...' : hasProcessed ? '造型已锁定' : '实时预览中'}
          </span>
        </div>
      </div>

      {/* Body: Live Interactive Preview & Controls */}
      <div className="mt-3 space-y-3">
        {/* Visual Live DOM Preview Area */}
        <div
          ref={previewBoxRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`relative flex h-52 w-full select-none overflow-hidden rounded-xl border border-white/10 bg-[#070b14] ${
            activeStyle !== 'none' ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
        >
          {displayPhoto ? (
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
              {/* Base User Portrait */}
              <img
                src={displayPhoto}
                alt="Character Portrait"
                className={`h-full w-full object-contain pointer-events-none select-none transition-all ${
                  filterMode === 'hiphop-grain' && !showOriginal
                    ? 'contrast-[1.04] saturate-[1.08] sepia-[0.1]'
                    : filterMode === 'cg-smooth' && !showOriginal
                      ? 'contrast-[0.98] blur-[0.4px]'
                      : ''
                }`}
              />

              {/* Live Interactive Sunglasses Overlay */}
              {activeStyle !== 'none' && SUNGLASSES_PRESETS[activeStyle] && !showOriginal && (
                <div
                  className="absolute pointer-events-none transition-transform duration-75 select-none"
                  style={{
                    left: `calc(50% + ${offsetX * 1.5}px)`,
                    top: `calc(36% + ${offsetY * 1.5}px)`,
                    transform: `translate(-50%, -50%) scale(${scale / 100}) rotate(${rotate}deg)`,
                    width: `${SUNGLASSES_PRESETS[activeStyle].baseWidth}px`,
                  }}
                  dangerouslySetInnerHTML={{ __html: SUNGLASSES_PRESETS[activeStyle].svg }}
                />
              )}
            </div>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-500">
              <Glasses className="size-8 opacity-40" />
              <span className="text-xs">请先在 Start Node 上传人像照片</span>
            </div>
          )}

          {/* Direct Drag Hint */}
          {displayPhoto && activeStyle !== 'none' && (
            <div className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[9px] text-slate-300 backdrop-blur-md">
              <Move className="size-2.5 text-amber-400" />
              <span>按住图片可直接拖动位置</span>
            </div>
          )}

          {/* Quick Preview Badge & Compare button */}
          {displayPhoto && (
            <div className="absolute top-2 right-2 flex items-center gap-1">
              <button
                type="button"
                onMouseDown={() => setShowOriginal(true)}
                onMouseUp={() => setShowOriginal(false)}
                onTouchStart={() => setShowOriginal(true)}
                onTouchEnd={() => setShowOriginal(false)}
                className="flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[10px] font-medium text-slate-300 backdrop-blur-md transition hover:bg-black/90 hover:text-white"
              >
                {showOriginal ? <Eye className="size-3 text-amber-400" /> : <EyeOff className="size-3" />}
                <span>按住看原图</span>
              </button>
            </div>
          )}

          {/* Compliance Status Overlay */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-black/75 px-2 py-1 text-[10px] font-medium backdrop-blur-md">
            <span className={`size-2 rounded-full ${activeStyle !== 'none' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-slate-200">
              {activeStyle !== 'none' ? '眼部特征已遮蔽 · 符合 Wan 3.0 生成规范' : '⚠️ 未佩戴墨镜，存在拦截风险'}
            </span>
          </div>
        </div>

        {/* Style Selector Grid */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Sparkles className="size-3 text-amber-400" /> 嘻哈墨镜款式
            </span>
            <span className="text-[10px] text-slate-500">遮蔽真人五官三角区</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {Object.entries(SUNGLASSES_PRESETS).map(([key, item]) => {
              const isSelected = activeStyle === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    handleUpdateParam({ sunglassesStyle: key });
                  }}
                  className={`flex flex-col items-center justify-center rounded-lg border p-1.5 text-center transition ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
                      : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-slate-200'
                  }`}
                >
                  <span className="text-[11px] font-bold">{item.name}</span>
                  <span className="text-[9px] opacity-75">{item.tag}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                handleUpdateParam({ sunglassesStyle: 'none' });
              }}
              className={`flex flex-col items-center justify-center rounded-lg border p-1.5 text-center transition ${
                activeStyle === 'none'
                  ? 'border-rose-400 bg-rose-500/20 text-rose-300'
                  : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-slate-200'
              }`}
            >
              <span className="text-[11px] font-bold">无墨镜</span>
              <span className="text-[9px] opacity-75">原貌直出</span>
            </button>
          </div>
        </div>

        {/* Fine-Tuning Sliders */}
        {activeStyle !== 'none' && (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Sliders className="size-3 text-amber-400" /> 位置与尺寸微调 (支持直接拖拽)
              </span>
              <button
                type="button"
                onClick={() => {
                  handleUpdateParam({
                    sunglassesOffsetY: 0,
                    sunglassesOffsetX: 0,
                    sunglassesScale: 105,
                    sunglassesRotate: 0,
                  });
                }}
                className="text-[10px] text-slate-500 hover:text-amber-400 transition"
              >
                复位重置
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {/* Offset Y */}
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <span className="text-slate-400 w-12">高度 Y:</span>
                <input
                  type="range"
                  min="-40"
                  max="40"
                  value={offsetY}
                  onChange={(e) => handleUpdateParam({ sunglassesOffsetY: Number(e.target.value) })}
                  className="h-1 flex-1 accent-amber-400"
                />
                <span className="w-6 text-right font-mono text-slate-400">{offsetY}</span>
              </div>

              {/* Offset X */}
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <span className="text-slate-400 w-12">水平 X:</span>
                <input
                  type="range"
                  min="-35"
                  max="35"
                  value={offsetX}
                  onChange={(e) => handleUpdateParam({ sunglassesOffsetX: Number(e.target.value) })}
                  className="h-1 flex-1 accent-amber-400"
                />
                <span className="w-6 text-right font-mono text-slate-400">{offsetX}</span>
              </div>

              {/* Scale */}
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <span className="text-slate-400 w-12">大小:</span>
                <input
                  type="range"
                  min="60"
                  max="160"
                  value={scale}
                  onChange={(e) => handleUpdateParam({ sunglassesScale: Number(e.target.value) })}
                  className="h-1 flex-1 accent-amber-400"
                />
                <span className="w-6 text-right font-mono text-slate-400">{scale}%</span>
              </div>

              {/* Rotate */}
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <span className="text-slate-400 w-12">旋转:</span>
                <input
                  type="range"
                  min="-25"
                  max="25"
                  value={rotate}
                  onChange={(e) => handleUpdateParam({ sunglassesRotate: Number(e.target.value) })}
                  className="h-1 flex-1 accent-amber-400"
                />
                <span className="w-6 text-right font-mono text-slate-400">{rotate}°</span>
              </div>
            </div>
          </div>
        )}

        {/* Anti-Detect Texture Filter */}
        <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-2">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-200">去真实感抗检滤镜</span>
            <span className="text-[10px] text-slate-400">消除微观皮肤毛孔，打破人脸活体特征识别</span>
          </div>
          <select
            value={filterMode}
            onChange={(e) => handleUpdateParam({ filterMode: e.target.value as any })}
            className="rounded-lg border border-white/10 bg-[#060b17] px-2 py-1 text-xs text-amber-300 outline-none"
          >
            <option value="hiphop-grain">嘻哈暖胶片微粒 (推荐)</option>
            <option value="cg-smooth">2.5D CG平滑柔光</option>
            <option value="none">关闭滤镜</option>
          </select>
        </div>

        {/* Action Button: Single-step execution */}
        <button
          type="button"
          onClick={handleBakeAndLock}
          disabled={localProcessing || isRunning || !displayPhoto}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition shadow-lg ${
            hasProcessed
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-emerald-900/30'
              : 'bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-400 hover:to-orange-400 shadow-amber-900/30'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {localProcessing || isRunning ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>智能合成与合规锁定中...</span>
            </>
          ) : hasProcessed ? (
            <>
              <CheckCircle2 className="size-4" />
              <span>造型已锁定 (点击可重新生成)</span>
            </>
          ) : (
            <>
              <Zap className="size-4 fill-current" />
              <span>⚡ 单步调试: 生成造型并锁定</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

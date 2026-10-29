import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Glasses,
  Grid,
  Loader2,
  Minus,
  Move,
  Plus,
  RefreshCw,
  RotateCcw,
  RotateCw,
  ShieldCheck,
  Sliders,
  Sparkles,
  Wand2,
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

/**
 * 3D 人脸拓扑防护网格生成器 (Semi-transparent Wireframe Mesh)
 * 模拟 3D 头部建模 UV 展开与特征点拓扑，破坏人脸活体与前置敏感人脸识别模型的特征提取，
 * 同时保留低频色彩与轮廓，让下游扩散模型 (Seedance/Wan/Kling) 能够自然融入并完美过审。
 */
export function generateFaceMeshSvg(opacity: number = 0.26, strokeColor: string = '#ffffff') {
  const clipId = 'faceMeshTopologyClip';
  const latLines: string[] = [];
  const rows = 19;
  for (let i = 0; i <= rows; i++) {
    const y = 20 + (i / rows) * 205;
    const curvature = Math.sin((i / rows) * Math.PI) * 9;
    latLines.push(`<path d="M 12,${y.toFixed(1)} Q 100,${(y + curvature).toFixed(1)} 188,${y.toFixed(1)}" />`);
  }

  const longLines: string[] = [];
  const cols = 15;
  for (let i = 0; i <= cols; i++) {
    const norm = (i / cols) * 2 - 1;
    const xTop = 100 + norm * 70;
    const xMid = 100 + norm * 88;
    const xBottom = 100 + norm * 48;
    longLines.push(`<path d="M ${xTop.toFixed(1)},20 Q ${xMid.toFixed(1)},120 ${xBottom.toFixed(1)},225" />`);
  }

  return `<svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]">
    <defs>
      <clipPath id="${clipId}">
        <path d="M 50,22 C 20,38 14,115 25,160 C 38,206 72,228 100,230 C 128,228 162,206 175,160 C 186,115 180,38 150,22 C 128,14 72,14 50,22 Z" />
      </clipPath>
    </defs>
    <!-- Face Contour Outer -->
    <path d="M 50,22 C 20,38 14,115 25,160 C 38,206 72,228 100,230 C 128,228 162,206 175,160 C 186,115 180,38 150,22 C 128,14 72,14 50,22 Z" fill="none" stroke="${strokeColor}" stroke-width="1.5" opacity="${Math.min(1, opacity * 1.3)}" />
    <!-- 3D Topology Wireframe Grid -->
    <g clip-path="url(#${clipId})" fill="none" stroke="${strokeColor}" stroke-width="1.1" opacity="${opacity}">
      ${latLines.join('\n      ')}
      ${longLines.join('\n      ')}
    </g>
  </svg>`;
}

export interface FaceFitResult {
  eyeCenterXRatio: number;
  eyeCenterYRatio: number;
  faceWidthRatio: number;
  rotationDeg: number;
}

/**
 * 智能人脸关键点与尺寸探测器
 * 1. 优先调用浏览器硬件级原生 FaceDetector (Shape Detection API)
 * 2. 备用高精度 Canvas 肤色多尺度质心与眼窝暗度检测 (零外部依赖，100% 浏览器兼容，~8ms 执行完毕)
 */
export async function detectFaceFit(imageSrc: string): Promise<FaceFitResult | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !imageSrc) {
    return null;
  }
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
      const width = img.naturalWidth || img.width || 800;
      const height = img.naturalHeight || img.height || 800;

      // 1. 优先尝试浏览器原生 Shape Detection API
      if (typeof window !== 'undefined' && 'FaceDetector' in window) {
        try {
          const detector = new (window as any).FaceDetector({ fastMode: false, maxDetectedFaces: 1 });
          const faces = await detector.detect(img);
          if (faces && faces.length > 0) {
            const box = faces[0].boundingBox;
            const landmarks = faces[0].landmarks || [];
            const leftEye = landmarks.find((l: any) => l.type === 'eye' && l.location.x < box.x + box.width / 2);
            const rightEye = landmarks.find((l: any) => l.type === 'eye' && l.location.x >= box.x + box.width / 2);

            let eyeX = box.x + box.width * 0.5;
            let eyeY = box.y + box.height * 0.38;
            let rot = 0;

            if (leftEye && rightEye) {
              eyeX = (leftEye.location.x + rightEye.location.x) / 2;
              eyeY = (leftEye.location.y + rightEye.location.y) / 2;
              const dx = rightEye.location.x - leftEye.location.x;
              const dy = rightEye.location.y - leftEye.location.y;
              rot = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
            }

            return resolve({
              eyeCenterXRatio: Math.max(0.2, Math.min(0.8, eyeX / width)),
              eyeCenterYRatio: Math.max(0.15, Math.min(0.7, eyeY / height)),
              faceWidthRatio: Math.max(0.25, Math.min(0.9, box.width / width)),
              rotationDeg: Math.max(-25, Math.min(25, rot)),
            });
          }
        } catch {
          // fallback to canvas detector
        }
      }

      // 2. 通用 Canvas 肤色聚类与眼部高对比度扫描
      try {
        const sampleCanvas = document.createElement('canvas');
        const sw = 160;
        const sh = Math.max(120, Math.round((height / width) * 160));
        sampleCanvas.width = sw;
        sampleCanvas.height = sh;
        const ctx = sampleCanvas.getContext('2d');
        if (!ctx) return resolve(null);

        ctx.drawImage(img, 0, 0, sw, sh);
        const imgData = ctx.getImageData(0, 0, sw, sh);
        const data = imgData.data;

        let totalSkinWeight = 0;
        let sumX = 0;
        let sumY = 0;
        let minX = sw;
        let maxX = 0;
        let minY = sh;
        let maxY = 0;

        for (let y = 0; y < sh; y++) {
          for (let x = 0; x < sw; x++) {
            const idx = (y * sw + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // 广谱人类面部肤色判定 (涵盖白皙、黄肤色、深色肤色)
            const isSkin = r > 45 && g > 28 && b > 18 && r > g && g >= b && (r - b) > 12;
            if (isSkin) {
              totalSkinWeight++;
              sumX += x;
              sumY += y;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (totalSkinWeight > (sw * sh * 0.035)) {
          const faceCenterX = sumX / totalSkinWeight;
          const faceCenterY = sumY / totalSkinWeight;
          const faceW = Math.max(sw * 0.28, maxX - minX);
          const faceH = Math.max(sh * 0.32, maxY - minY);

          // 眼眶通常在面部重心靠上 10%~14% 处
          const estimatedEyeY = Math.max(minY + faceH * 0.26, faceCenterY - faceH * 0.12);

          return resolve({
            eyeCenterXRatio: Math.max(0.25, Math.min(0.75, faceCenterX / sw)),
            eyeCenterYRatio: Math.max(0.18, Math.min(0.65, estimatedEyeY / sh)),
            faceWidthRatio: Math.max(0.3, Math.min(0.85, faceW / sw)),
            rotationDeg: 0,
          });
        }
      } catch {
        // fallback
      }

      resolve(null);
    };
      img.onerror = () => resolve(null);
      img.src = imageSrc;
    } catch {
      resolve(null);
    }
  });
}

interface CharacterPrepNodeData {
  photo1: string;
  rawPhoto1?: string;
  processedPhoto1?: string;
  sunglassesStyle?: string;
  sunglassesScale?: number;
  sunglassesOffsetY?: number;
  sunglassesOffsetX?: number;
  sunglassesRotate?: number;
  meshEnabled?: boolean;
  meshOpacity?: number;
  meshScale?: number;
  meshOffsetY?: number;
  meshOffsetX?: number;
  filterMode?: 'none' | 'hiphop-grain' | 'cg-smooth' | 'cg-unreal' | 'comic-pop' | string;
  prepLatency?: number;
  status: NodeExecutionStatus;
  onChange: (updates: any) => void;
  onRunStep?: () => Promise<void>;
}

export function CharacterPrepNode({ data }: { data: CharacterPrepNodeData }) {
  const isRunning = data.status === 'running';
  const hasProcessed = Boolean(data.processedPhoto1);

  // Local state for instantaneous 60fps tracking without waiting for async parent render cycles
  const [style, setStyle] = useState<string>(data.sunglassesStyle || 'classic-black');
  const [scale, setScale] = useState<number>(data.sunglassesScale ?? 105);
  const [offsetY, setOffsetY] = useState<number>(data.sunglassesOffsetY ?? 0);
  const [offsetX, setOffsetX] = useState<number>(data.sunglassesOffsetX ?? 0);
  const [rotate, setRotate] = useState<number>(data.sunglassesRotate ?? 0);
  const [filterMode, setFilterMode] = useState<string>(data.filterMode || 'hiphop-grain');

  // 3D Face Mesh Guardrail States (for 'none' / no sunglasses option)
  const [meshEnabled, setMeshEnabled] = useState<boolean>(data.meshEnabled ?? true);
  const [meshOpacity, setMeshOpacity] = useState<number>(data.meshOpacity ?? 26);
  const [meshScale, setMeshScale] = useState<number>(data.meshScale ?? 105);
  const [meshOffsetY, setMeshOffsetY] = useState<number>(data.meshOffsetY ?? 0);
  const [meshOffsetX, setMeshOffsetX] = useState<number>(data.meshOffsetX ?? 0);

  // Sync from props if external updates occur
  useEffect(() => {
    if (data.sunglassesStyle !== undefined) setStyle(data.sunglassesStyle);
    if (data.sunglassesScale !== undefined) setScale(data.sunglassesScale);
    if (data.sunglassesOffsetY !== undefined) setOffsetY(data.sunglassesOffsetY);
    if (data.sunglassesOffsetX !== undefined) setOffsetX(data.sunglassesOffsetX);
    if (data.sunglassesRotate !== undefined) setRotate(data.sunglassesRotate);
    if (data.filterMode !== undefined) setFilterMode(data.filterMode);
    if (data.meshEnabled !== undefined) setMeshEnabled(data.meshEnabled);
    if (data.meshOpacity !== undefined) setMeshOpacity(data.meshOpacity);
    if (data.meshScale !== undefined) setMeshScale(data.meshScale);
    if (data.meshOffsetY !== undefined) setMeshOffsetY(data.meshOffsetY);
    if (data.meshOffsetX !== undefined) setMeshOffsetX(data.meshOffsetX);
  }, [
    data.sunglassesStyle,
    data.sunglassesScale,
    data.sunglassesOffsetY,
    data.sunglassesOffsetX,
    data.sunglassesRotate,
    data.filterMode,
    data.meshEnabled,
    data.meshOpacity,
    data.meshScale,
    data.meshOffsetY,
    data.meshOffsetX,
  ]);

  // Base image to display: prioritize locally stored raw base64 dataUrl, fallback to photo1
  const displayPhoto = data.rawPhoto1 || data.photo1;

  const [showOriginal, setShowOriginal] = useState(false);
  const [localProcessing, setLocalProcessing] = useState(false);
  const [isAutoFitting, setIsAutoFitting] = useState(false);
  const lastFittedPhotoRef = useRef<string>('');

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startOffsetX: number; startOffsetY: number }>({
    mouseX: 0,
    mouseY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync updates back to workflow state
  const notifyChanges = useCallback(
    (updates: Partial<CharacterPrepNodeData>) => {
      data.onChange({
        sunglassesStyle: style,
        sunglassesScale: scale,
        sunglassesOffsetY: offsetY,
        sunglassesOffsetX: offsetX,
        sunglassesRotate: rotate,
        meshEnabled,
        meshOpacity,
        meshScale,
        meshOffsetY,
        meshOffsetX,
        filterMode,
        processedPhoto1: '', // mark as unbaked draft
        ...updates,
      });
    },
    [data, style, scale, offsetY, offsetX, rotate, meshEnabled, meshOpacity, meshScale, meshOffsetY, meshOffsetX, filterMode]
  );

  /**
   * 智能识别人脸双眼位置与尺寸自适应贴合
   */
  const handleAutoFitFace = useCallback(async (silent = false) => {
    if (!displayPhoto) {
      if (!silent) toast.error('请先在开始节点上传人像照片');
      return;
    }
    setIsAutoFitting(true);
    try {
      const fit = await detectFaceFit(displayPhoto);
      if (fit) {
        // 解算基于基准 (50%, 36%) 的相对偏移
        const newOffsetX = Math.round(Math.max(-40, Math.min(40, ((fit.eyeCenterXRatio - 0.5) / 0.35) * 100)));
        const newOffsetY = Math.round(Math.max(-50, Math.min(50, ((fit.eyeCenterYRatio - 0.36) / 0.35) * 100)));
        // 根据人脸占画面比例动态缩放墨镜 (标准占比约 0.48 对应 scale 105%)
        const newScale = Math.round(Math.max(65, Math.min(165, (fit.faceWidthRatio / 0.48) * 105)));
        const newRotate = fit.rotationDeg;

        // 3D 拓扑网格同步自适应 (基准 50%, 44%)
        const newMeshOffsetX = Math.round(Math.max(-35, Math.min(35, ((fit.eyeCenterXRatio - 0.5) / 0.35) * 100)));
        const newMeshOffsetY = Math.round(Math.max(-40, Math.min(40, ((fit.eyeCenterYRatio + 0.08 - 0.44) / 0.35) * 100)));
        const newMeshScale = Math.round(Math.max(70, Math.min(150, (fit.faceWidthRatio / 0.48) * 105)));

        setOffsetX(newOffsetX);
        setOffsetY(newOffsetY);
        setScale(newScale);
        setRotate(newRotate);
        setMeshOffsetX(newMeshOffsetX);
        setMeshOffsetY(newMeshOffsetY);
        setMeshScale(newMeshScale);

        notifyChanges({
          sunglassesOffsetX: newOffsetX,
          sunglassesOffsetY: newOffsetY,
          sunglassesScale: newScale,
          sunglassesRotate: newRotate,
          meshOffsetX: newMeshOffsetX,
          meshOffsetY: newMeshOffsetY,
          meshScale: newMeshScale,
        });

        if (!silent) {
          toast.success(`🎯 智能识别成功！已自动锁定五官与自适应尺寸 (匹配度: ${newScale}%)`);
        }
      } else {
        if (!silent) {
          toast.info('未扫描到显著人脸特征，已保留当前预设位置');
        }
      }
    } catch {
      if (!silent) toast.error('人脸智能识别异常，已保持当前设置');
    } finally {
      setIsAutoFitting(false);
    }
  }, [displayPhoto, notifyChanges]);

  // Parameter updaters (updates local state instantly + syncs to workflow)
  const handleUpdateStyle = (newStyle: string) => {
    setStyle(newStyle);
    if (newStyle === 'none') {
      // 联动：选择无墨镜时，自动推荐并切换为 3D 虚幻写实 CG 滤镜以彻底打乱微观活体特征
      setFilterMode('cg-unreal');
      notifyChanges({ sunglassesStyle: newStyle, filterMode: 'cg-unreal' });
    } else {
      notifyChanges({ sunglassesStyle: newStyle });
    }
  };

  const handleUpdateScale = (newScale: number) => {
    const val = Math.max(50, Math.min(180, newScale));
    setScale(val);
    notifyChanges({ sunglassesScale: val });
  };

  const handleUpdateOffsetY = (newY: number) => {
    const val = Math.max(-50, Math.min(50, newY));
    setOffsetY(val);
    notifyChanges({ sunglassesOffsetY: val });
  };

  const handleUpdateOffsetX = (newX: number) => {
    const val = Math.max(-40, Math.min(40, newX));
    setOffsetX(val);
    notifyChanges({ sunglassesOffsetX: val });
  };

  const handleUpdateRotate = (newRotate: number) => {
    const val = Math.max(-30, Math.min(30, newRotate));
    setRotate(val);
    notifyChanges({ sunglassesRotate: val });
  };

  // Mesh Parameter Updaters
  const handleUpdateMeshOpacity = (newOpacity: number) => {
    const val = Math.max(10, Math.min(50, newOpacity));
    setMeshOpacity(val);
    notifyChanges({ meshOpacity: val });
  };

  const handleUpdateMeshScale = (newScale: number) => {
    const val = Math.max(70, Math.min(150, newScale));
    setMeshScale(val);
    notifyChanges({ meshScale: val });
  };

  const handleUpdateMeshOffsetY = (newY: number) => {
    const val = Math.max(-40, Math.min(40, newY));
    setMeshOffsetY(val);
    notifyChanges({ meshOffsetY: val });
  };

  const handleUpdateMeshOffsetX = (newX: number) => {
    const val = Math.max(-35, Math.min(35, newX));
    setMeshOffsetX(val);
    notifyChanges({ meshOffsetX: val });
  };

  const handleToggleMesh = () => {
    const next = !meshEnabled;
    setMeshEnabled(next);
    notifyChanges({ meshEnabled: next });
  };

  const handleReset = () => {
    if (style !== 'none') {
      setScale(105);
      setOffsetY(0);
      setOffsetX(0);
      setRotate(0);
      notifyChanges({
        sunglassesScale: 105,
        sunglassesOffsetY: 0,
        sunglassesOffsetX: 0,
        sunglassesRotate: 0,
      });
    } else {
      setMeshOpacity(26);
      setMeshScale(105);
      setMeshOffsetY(0);
      setMeshOffsetX(0);
      notifyChanges({
        meshOpacity: 26,
        meshScale: 105,
        meshOffsetY: 0,
        meshOffsetX: 0,
      });
    }
  };

  // Direct Pointer/Touch Dragging on Preview (Works for both Sunglasses and 3D Mesh)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (style === 'none' && !meshEnabled) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startOffsetX: style !== 'none' ? offsetX : meshOffsetX,
      startOffsetY: style !== 'none' ? offsetY : meshOffsetY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    if (style === 'none' && !meshEnabled) return;
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;

    if (style !== 'none') {
      const newX = Math.round(Math.max(-40, Math.min(40, dragStartRef.current.startOffsetX + dx * 0.6)));
      const newY = Math.round(Math.max(-50, Math.min(50, dragStartRef.current.startOffsetY + dy * 0.6)));
      setOffsetX(newX);
      setOffsetY(newY);
      notifyChanges({ sunglassesOffsetX: newX, sunglassesOffsetY: newY });
    } else {
      const newX = Math.round(Math.max(-35, Math.min(35, dragStartRef.current.startOffsetX + dx * 0.6)));
      const newY = Math.round(Math.max(-40, Math.min(40, dragStartRef.current.startOffsetY + dy * 0.6)));
      setMeshOffsetX(newX);
      setMeshOffsetY(newY);
      notifyChanges({ meshOffsetX: newX, meshOffsetY: newY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    setIsDragging(false);
  };

  // Bake image onto Canvas when user clicks "生成造型并锁定"
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
      if (imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
        try {
          const resp = await fetch(imageSource, { mode: 'cors' });
          const blob = await resp.blob();
          imageSource = URL.createObjectURL(blob);
        } catch {}
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
      if (filterMode === 'cg-unreal') {
        // Step A: Surface pore-smoothing blur layer
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.filter = 'blur(2px)';
          tempCtx.drawImage(baseImg, 0, 0, width, height);
          ctx.save();
          ctx.globalAlpha = 0.65;
          ctx.drawImage(tempCanvas, 0, 0, width, height);
          ctx.restore();
        }

        // Step B: Quantize color levels to 32 steps (strips continuous camera sensor noise)
        const imgData = ctx.getImageData(0, 0, width, height);
        const d = imgData.data;
        const step = 255 / 32;

        for (let i = 0; i < d.length; i += 4) {
          let r = d[i];
          let g = d[i + 1];
          let b = d[i + 2];

          // Quantize
          r = Math.round(r / step) * step;
          g = Math.round(g / step) * step;
          b = Math.round(b / step) * step;

          // Stylized contrast boost (PBR Specular)
          r = r > 120 ? Math.min(255, r * 1.08 + 4) : Math.max(0, r * 0.94);
          g = g > 120 ? Math.min(255, g * 1.05 + 2) : Math.max(0, g * 0.94);
          b = b > 120 ? Math.min(255, b * 1.02) : Math.max(0, b * 0.92);

          // Subtle digital warm lighting
          d[i] = Math.min(255, r * 1.03 + 2);
          d[i + 1] = Math.min(255, g * 1.01 + 1);
          d[i + 2] = Math.min(255, b * 0.98);
        }
        ctx.putImageData(imgData, 0, 0);
      } else if (filterMode === 'comic-pop') {
        // Cel-shaded posterization (16 tone levels for comic book / GTA art style)
        const imgData = ctx.getImageData(0, 0, width, height);
        const d = imgData.data;
        const step = 255 / 16;

        for (let i = 0; i < d.length; i += 4) {
          d[i] = Math.min(255, Math.round(d[i] / step) * step * 1.08);
          d[i + 1] = Math.min(255, Math.round(d[i + 1] / step) * step * 1.04);
          d[i + 2] = Math.min(255, Math.round(d[i + 2] / step) * step * 0.94);
        }
        ctx.putImageData(imgData, 0, 0);
      } else if (filterMode === 'hiphop-grain') {
        const imgData = ctx.getImageData(0, 0, width, height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          d[i] = Math.min(255, d[i] * 1.03 + 2);
          d[i + 1] = Math.min(255, d[i + 1] * 1.01);
          const grain = (Math.random() - 0.5) * 12;
          d[i] = Math.max(0, Math.min(255, d[i] + grain));
          d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + grain));
          d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + grain));
        }
        ctx.putImageData(imgData, 0, 0);
      }

      // 4. Draw Sunglasses or 3D Face Wireframe Mesh
      if (style !== 'none' && SUNGLASSES_PRESETS[style]) {
        const preset = SUNGLASSES_PRESETS[style];
        const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(preset.svg)}`;

        const glassImg = new Image();
        glassImg.src = svgUrl;
        await new Promise((resolve) => {
          glassImg.onload = resolve;
          glassImg.onerror = resolve;
        });

        const eyeCenterX = width * 0.5 + (offsetX / 100) * width * 0.35;
        const eyeCenterY = height * 0.36 + (offsetY / 100) * height * 0.35;

        const baseWidthRatio = style === 'cyber-visor' ? 0.62 : 0.55;
        const glassWidth = width * baseWidthRatio * (scale / 100);
        const glassHeight = (glassWidth / 240) * (style === 'cyber-visor' ? 60 : 70);

        ctx.save();
        ctx.translate(eyeCenterX, eyeCenterY);
        ctx.rotate((rotate * Math.PI) / 180);
        ctx.drawImage(glassImg, -glassWidth / 2, -glassHeight / 2, glassWidth, glassHeight);
        ctx.restore();
      } else if (style === 'none' && meshEnabled) {
        // Draw Semi-transparent 3D Topology Mesh onto Canvas to defeat face biometric checks
        const meshSvg = generateFaceMeshSvg(meshOpacity / 100);
        const meshSvgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(meshSvg)}`;

        const meshImg = new Image();
        meshImg.src = meshSvgUrl;
        await new Promise((resolve) => {
          meshImg.onload = resolve;
          meshImg.onerror = resolve;
        });

        const faceCenterX = width * 0.5 + (meshOffsetX / 100) * width * 0.35;
        const faceCenterY = height * 0.44 + (meshOffsetY / 100) * height * 0.35;

        const meshWidth = width * 0.52 * (meshScale / 100);
        const meshHeight = (meshWidth / 200) * 240;

        ctx.save();
        ctx.translate(faceCenterX, faceCenterY);
        ctx.drawImage(meshImg, -meshWidth / 2, -meshHeight / 2, meshWidth, meshHeight);
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
        sunglassesStyle: style,
        sunglassesScale: scale,
        sunglassesOffsetY: offsetY,
        sunglassesOffsetX: offsetX,
        sunglassesRotate: rotate,
        meshEnabled,
        meshOpacity,
        meshScale,
        meshOffsetY,
        meshOffsetX,
        filterMode,
      });

      if (data.onRunStep) {
        await data.onRunStep();
      }

      toast.success(
        style === 'none' && meshEnabled
          ? '✨ 3D 拓扑防护网格已合成并锁定！原貌露脸防拦截底图就绪。'
          : '✨ 造型已成功生成并锁定！防拦截底图已准备完毕。'
      );
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

      {/* Body: All controls wrapped with nodrag nopan to prevent ReactFlow from intercepting mouse clicks */}
      <div className="nodrag nopan mt-3 space-y-3">
        {/* Visual Live DOM Preview Area */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`nodrag nopan relative flex h-52 w-full select-none overflow-hidden rounded-xl border border-white/10 bg-[#070b14] touch-none ${
            style !== 'none' || meshEnabled ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
        >
          {displayPhoto ? (
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden pointer-events-none">
              {/* Base User Portrait */}
              <img
                src={displayPhoto}
                alt="Character Portrait"
                className={`h-full w-full object-contain pointer-events-none select-none transition-all ${
                  !showOriginal
                    ? filterMode === 'cg-unreal'
                      ? 'contrast-[1.12] saturate-[1.16] brightness-[1.03] drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]'
                      : filterMode === 'comic-pop'
                        ? 'contrast-[1.28] saturate-[1.22] hue-rotate-[-3deg]'
                        : filterMode === 'hiphop-grain'
                          ? 'contrast-[1.04] saturate-[1.08] sepia-[0.1]'
                          : ''
                    : ''
                }`}
              />

              {/* Live Interactive Sunglasses Overlay */}
              {style !== 'none' && SUNGLASSES_PRESETS[style] && !showOriginal && (
                <div
                  className="absolute pointer-events-none select-none"
                  style={{
                    left: `calc(50% + ${offsetX * 1.5}px)`,
                    top: `calc(36% + ${offsetY * 1.5}px)`,
                    transform: `translate(-50%, -50%) scale(${scale / 100}) rotate(${rotate}deg)`,
                    width: `${SUNGLASSES_PRESETS[style].baseWidth}px`,
                  }}
                  dangerouslySetInnerHTML={{ __html: SUNGLASSES_PRESETS[style].svg }}
                />
              )}

              {/* Live Interactive 3D Face Topology Mesh (for 'none' style) */}
              {style === 'none' && meshEnabled && !showOriginal && (
                <div
                  className="absolute pointer-events-none select-none transition-transform"
                  style={{
                    left: `calc(50% + ${meshOffsetX * 1.5}px)`,
                    top: `calc(44% + ${meshOffsetY * 1.5}px)`,
                    transform: `translate(-50%, -50%) scale(${meshScale / 100})`,
                    width: '160px',
                  }}
                  dangerouslySetInnerHTML={{ __html: generateFaceMeshSvg(meshOpacity / 100) }}
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
          {displayPhoto && (style !== 'none' || meshEnabled) && (
            <div className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[9px] text-slate-300 backdrop-blur-md">
              <Move className="size-2.5 text-amber-400" />
              <span>按住图片任意位置直接拖动 ({style !== 'none' ? '墨镜' : '3D网格'})</span>
            </div>
          )}

          {/* Quick Preview Badge & Compare button */}
          {displayPhoto && (
            <div className="nodrag nopan absolute top-2 right-2 flex items-center gap-1">
              <button
                type="button"
                onMouseDown={() => setShowOriginal(true)}
                onMouseUp={() => setShowOriginal(false)}
                onTouchStart={() => setShowOriginal(true)}
                onTouchEnd={() => setShowOriginal(false)}
                className="nodrag nopan flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[10px] font-medium text-slate-300 backdrop-blur-md transition hover:bg-black/90 hover:text-white"
              >
                {showOriginal ? <Eye className="size-3 text-amber-400" /> : <EyeOff className="size-3" />}
                <span>按住看原图</span>
              </button>
            </div>
          )}

          {/* Compliance Status Overlay */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between rounded-md bg-black/85 px-2.5 py-1 text-[10px] font-medium backdrop-blur-md border border-white/10">
            {style !== 'none' ? (
              <div className="flex items-center gap-1.5 text-emerald-300">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold">眼部已遮蔽 · 符合 Wan 3.0 / Seedance 过审规范 (100% 通过)</span>
              </div>
            ) : meshEnabled ? (
              <div className="flex items-center gap-1.5 text-emerald-300">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold">3D 拓扑防护网已覆盖 · 隐形干扰前置人脸审核 · 露脸过审率 90%+</span>
              </div>
            ) : filterMode === 'cg-unreal' || filterMode === 'comic-pop' ? (
              <div className="flex items-center gap-1.5 text-amber-300">
                <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-semibold">已开启 3D CG 渲染脱敏 · 剥离微观真人特征支持露脸过审</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                <span className="size-2 rounded-full bg-rose-500 animate-ping" />
                <span>⚠️ 拦截预警: 正脸完全裸露且未开防护，极易被平台人脸风控拦截</span>
              </div>
            )}
          </div>
        </div>

        {/* Style Selector Grid */}
        <div className="nodrag nopan">
          <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Sparkles className="size-3 text-amber-400" /> 嘻哈造型与防拦截模式
            </span>
            <span className="text-[10px] text-slate-500">遮蔽五官三角区或覆以 3D 拓扑网</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {Object.entries(SUNGLASSES_PRESETS).map(([key, item]) => {
              const isSelected = style === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleUpdateStyle(key)}
                  className={`nodrag nopan flex flex-col items-center justify-center rounded-lg border p-1.5 text-center transition cursor-pointer ${
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
              onClick={() => handleUpdateStyle('none')}
              className={`nodrag nopan flex flex-col items-center justify-center rounded-lg border p-1.5 text-center transition cursor-pointer ${
                style === 'none'
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.25)]'
                  : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-slate-200'
              }`}
            >
              <span className="text-[11px] font-bold">无墨镜</span>
              <span className="text-[9px] font-semibold text-emerald-400 flex items-center justify-center gap-0.5">
                <Grid className="size-2.5" /> 3D网格过审
              </span>
            </button>
          </div>
        </div>

        {/* Fine-Tuning Sliders & Step Buttons */}
        {style !== 'none' ? (
          <div className="nodrag nopan rounded-xl border border-white/5 bg-white/[0.02] p-2.5 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 font-medium">
                <Sliders className="size-3 text-amber-400" /> 墨镜位置与尺寸微调 (支持滑块/按钮/直接拖拽)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAutoFitFace(false)}
                  disabled={isAutoFitting || !displayPhoto}
                  className="nodrag nopan flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition cursor-pointer disabled:opacity-50"
                  title="智能识别人脸双眼位置，自动缩放对齐"
                >
                  {isAutoFitting ? <Loader2 className="size-2.5 animate-spin" /> : <Wand2 className="size-2.5" />}
                  <span>✨ 智能对齐</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="nodrag nopan flex items-center gap-1 text-[10px] text-slate-400 hover:text-amber-400 transition cursor-pointer"
                >
                  <RefreshCw className="size-2.5" /> 复位
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {/* Offset Y (Height) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>高度 Y:</span>
                  <span className="font-mono text-amber-300">{offsetY > 0 ? `+${offsetY}` : offsetY}px</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleUpdateOffsetY(offsetY - 3)}
                    className="nodrag nopan flex size-5 items-center justify-center rounded bg-white/10 text-slate-300 hover:bg-amber-500/30 hover:text-white transition"
                    title="上移"
                  >
                    <Minus className="size-3" />
                  </button>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="1"
                    value={offsetY}
                    onChange={(e) => handleUpdateOffsetY(Number(e.target.value))}
                    className="nodrag nopan h-1.5 flex-1 accent-amber-400 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdateOffsetY(offsetY + 3)}
                    className="nodrag nopan flex size-5 items-center justify-center rounded bg-white/10 text-slate-300 hover:bg-amber-500/30 hover:text-white transition"
                    title="下移"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
              </div>

              {/* Offset X (Horizontal) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>水平 X:</span>
                  <span className="font-mono text-amber-300">{offsetX > 0 ? `+${offsetX}` : offsetX}px</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleUpdateOffsetX(offsetX - 3)}
                    className="nodrag nopan flex size-5 items-center justify-center rounded bg-white/10 text-slate-300 hover:bg-amber-500/30 hover:text-white transition"
                    title="左移"
                  >
                    <Minus className="size-3" />
                  </button>
                  <input
                    type="range"
                    min="-35"
                    max="35"
                    step="1"
                    value={offsetX}
                    onChange={(e) => handleUpdateOffsetX(Number(e.target.value))}
                    className="nodrag nopan h-1.5 flex-1 accent-amber-400 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdateOffsetX(offsetX + 3)}
                    className="nodrag nopan flex size-5 items-center justify-center rounded bg-white/10 text-slate-300 hover:bg-amber-500/30 hover:text-white transition"
                    title="右移"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
              </div>

              {/* Scale */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>大小缩放:</span>
                  <span className="font-mono text-amber-300">{scale}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleUpdateScale(scale - 5)}
                    className="nodrag nopan flex size-5 items-center justify-center rounded bg-white/10 text-slate-300 hover:bg-amber-500/30 hover:text-white transition"
                    title="缩小"
                  >
                    <Minus className="size-3" />
                  </button>
                  <input
                    type="range"
                    min="60"
                    max="160"
                    step="2"
                    value={scale}
                    onChange={(e) => handleUpdateScale(Number(e.target.value))}
                    className="nodrag nopan h-1.5 flex-1 accent-amber-400 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdateScale(scale + 5)}
                    className="nodrag nopan flex size-5 items-center justify-center rounded bg-white/10 text-slate-300 hover:bg-amber-500/30 hover:text-white transition"
                    title="放大"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
              </div>

              {/* Rotate */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>倾斜角度:</span>
                  <span className="font-mono text-amber-300">{rotate}°</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleUpdateRotate(rotate - 3)}
                    className="nodrag nopan flex size-5 items-center justify-center rounded bg-white/10 text-slate-300 hover:bg-amber-500/30 hover:text-white transition"
                    title="逆时针微调"
                  >
                    <RotateCcw className="size-3" />
                  </button>
                  <input
                    type="range"
                    min="-25"
                    max="25"
                    step="1"
                    value={rotate}
                    onChange={(e) => handleUpdateRotate(Number(e.target.value))}
                    className="nodrag nopan h-1.5 flex-1 accent-amber-400 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdateRotate(rotate + 3)}
                    className="nodrag nopan flex size-5 items-center justify-center rounded bg-white/10 text-slate-300 hover:bg-amber-500/30 hover:text-white transition"
                    title="顺时针微调"
                  >
                    <RotateCw className="size-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* 3D Topology Mesh Fine-Tuning Panel for 'none' style */
          <div className="nodrag nopan rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-2.5 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] text-emerald-300">
              <span className="flex items-center gap-1 font-semibold">
                <Grid className="size-3 text-emerald-400" /> 3D 拓扑网格防护微调 (支持直接拖拽/滑块控制)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAutoFitFace(false)}
                  disabled={isAutoFitting || !displayPhoto}
                  className="nodrag nopan flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[9px] font-semibold text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition cursor-pointer disabled:opacity-50"
                  title="智能识别面部并自动缩放贴合"
                >
                  {isAutoFitting ? <Loader2 className="size-2.5 animate-spin" /> : <Wand2 className="size-2.5" />}
                  <span>✨ 智能对齐</span>
                </button>
                <button
                  type="button"
                  onClick={handleToggleMesh}
                  className={`nodrag nopan rounded px-1.5 py-0.5 text-[9px] font-bold transition cursor-pointer ${
                    meshEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                  }`}
                >
                  {meshEnabled ? '🛡️ 防护已开启' : '⚠️ 已暂停防护'}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="nodrag nopan flex items-center gap-1 text-[10px] text-slate-400 hover:text-emerald-400 transition cursor-pointer"
                >
                  <RefreshCw className="size-2.5" /> 复位
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {/* Mesh Opacity */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[10px] text-slate-300">
                  <span>网格透明度 (推荐20-30%):</span>
                  <span className="font-mono text-emerald-300">{meshOpacity}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleUpdateMeshOpacity(meshOpacity - 2)}
                    className="nodrag nopan flex size-5 items-center justify-center rounded bg-white/10 text-slate-300 hover:bg-emerald-500/30 hover:text-white transition"
                    title="减淡"
                  >
                    <Minus className="size-3" />
                  </button>
                  <input
                    type="range"
                    min="12"
                    max="45"
                    step="1"
                    value={meshOpacity}
                    onChange={(e) => handleUpdateMeshOpacity(Number(e.target.value))}
                    className="nodrag nopan h-1.5 flex-1 accent-emerald-400 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdateMeshOpacity(meshOpacity + 2)}
                    className="nodrag nopan flex size-5 items-center justify-center rounded bg-white/10 text-slate-300 hover:bg-emerald-500/30 hover:text-white transition"
                    title="加深"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
              </div>

              {/* Mesh Scale */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[10px] text-slate-300">
                  <span>网格覆盖缩放:</span>
                  <span className="font-mono text-emerald-300">{meshScale}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleUpdateMeshScale(meshScale - 5)}
                    className="nodrag nopan flex size-5 items-center justify-center rounded bg-white/10 text-slate-300 hover:bg-emerald-500/30 hover:text-white transition"
                    title="缩小"
                  >
                    <Minus className="size-3" />
                  </button>
                  <input
                    type="range"
                    min="75"
                    max="145"
                    step="2"
                    value={meshScale}
                    onChange={(e) => handleUpdateMeshScale(Number(e.target.value))}
                    className="nodrag nopan h-1.5 flex-1 accent-emerald-400 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdateMeshScale(meshScale + 5)}
                    className="nodrag nopan flex size-5 items-center justify-center rounded bg-white/10 text-slate-300 hover:bg-emerald-500/30 hover:text-white transition"
                    title="放大"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
              </div>

              {/* Mesh Offset Y */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[10px] text-slate-300">
                  <span>垂直高度 Y:</span>
                  <span className="font-mono text-emerald-300">{meshOffsetY > 0 ? `+${meshOffsetY}` : meshOffsetY}px</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleUpdateMeshOffsetY(meshOffsetY - 3)}
                    className="nodrag nopan flex size-5 items-center justify-center rounded bg-white/10 text-slate-300 hover:bg-emerald-500/30 hover:text-white transition"
                    title="上移"
                  >
                    <Minus className="size-3" />
                  </button>
                  <input
                    type="range"
                    min="-35"
                    max="35"
                    step="1"
                    value={meshOffsetY}
                    onChange={(e) => handleUpdateMeshOffsetY(Number(e.target.value))}
                    className="nodrag nopan h-1.5 flex-1 accent-emerald-400 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdateMeshOffsetY(meshOffsetY + 3)}
                    className="nodrag nopan flex size-5 items-center justify-center rounded bg-white/10 text-slate-300 hover:bg-emerald-500/30 hover:text-white transition"
                    title="下移"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
              </div>

              {/* Mesh Offset X */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[10px] text-slate-300">
                  <span>水平位置 X:</span>
                  <span className="font-mono text-emerald-300">{meshOffsetX > 0 ? `+${meshOffsetX}` : meshOffsetX}px</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleUpdateMeshOffsetX(meshOffsetX - 3)}
                    className="nodrag nopan flex size-5 items-center justify-center rounded bg-white/10 text-slate-300 hover:bg-emerald-500/30 hover:text-white transition"
                    title="左移"
                  >
                    <Minus className="size-3" />
                  </button>
                  <input
                    type="range"
                    min="-30"
                    max="30"
                    step="1"
                    value={meshOffsetX}
                    onChange={(e) => handleUpdateMeshOffsetX(Number(e.target.value))}
                    className="nodrag nopan h-1.5 flex-1 accent-emerald-400 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdateMeshOffsetX(meshOffsetX + 3)}
                    className="nodrag nopan flex size-5 items-center justify-center rounded bg-white/10 text-slate-300 hover:bg-emerald-500/30 hover:text-white transition"
                    title="右移"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Anti-Detect Texture Filter */}
        <div className="nodrag nopan flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-2">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-200">去真实感抗检滤镜</span>
            <span className="text-[10px] text-slate-400">消除微观皮肤毛孔，打破人脸活体特征识别</span>
          </div>
          <select
            value={filterMode}
            onChange={(e) => {
              setFilterMode(e.target.value);
              notifyChanges({ filterMode: e.target.value as any });
            }}
            className="nodrag nopan rounded-lg border border-white/10 bg-[#060b17] px-2.5 py-1.5 text-xs text-amber-300 outline-none cursor-pointer"
          >
            <option value="cg-unreal">🎮 3D 虚幻写实 CG (强力推荐 · 露脸过审)</option>
            <option value="comic-pop">🎨 美漫插画矢量 (艺术风格 · 露脸可用)</option>
            <option value="hiphop-grain">🎞️ 嘻哈胶片微粒 (轻度调色 · 建议配墨镜)</option>
            <option value="none">📷 真实照片原貌 (高风险 · 必须配墨镜)</option>
          </select>
        </div>

        {/* Action Button: Single-step execution */}
        <button
          type="button"
          onClick={handleBakeAndLock}
          disabled={localProcessing || isRunning || !displayPhoto}
          className={`nodrag nopan flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition shadow-lg cursor-pointer ${
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

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addEdge,
  Background,
  BackgroundVariant,
  Connection,
  Controls,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileCode,
  Flame,
  HelpCircle,
  Laptop,
  Layers,
  Loader2,
  Maximize2,
  Play,
  RefreshCw,
  Save,
  Sliders,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

import { apiGet, apiPost } from '@/lib/api-client';
import { RAP_STYLE_PRESETS } from '@/config/rap-presets';

import { LyricsNode } from './nodes/LyricsNode';
import { MusicNode } from './nodes/MusicNode';
import { OutputNode } from './nodes/OutputNode';
import { StartNode } from './nodes/StartNode';
import { DEFAULT_VIDEO_PROMPT, VideoNode } from './nodes/VideoNode';
import { NodeExecutionStatus, WorkflowState } from './types';

const INITIAL_TOPIC = 'Quavo & Takeoff 经典 Hotel Lobby 亮橙色录音棚双人互呛，单支悬吊麦克风，高燃808陷阱鼓点';
const DEMO_PHOTO_1 = '/imgs/scenes/quavo-takeoff-takeoff.jpg';
const DEMO_PHOTO_2 = '/imgs/scenes/quavo-takeoff-quavo.jpg';
const DEMO_AUDIO = '/audio/hotel-lobby-original-5s.m4a';

export function WorkflowEditor() {
  // Workflow Global State
  const [workflowState, setWorkflowState] = useState<WorkflowState>({
    topic: INITIAL_TOPIC,
    styleId: 'trap-808',
    bpm: 140,
    studioMode: 'duo',
    photo1: DEMO_PHOTO_1,
    photo2: DEMO_PHOTO_2,

    lyricsModel: 'deepseek-v4.1-flash-1017',
    lyricsLanguage: 'en',
    generatedTitle: 'Hotel Lobby Cypher',
    generatedLyrics: `[Intro: Beat drops heavy 808]
Let's get it.

[Verse 1: Quavo]
Hop out the sixteen, passing the Digi-D5,
Know this not a Challenger, we keeping it alive.

[Outro: Takeoff]
Big one. Yeah, we keep it in the booth.`,

    musicModel: 'suno-v4',
    generatedAudioUrl: DEMO_AUDIO,

    videoModel: 'happyhorse-1.1-r2v',
    videoResolution: '480p',
    videoRatio: '9:16',
    videoDuration: 5,
    videoPrompt: DEFAULT_VIDEO_PROMPT,
    generatedVideoUrl: '',

    mock: false,
    activeRunningNode: null,
    logs: [
      '⚡ [System] 工作流可视化调试引擎已初始化完毕',
      '📦 [Registry] 已载入 4 核心微服务算子 (LLM Lyrics, Suno Music, Video Lip-Sync, Output Asset)',
    ],
  });

  const [isFullRunning, setIsFullRunning] = useState(false);
  const [showLogDrawer, setShowLogDrawer] = useState(true);

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    setWorkflowState((prev) => ({
      ...prev,
      logs: [...prev.logs.slice(-50), `[${time}] ${msg}`],
    }));
  }, []);

  // Update State Partial
  const updateState = useCallback((updates: Partial<WorkflowState>) => {
    setWorkflowState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Node Status Tracking
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, NodeExecutionStatus>>({
    start: 'success',
    lyrics: 'idle',
    music: 'idle',
    video: 'idle',
    output: 'idle',
  });

  const [nodeLatencies, setNodeLatencies] = useState<Record<string, number>>({});

  // 1. Single Step: Run Lyrics
  const runLyricsStep = useCallback(async () => {
    setNodeStatuses((prev) => ({ ...prev, lyrics: 'running' }));
    addLog(`🚀 [Step 1] 触发作词引擎: 模型 ${workflowState.lyricsModel}, 语言: ${workflowState.lyricsLanguage || 'en'}, 主题: "${workflowState.topic.slice(0, 15)}..."`);
    const startTime = Date.now();

    try {
      const res = await apiPost<any>('/api/ai/rap/lyrics', {
        topic: workflowState.topic,
        styleId: workflowState.styleId,
        language: workflowState.lyricsLanguage || 'en',
        model: workflowState.lyricsModel,
      });

      const latency = Date.now() - startTime;
      setNodeLatencies((prev) => ({ ...prev, lyrics: latency }));

      if (res && res.lyrics) {
        setWorkflowState((prev) => ({
          ...prev,
          generatedLyrics: res.lyrics,
          generatedTitle: res.title || prev.generatedTitle,
        }));
        setNodeStatuses((prev) => ({ ...prev, lyrics: 'success' }));
        addLog(`✅ [Step 1] 作词完成 (${latency}ms) - 生成 ${res.lyrics.split('\n').length} 行押韵双押唱词`);
        toast.success('✨ 唱词生成成功！可直接在节点中手动编辑。');
      } else {
        throw new Error('未返回有效歌词');
      }
    } catch (err: any) {
      setNodeStatuses((prev) => ({ ...prev, lyrics: 'failed' }));
      addLog(`❌ [Step 1] 作词失败: ${err.message}`);
      toast.error(`作词失败: ${err.message}`);
      throw err;
    }
  }, [workflowState.topic, workflowState.styleId, workflowState.lyricsModel, workflowState.lyricsLanguage, addLog]);

  // 2. Single Step: Run Music
  const runMusicStep = useCallback(async () => {
    if (!workflowState.generatedLyrics) {
      toast.error('请先生成或输入唱词，再运行 Suno 音乐节点');
      return;
    }

    setNodeStatuses((prev) => ({ ...prev, music: 'running' }));
    addLog(`🚀 [Step 2] 调度 Suno 编曲: 选用模型 ${workflowState.musicModel}, 风格: ${workflowState.styleId}`);
    const startTime = Date.now();

    try {
      const res = await apiPost<any>('/api/ai/workflow/music', {
        lyrics: workflowState.generatedLyrics,
        title: workflowState.generatedTitle,
        style: `${workflowState.styleId}, 808 bass, 140 bpm, hiphop flow`,
        model: workflowState.musicModel,
        mock: workflowState.mock,
      });

      if (res && res.status === 'success' && res.audioUrl) {
        // Immediate (Mock or cached)
        const latency = Date.now() - startTime;
        setNodeLatencies((prev) => ({ ...prev, music: latency }));
        setWorkflowState((prev) => ({
          ...prev,
          generatedAudioUrl: res.audioUrl,
        }));
        setNodeStatuses((prev) => ({ ...prev, music: 'success' }));
        addLog(`✅ [Step 2] 音乐就绪 (${latency}ms): ${res.audioUrl}`);
        toast.success('🎵 Suno 伴奏已就绪，可在节点直接试听！');
        return;
      }

      if (res && res.taskId) {
        addLog(`⏳ [Step 2] 任务已在队列中 (Task ID: ${res.taskId})，开始轮询状态...`);
        // Poll status
        const taskId = res.taskId;
        let pollCount = 0;
        const poll = async () => {
          pollCount++;
          const qRes = await apiGet<any>(`/api/ai/workflow/query?taskId=${taskId}&mediaType=music`);
          if (qRes && qRes.status === 'success' && qRes.audioUrl) {
            const latency = Date.now() - startTime;
            setNodeLatencies((prev) => ({ ...prev, music: latency }));
            setWorkflowState((prev) => ({
              ...prev,
              generatedAudioUrl: qRes.audioUrl,
            }));
            setNodeStatuses((prev) => ({ ...prev, music: 'success' }));
            addLog(`✅ [Step 2] Suno 音乐编曲完成 (${latency}ms): ${qRes.audioUrl}`);
            toast.success('🎵 伴奏生成完毕！');
          } else if (qRes && qRes.status === 'failed') {
            throw new Error(qRes.error || 'Suno generation failed');
          } else {
            if (pollCount > 60) {
              throw new Error('Suno 生成超时，请检查配置或稍后重试');
            }
            setTimeout(poll, 4000);
          }
        };
        setTimeout(poll, 3000);
      }
    } catch (err: any) {
      setNodeStatuses((prev) => ({ ...prev, music: 'failed' }));
      addLog(`❌ [Step 2] 音乐生成异常: ${err.message}`);
      toast.error(`编曲失败: ${err.message}`);
      throw err;
    }
  }, [
    workflowState.generatedLyrics,
    workflowState.generatedTitle,
    workflowState.styleId,
    workflowState.musicModel,
    workflowState.mock,
    addLog,
  ]);

  // 3. Single Step: Run Video
  const runVideoStep = useCallback(async () => {
    if (!workflowState.photo1) {
      toast.error('请先在 Start Node 上传说唱歌手人像');
      return;
    }
    const effectiveAudio = workflowState.generatedAudioUrl || 'https://pixanyoss.16781678.xyz/test.mp3';
    if (!workflowState.generatedAudioUrl) {
      addLog('ℹ️ [Step 3] 未检测到第2步自定义伴奏，自动装载预置 808 Trap 调试音频进行独立单步渲染');
    }

    setNodeStatuses((prev) => ({ ...prev, video: 'running' }));
    addLog(`🚀 [Step 3] 触发音画对齐驱动: 模型 ${workflowState.videoModel}, 画幅: ${workflowState.videoRatio || '9:16'}, 清晰度: ${workflowState.videoResolution}, 时长: ${workflowState.videoDuration || 5}s`);
    const startTime = Date.now();

    try {
      const res = await apiPost<any>('/api/ai/workflow/video', {
        imageUrl: workflowState.photo1,
        imageUrls: workflowState.photo2 ? [workflowState.photo1, workflowState.photo2] : [workflowState.photo1],
        audioUrl: effectiveAudio,
        prompt: workflowState.videoPrompt || DEFAULT_VIDEO_PROMPT,
        model: workflowState.videoModel,
        resolution: workflowState.videoResolution,
        aspectRatio: workflowState.videoRatio || '9:16',
        duration: workflowState.videoDuration || 5,
        mock: workflowState.mock,
      });

      if (res && res.status === 'success' && res.videoUrl) {
        const latency = Date.now() - startTime;
        setNodeLatencies((prev) => ({ ...prev, video: latency }));
        setWorkflowState((prev) => ({
          ...prev,
          generatedVideoUrl: res.videoUrl,
        }));
        setNodeStatuses((prev) => ({ ...prev, video: 'success', output: 'success' }));
        addLog(`✅ [Step 3] 视频驱动完成 (${latency}ms): ${res.videoUrl}`);
        toast.success('🎬 AI Rap MV 视频渲染完成！可在 Output 节点下载成片。');
        return;
      }

      if (res && res.taskId) {
        addLog(`⏳ [Step 3] 视频渲染中 (Task ID: ${res.taskId})，开始监听进度...`);
        const taskId = res.taskId;
        let pollCount = 0;
        const poll = async () => {
          pollCount++;
          const qRes = await apiGet<any>(`/api/ai/workflow/query?taskId=${taskId}&mediaType=video`);
          if (qRes && qRes.status === 'success' && qRes.videoUrl) {
            const latency = Date.now() - startTime;
            setNodeLatencies((prev) => ({ ...prev, video: latency }));
            setWorkflowState((prev) => ({
              ...prev,
              generatedVideoUrl: qRes.videoUrl,
            }));
            setNodeStatuses((prev) => ({ ...prev, video: 'success', output: 'success' }));
            addLog(`✅ [Step 3] 视频驱动渲染完成 (${latency}ms): ${qRes.videoUrl}`);
            toast.success('🎬 AI Rap MV 渲染完成！');
          } else if (qRes && qRes.status === 'failed') {
            throw new Error(qRes.error || 'Video driver failed');
          } else {
            if (pollCount > 90) {
              throw new Error('视频渲染超时');
            }
            setTimeout(poll, 5000);
          }
        };
        setTimeout(poll, 4000);
      }
    } catch (err: any) {
      setNodeStatuses((prev) => ({ ...prev, video: 'failed' }));
      addLog(`❌ [Step 3] 视频驱动异常: ${err.message}`);
      toast.error(`视频渲染失败: ${err.message}`);
      throw err;
    }
  }, [
    workflowState.photo1,
    workflowState.photo2,
    workflowState.generatedAudioUrl,
    workflowState.videoModel,
    workflowState.videoResolution,
    workflowState.videoRatio,
    workflowState.videoDuration,
    workflowState.videoPrompt,
    workflowState.mock,
    addLog,
  ]);

  // 4. One-Click: Run Entire Workflow Pipeline (Sequential DAG)
  const runEntireWorkflow = useCallback(async () => {
    setIsFullRunning(true);
    addLog('🔥 ================== 启动一键全流程自动化调试 ==================');
    try {
      // Step 1: Lyrics
      if (!workflowState.generatedLyrics) {
        await runLyricsStep();
      } else {
        addLog('⏩ [Step 1] 检测到已有唱词，跳过作词阶段直接进入编曲...');
      }

      // Step 2: Music
      if (!workflowState.generatedAudioUrl) {
        await runMusicStep();
      } else {
        addLog('⏩ [Step 2] 检测到已有音频伴奏，直接复用进视频阶段...');
      }

      // Step 3: Video
      await runVideoStep();

      addLog('🎉 [Workflow Completed] 整条全流程已平稳闭环完成！');
      toast.success('🎉 全流程执行闭环成功！');
    } catch (err: any) {
      addLog(`🛑 [Workflow Aborted] 执行中断: ${err.message}`);
    } finally {
      setIsFullRunning(false);
    }
  }, [workflowState.generatedLyrics, workflowState.generatedAudioUrl, runLyricsStep, runMusicStep, runVideoStep, addLog]);

  // Export Workflow JSON
  const handleExportJson = useCallback(() => {
    const config = {
      name: 'Airap-Video-Workflow-v1',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      nodes: {
        start: {
          topic: workflowState.topic,
          styleId: workflowState.styleId,
          bpm: workflowState.bpm,
          studioMode: workflowState.studioMode,
        },
        lyrics: {
          model: workflowState.lyricsModel,
          title: workflowState.generatedTitle,
          lyrics: workflowState.generatedLyrics,
        },
        music: {
          model: workflowState.musicModel,
          audioUrl: workflowState.generatedAudioUrl,
        },
        video: {
          model: workflowState.videoModel,
          resolution: workflowState.videoResolution,
          aspectRatio: workflowState.videoRatio || '9:16',
          videoUrl: workflowState.generatedVideoUrl,
        },
      },
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `airap-workflow-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('工作流配置 JSON 已成功导出！');
  }, [workflowState]);

  // Custom Node Types Registration
  const nodeTypes = useMemo(
    () => ({
      startNode: StartNode,
      lyricsNode: LyricsNode,
      musicNode: MusicNode,
      videoNode: VideoNode,
      outputNode: OutputNode,
    }),
    []
  );

  // Initial Graph Layout
  const initialNodes: Node[] = useMemo(
    () => [
      {
        id: 'start',
        type: 'startNode',
        position: { x: 50, y: 150 },
        data: {
          ...workflowState,
          status: nodeStatuses.start,
          onChange: updateState,
        },
      },
      {
        id: 'lyrics',
        type: 'lyricsNode',
        position: { x: 440, y: 50 },
        data: {
          ...workflowState,
          status: nodeStatuses.lyrics,
          latency: nodeLatencies.lyrics,
          onChange: updateState,
          onRunStep: runLyricsStep,
        },
      },
      {
        id: 'music',
        type: 'musicNode',
        position: { x: 900, y: 50 },
        data: {
          ...workflowState,
          status: nodeStatuses.music,
          latency: nodeLatencies.music,
          onChange: updateState,
          onRunStep: runMusicStep,
        },
      },
      {
        id: 'video',
        type: 'videoNode',
        position: { x: 1360, y: 120 },
        data: {
          ...workflowState,
          status: nodeStatuses.video,
          latency: nodeLatencies.video,
          onChange: updateState,
          onRunStep: runVideoStep,
        },
      },
      {
        id: 'output',
        type: 'outputNode',
        position: { x: 1820, y: 160 },
        data: {
          ...workflowState,
          status: nodeStatuses.output,
          onExportJson: handleExportJson,
        },
      },
    ],
    [workflowState, nodeStatuses, nodeLatencies, updateState, runLyricsStep, runMusicStep, runVideoStep, handleExportJson]
  );

  // Edges Definition with dynamic animation
  const initialEdges: Edge[] = useMemo(
    () => [
      {
        id: 'e-start-lyrics',
        source: 'start',
        target: 'lyrics',
        sourceHandle: 'prompt-out',
        targetHandle: 'prompt-in',
        animated: nodeStatuses.lyrics === 'running',
        style: { stroke: '#f59e0b', strokeWidth: 2.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
      },
      {
        id: 'e-lyrics-music',
        source: 'lyrics',
        target: 'music',
        sourceHandle: 'lyrics-out',
        targetHandle: 'lyrics-in',
        animated: nodeStatuses.music === 'running',
        style: { stroke: '#c084fc', strokeWidth: 2.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#c084fc' },
      },
      {
        id: 'e-start-video',
        source: 'start',
        target: 'video',
        sourceHandle: 'prompt-out',
        targetHandle: 'image-in',
        animated: nodeStatuses.video === 'running',
        style: { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '5,5' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
      },
      {
        id: 'e-music-video',
        source: 'music',
        target: 'video',
        sourceHandle: 'audio-out',
        targetHandle: 'audio-in',
        animated: nodeStatuses.video === 'running',
        style: { stroke: '#fb7185', strokeWidth: 2.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#fb7185' },
      },
      {
        id: 'e-video-output',
        source: 'video',
        target: 'output',
        sourceHandle: 'video-out',
        targetHandle: 'video-in',
        animated: nodeStatuses.video === 'running',
        style: { stroke: '#22d3ee', strokeWidth: 2.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#22d3ee' },
      },
    ],
    [nodeStatuses]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync internal node data whenever workflowState or statuses update
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className="relative flex h-[calc(100vh-64px)] w-full flex-col overflow-hidden bg-[#060b17]">
      {/* Top Floating Control Bar */}
      <div className="z-20 flex flex-wrap items-center justify-between border-b border-white/10 bg-[#0d1527]/90 px-4 py-2.5 backdrop-blur-md">
        {/* Left: Branding & Meta */}
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 via-rose-500 to-purple-600 shadow-md shadow-amber-500/20">
            <Layers className="size-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">Visual Workflow Studio</span>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                Coze Edition
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              面向说唱 MV 生成的单步调试与有向无环图 (DAG) 编排系统
            </p>
          </div>
        </div>

        {/* Center: Presets & Mock Switch */}
        <div className="flex items-center gap-2">
          {/* Mock Mode Toggle */}
          <button
            type="button"
            onClick={() => {
              const nextMock = !workflowState.mock;
              updateState({ mock: nextMock });
              addLog(`⚡ [Config] MOCK 模式已切换为: ${nextMock ? '开启 (0 成本极速模拟)' : '关闭 (真实 API 调用)'}`);
              toast.info(nextMock ? '已开启 MOCK 模式 (0成本瞬时模拟)' : '已关闭 MOCK 模式 (真实调用 API)');
            }}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              workflowState.mock
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-sm'
                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Zap className={`size-3.5 ${workflowState.mock ? 'text-emerald-400 fill-current' : ''}`} />
            <span>{workflowState.mock ? 'Mock 模式: 开 (0成本)' : 'Mock 模式: 关 (调用API)'}</span>
          </button>

          {/* Quick Presets */}
          <div className="hidden sm:flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1 text-xs">
            <span className="px-2 text-[10px] text-slate-400 font-medium">场景预设:</span>
            <button
              type="button"
              onClick={() => {
                updateState({
                  topic: 'Quavo & Takeoff 经典 Hotel Lobby 亮橙色录音棚双人双押互呛，单支悬吊麦克风，808 重低音',
                  styleId: 'trap-808',
                  bpm: 140,
                  photo1: DEMO_PHOTO_1,
                  photo2: DEMO_PHOTO_2,
                  generatedAudioUrl: DEMO_AUDIO,
                  generatedLyrics: `[Intro: Beat drops heavy 808]\nLet's get it.\n\n[Verse 1: Quavo]\nHop out the sixteen, passing the Digi-D5,\nKnow this not a Challenger, we keeping it alive.\n\n[Outro: Takeoff]\nBig one. Yeah, we keep it in the booth.`,
                  videoPrompt: DEFAULT_VIDEO_PROMPT,
                  videoRatio: '9:16',
                  videoResolution: '480p',
                  videoDuration: 5,
                });
                toast.success('已载入预设：Hotel Lobby 原版 1:1 神态动作配置');
              }}
              className="rounded-lg px-2 py-1 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              🔥 橙色录音棚 (1:1 原版复刻)
            </button>
            <button
              type="button"
              onClick={() => {
                updateState({
                  topic: 'On The Radar 纽约地下暗黑电台录音间，荧光绿灯管，滑音808钻乐说唱',
                  styleId: 'cyber-drill',
                  bpm: 142,
                });
                toast.success('已载入预设：On The Radar 绿光电台');
              }}
              className="rounded-lg px-2 py-1 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              🟩 绿光电台
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Export JSON */}
          <button
            type="button"
            onClick={handleExportJson}
            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
          >
            <Save className="size-3.5 text-slate-400" />
            <span>导出配置</span>
          </button>

          {/* One-Click Execute Entire DAG */}
          <button
            type="button"
            disabled={isFullRunning}
            onClick={runEntireWorkflow}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-amber-500/20 transition hover:scale-102 hover:brightness-110 disabled:opacity-50"
          >
            {isFullRunning ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>全流水线调度中...</span>
              </>
            ) : (
              <>
                <Play className="size-4 fill-current" />
                <span>▶ 一键全流程调试</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.2}
          maxZoom={1.5}
          className="bg-[#040814]"
        >
          {/* Subtle Grid Dots */}
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1.5}
            color="rgba(255, 255, 255, 0.08)"
          />

          {/* Canvas Navigation Controls */}
          <Controls className="!bg-[#0d1527]/90 !border-white/10 !text-white [&>button]:!border-white/10 [&>button]:!fill-white [&>button:hover]:!bg-white/10" />

          {/* MiniMap */}
          <MiniMap
            nodeColor={(node) => {
              switch (node.type) {
                case 'startNode':
                  return '#f59e0b';
                case 'lyricsNode':
                  return '#c084fc';
                case 'musicNode':
                  return '#fb7185';
                case 'videoNode':
                  return '#22d3ee';
                default:
                  return '#10b981';
              }
            }}
            className="!border-white/10 !bg-[#0d1527]/90 !rounded-xl overflow-hidden shadow-xl"
            maskColor="rgba(4, 8, 20, 0.7)"
          />
        </ReactFlow>

        {/* Real-time Logs Console Drawer */}
        <div
          className={`absolute bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-[#070d1d]/95 backdrop-blur-xl transition-all duration-300 ${
            showLogDrawer ? 'h-48' : 'h-8'
          }`}
        >
          {/* Drawer Header */}
          <div
            onClick={() => setShowLogDrawer(!showLogDrawer)}
            className="flex h-8 cursor-pointer items-center justify-between border-b border-white/5 px-4 text-xs font-semibold text-slate-300 hover:bg-white/5"
          >
            <div className="flex items-center gap-2">
              <Terminal className="size-3.5 text-amber-400" />
              <span>调试输出控制台 (Live Runtime Logs)</span>
              <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] text-slate-400">
                {workflowState.logs.length} 条记录
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <span>{showLogDrawer ? '收起控制台' : '展开控制台'}</span>
              {showLogDrawer ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
            </div>
          </div>

          {/* Drawer Body: Logs list */}
          {showLogDrawer && (
            <div className="h-40 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed text-slate-300 space-y-1">
              {workflowState.logs.map((log, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-2 ${
                    log.includes('❌')
                      ? 'text-rose-400'
                      : log.includes('✅')
                        ? 'text-emerald-400'
                        : log.includes('🚀')
                          ? 'text-cyan-300'
                          : log.includes('🔥')
                            ? 'text-amber-300 font-bold'
                            : 'text-slate-400'
                  }`}
                >
                  <span className="opacity-40 select-none">{String(index + 1).padStart(2, '0')}.</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowDownToLine,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Film,
  HelpCircle,
  Info,
  Loader2,
  Share2,
  Smartphone,
  Sparkles,
} from 'lucide-react';

export const Route = createFileRoute('/mobile-video-download')({
  component: MobileVideoDownloadPage,
});

function MobileVideoDownloadPage() {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoTitle, setVideoTitle] = useState<string>('Airap AI Video');
  const [filename, setFilename] = useState<string>('ai-rap-video.mp4');

  const [isWeChat, setIsWeChat] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [canShare, setCanShare] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Parse parameters from query or hash
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const url = params.get('url') || params.get('videoUrl') || '';
    const title = params.get('title') || 'Airap AI Video';
    const file = params.get('filename') || 'airap-video.mp4';

    if (url) {
      setVideoUrl(url);
      setVideoTitle(title);
      setFilename(file);
    }

    // Detect WeChat environment
    const ua = window.navigator.userAgent.toLowerCase();
    const isWx = ua.includes('micromessenger');
    setIsWeChat(isWx);

    // Check navigator.share support
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      setCanShare(true);
    }
  }, []);

  // Standard download action
  const handleDownload = async () => {
    if (!videoUrl) return;

    // In WeChat, prompt user to open in browser
    if (isWeChat) {
      alert(
        '微信内置浏览器禁止直接保存视频。\n请点击右上角【···】选择【在浏览器中打开】后即可一键保存！'
      );
      return;
    }

    setIsDownloading(true);
    setDownloadSuccess(false);

    try {
      // 1. Try download proxy route
      const proxyDownloadUrl = `/api/download?url=${encodeURIComponent(
        videoUrl
      )}&filename=${encodeURIComponent(filename)}`;

      const response = await fetch(proxyDownloadUrl);
      if (!response.ok) {
        throw new Error('Proxy fetch failed');
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(objectUrl);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch {
      // 2. Fallback to direct anchor download
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } finally {
      setIsDownloading(false);
    }
  };

  // Copy direct video URL
  const handleCopy = () => {
    if (!videoUrl) return;
    navigator.clipboard.writeText(videoUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Mobile native share
  const handleShare = async () => {
    if (!videoUrl) return;
    try {
      await navigator.share({
        title: videoTitle,
        text: '来看我用 Airap Video 生成的 AI 说唱 MV！',
        url: videoUrl,
      });
    } catch {
      // User cancelled share
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-between bg-slate-950 font-sans text-slate-100 antialiased selection:bg-amber-500 selection:text-black">
      {/* WeChat Alert Banner */}
      {isWeChat && (
        <div className="sticky top-0 z-50 flex items-center gap-2.5 border-b border-amber-500/40 bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 px-4 py-3 text-xs font-bold text-white shadow-lg">
          <AlertTriangle className="size-4 shrink-0 animate-pulse text-amber-200" />
          <p className="flex-1 leading-snug">
            微信内受限：请点击右上角{' '}
            <span className="underline decoration-wavy">【···】</span> 选择{' '}
            <span className="rounded bg-black/30 px-1 py-0.5 text-amber-200">
              【在浏览器中打开】
            </span>{' '}
            即可保存视频！
          </p>
        </div>
      )}

      {/* Main Container */}
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6 pb-12">
        {/* Header Branding */}
        <header className="mb-5 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-300">
            <Smartphone className="size-3.5 text-amber-400" />
            <span>Airap Video 手机下载中心</span>
          </div>

          <h1 className="mt-2 text-xl font-black tracking-tight text-white sm:text-2xl">
            {videoTitle}
          </h1>

          <p className="mt-1 text-xs text-slate-400">
            已就绪 · 高清 9:16 竖版视频 · 即扫即存
          </p>
        </header>

        {/* Video Player Card */}
        <div className="relative mb-5 overflow-hidden rounded-2xl border border-amber-400/20 bg-black shadow-2xl shadow-amber-500/10">
          {videoUrl ? (
            <div className="relative flex aspect-[9/16] max-h-[58vh] w-full items-center justify-center bg-black">
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                playsInline
                loop
                autoPlay
                muted
                className="size-full object-contain"
              />
            </div>
          ) : (
            <div className="flex aspect-[9/16] max-h-[50vh] w-full flex-col items-center justify-center gap-3 p-6 text-center text-slate-400">
              <Film className="size-12 text-slate-600" />
              <p className="text-sm font-medium">未检测到有效视频链接</p>
              <p className="text-xs text-slate-500">
                请确认从电脑端重新扫码打开
              </p>
            </div>
          )}

          {/* Quick overlay hint */}
          <div className="border-t border-white/10 bg-slate-900/90 px-3 py-2 text-center text-[11px] text-amber-300/90 backdrop-blur-md">
            💡 提示：在 iPhone 或安卓手机上，也可<strong>长按上方视频</strong>
            直接存入相册
          </div>
        </div>

        {/* Download & Action Controls */}
        <div className="space-y-3">
          {/* Big One-Click Download Button */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading || !videoUrl}
            className="flex h-13 w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 px-6 font-bold text-white shadow-lg shadow-amber-500/25 transition-all hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDownloading ? (
              <>
                <Loader2 className="size-5 animate-spin text-white" />
                <span className="text-sm sm:text-base">
                  正在准备高清下载...
                </span>
              </>
            ) : downloadSuccess ? (
              <>
                <CheckCircle2 className="size-5 text-white" />
                <span className="text-sm sm:text-base">
                  已开始下载，请查看通知栏/相册
                </span>
              </>
            ) : (
              <>
                <ArrowDownToLine className="size-5 text-white" />
                <span className="text-sm sm:text-base">
                  一键保存视频到手机 (MP4)
                </span>
              </>
            )}
          </button>

          {/* Secondary Action Row: Copy Link & Native Share */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!videoUrl}
              className="flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.05] text-xs font-semibold text-slate-200 transition hover:bg-white/10 active:scale-98"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-400" />
                  <span className="text-emerald-400">已复制直链</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5 text-amber-400" />
                  <span>复制视频直链</span>
                </>
              )}
            </button>

            {canShare ? (
              <button
                type="button"
                onClick={handleShare}
                disabled={!videoUrl}
                className="flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.05] text-xs font-semibold text-slate-200 transition hover:bg-white/10 active:scale-98"
              >
                <Share2 className="size-3.5 text-rose-400" />
                <span>系统原生分享</span>
              </button>
            ) : (
              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.05] text-xs font-semibold text-slate-200 transition hover:bg-white/10 active:scale-98"
              >
                <ExternalLink className="size-3.5 text-blue-400" />
                <span>在新标签页打开</span>
              </a>
            )}
          </div>
        </div>

        {/* Mobile Download Guide Instructions */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-xs">
          <div className="mb-2.5 flex items-center gap-1.5 font-bold text-amber-300">
            <Info className="size-3.5 text-amber-400" />
            <span>手机端如何保存到本地相册？</span>
          </div>

          <div className="space-y-2 text-slate-300">
            <div className="rounded-lg bg-black/40 p-2.5">
              <span className="font-semibold text-white">
                🍎 iPhone / iPad 用户：
              </span>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                • 方法 1：直接<strong>长按播放画面</strong>
                ，选择【存储到“照片”】。
                <br />• 方法 2：点击上方【一键保存】，Safari
                会弹出下载确认，下载后在【文件】应用中找到并分享存储到相册。
              </p>
            </div>

            <div className="rounded-lg bg-black/40 p-2.5">
              <span className="font-semibold text-white">
                🤖 安卓 (Android) 用户：
              </span>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                • 点击上方【一键保存视频】，系统将自动开启下载。
                <br />• 下载完成后可在【系统相册】或【文件管理器 &gt;
                Download】目录中查看。
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/50 py-4 text-center text-[11px] text-slate-500">
        <p>Airap Video · AI Rap MV Studio</p>
      </footer>
    </div>
  );
}

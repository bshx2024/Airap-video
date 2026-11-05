'use client';

import React, { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  QrCode,
  RefreshCw,
  Smartphone,
  Sparkles,
  Wifi,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { downloadFile } from '@/lib/download';

interface MobileVideoDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl?: string;
  title?: string;
  filename?: string;
}

export function MobileVideoDownloadModal({
  isOpen,
  onClose,
  videoUrl,
  title = 'AI Rap Video',
  filename = 'ai-rap-video.mp4',
}: MobileVideoDownloadModalProps) {
  const [mobileDownloadUrl, setMobileDownloadUrl] = useState<string>('');
  const [directVideoUrl, setDirectVideoUrl] = useState<string>('');
  const [lanIp, setLanIp] = useState<string>('');
  const [isLocalhost, setIsLocalhost] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<'landing' | 'direct'>('landing');
  const [qrProviderIndex, setQrProviderIndex] = useState(0);
  const [qrFailed, setQrFailed] = useState(false);
  const [isDownloadingPc, setIsDownloadingPc] = useState(false);

  // Fetch resolved mobile download URL (with LAN IP conversion if running locally)
  useEffect(() => {
    if (!isOpen || !videoUrl) return;

    let isMounted = true;
    setIsLoading(true);
    setQrFailed(false);
    setQrProviderIndex(0);

    const fetchQrInfo = async () => {
      try {
        const query = new URLSearchParams({
          url: videoUrl,
          title,
          filename,
        });

        const res = await fetch(`/api/video/qr-info?${query.toString()}`);
        const data = await res.json();

        if (isMounted && data?.data) {
          setMobileDownloadUrl(data.data.mobileDownloadUrl);
          setDirectVideoUrl(data.data.directVideoUrl || videoUrl);
          setLanIp(data.data.lanIp || '');
          setIsLocalhost(data.data.isLocalhost || false);
        } else {
          throw new Error('API returned empty data');
        }
      } catch {
        // Fallback using client origin
        if (isMounted) {
          const origin =
            typeof window !== 'undefined' ? window.location.origin : '';
          const fallbackParams = new URLSearchParams({
            url: videoUrl,
            title,
            filename,
          });
          setMobileDownloadUrl(
            `${origin}/mobile-video-download?${fallbackParams.toString()}`
          );
          setDirectVideoUrl(videoUrl);
          setIsLocalhost(
            typeof window !== 'undefined' &&
              window.location.hostname === 'localhost'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchQrInfo();

    return () => {
      isMounted = false;
    };
  }, [isOpen, videoUrl, title, filename]);

  // Lock body scroll & listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !videoUrl) return null;

  const currentQrTarget =
    activeTab === 'landing' ? mobileDownloadUrl : directVideoUrl;

  // QR providers fallback chain
  const qrProviders = currentQrTarget
    ? [
        `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${encodeURIComponent(
          currentQrTarget
        )}`,
        `https://quickchart.io/qr?text=${encodeURIComponent(
          currentQrTarget
        )}&size=280&margin=2`,
        `https://chart.googleapis.com/chart?chs=280x280&cht=qr&chl=${encodeURIComponent(
          currentQrTarget
        )}`,
      ]
    : [];

  const handleQrError = () => {
    if (qrProviderIndex + 1 < qrProviders.length) {
      setQrProviderIndex((prev) => prev + 1);
    } else {
      setQrFailed(true);
    }
  };

  const handleCopyLink = () => {
    if (!currentQrTarget) return;
    navigator.clipboard.writeText(currentQrTarget);
    toast.success('📱 下载链接已复制到剪贴板！');
  };

  const handlePcDownload = async () => {
    if (!videoUrl || isDownloadingPc) return;
    setIsDownloadingPc(true);
    try {
      await downloadFile(videoUrl, filename);
      toast.success('已开始电脑本地下载！');
    } catch {
      toast.error('下载遇到问题，请重试');
    } finally {
      setIsDownloadingPc(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="animate-in fade-in-0 fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="animate-in zoom-in-95 relative z-10 w-full max-w-md rounded-3xl border border-amber-500/30 bg-gradient-to-b from-slate-900 via-slate-950 to-black p-6 text-center text-white shadow-2xl shadow-amber-500/20 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 flex size-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
        >
          <X className="size-4" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5 text-center">
          <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300">
            <Smartphone className="size-3.5" />
            <span>手机扫码保存视频</span>
          </div>

          <h3 className="text-xl font-black tracking-wide text-white">
            {title}
          </h3>

          <p className="text-xs text-white/60">
            支持微信、系统相机或浏览器扫码，直接保存至手机相册
          </p>
        </div>

        {/* Tab Switcher: Landing page vs Direct video */}
        <div className="mt-3.5 inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('landing');
              setQrProviderIndex(0);
              setQrFailed(false);
            }}
            className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-bold transition-all ${
              activeTab === 'landing'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-white/70 hover:text-white'
            }`}
          >
            📱 手机下载页 (推荐)
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('direct');
              setQrProviderIndex(0);
              setQrFailed(false);
            }}
            className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-bold transition-all ${
              activeTab === 'direct'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-white/70 hover:text-white'
            }`}
          >
            🔗 视频直链二维码
          </button>
        </div>

        {/* QR Code Container */}
        <div className="relative mx-auto my-4 flex size-60 items-center justify-center rounded-2xl border-2 border-amber-400/30 bg-white p-3.5 shadow-xl">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 text-slate-800">
              <Loader2 className="size-8 animate-spin text-amber-500" />
              <span className="text-xs font-bold">正在生成二维码...</span>
            </div>
          ) : qrFailed ? (
            <div className="flex flex-col items-center gap-2 p-2 text-slate-700">
              <QrCode className="size-10 text-amber-500" />
              <p className="text-[11px] leading-relaxed font-medium">
                二维码预览受阻。点击下方按钮直接复制链接发送给手机：
              </p>
              <button
                type="button"
                onClick={handleCopyLink}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-black transition hover:bg-amber-400"
              >
                复制手机下载链接
              </button>
            </div>
          ) : (
            <div className="relative size-full overflow-hidden rounded-xl bg-white">
              <img
                key={`${activeTab}-${qrProviderIndex}`}
                src={qrProviders[qrProviderIndex]}
                alt="Mobile Download QR Code"
                onError={handleQrError}
                className="size-full object-contain"
              />
            </div>
          )}
        </div>

        {/* LAN Wi-Fi notice if running locally */}
        {isLocalhost && (
          <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-left text-[11px] text-amber-300">
            <div className="flex items-center gap-1.5 font-bold text-amber-400">
              <Wifi className="size-3 shrink-0" />
              <span>局域网联调：手机需连接电脑相同 Wi-Fi ({lanIp})</span>
            </div>
            <p className="mt-1 text-[10px] leading-snug text-white/70">
              若手机 Chrome 无法打开：请暂时断开手机上的{' '}
              <strong>VPN/代理</strong>（或开启绕过局域网），并确认是{' '}
              <span className="font-mono text-amber-200">http://</span> 而非
              https://。
            </p>
          </div>
        )}

        {/* Action Row */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleCopyLink}
            disabled={isLoading || !currentQrTarget}
            className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition hover:from-amber-400 hover:to-amber-500 active:scale-[0.99]"
          >
            <Copy className="size-3.5" />
            <span>复制手机下载链接</span>
          </button>

          <button
            type="button"
            onClick={handlePcDownload}
            disabled={isDownloadingPc}
            className="flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            {isDownloadingPc ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>正在下载到电脑...</span>
              </>
            ) : (
              <>
                <Download className="size-3.5" />
                <span>同时保存一份到电脑</span>
              </>
            )}
          </button>
        </div>

        {/* Tips Footer */}
        <p className="mt-3.5 text-[11px] text-white/50">
          💡 iPhone 长按视频可存入相册 · 微信内请在右上角选择浏览器打开
        </p>
      </div>
    </div>
  );
}

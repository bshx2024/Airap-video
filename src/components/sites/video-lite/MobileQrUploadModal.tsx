import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Copy,
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

interface MobileQrUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: 1 | 2;
  roleName: string;
  onSuccess: (imageUrl: string, fileName?: string) => void;
}

export function MobileQrUploadModal({
  isOpen,
  onClose,
  slot,
  roleName,
  onSuccess,
}: MobileQrUploadModalProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string>('');
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isReceived, setIsReceived] = useState(false);
  const [qrProviderIndex, setQrProviderIndex] = useState(0);
  const [qrFailed, setQrFailed] = useState(false);

  // Initialize or reset session when opened
  const initSession = async () => {
    setIsLoadingSession(true);
    setIsReceived(false);
    setQrFailed(false);
    setQrProviderIndex(0);
    try {
      const res = await fetch('/api/ai/rap/upload-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          slot,
          role: roleName,
        }),
      });
      const data = await res.json();
      if (data?.data?.sessionId) {
        setSessionId(data.data.sessionId);
        setUploadUrl(data.data.uploadUrl);
      } else {
        throw new Error(data?.message || 'Failed to create upload session');
      }
    } catch (err: any) {
      toast.error('Failed to create QR code session. Please retry.');
      console.error(err);
    } finally {
      setIsLoadingSession(false);
    }
  };

  // Lock body scroll and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    initSession();

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
  }, [isOpen, slot, roleName]);

  // Polling session status
  useEffect(() => {
    if (!isOpen || !sessionId || isReceived) return;

    const timer = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/ai/rap/upload-session?sessionId=${encodeURIComponent(sessionId)}`
        );
        const json = await res.json();
        const data = json?.data;

        if (data?.status === 'completed' && data.imageUrls?.length > 0) {
          setIsReceived(true);
          const beamedUrl = data.imageUrls[0];
          const beamedName = data.filename || `mobile-photo-slot-${slot}.png`;

          toast.success(`🎉 Photo received from phone for ${roleName}!`);
          onSuccess(beamedUrl, beamedName);

          // Close modal after brief success display
          setTimeout(() => {
            onClose();
          }, 1200);
        } else if (data?.status === 'expired') {
          toast.error('QR code session expired. Generating new session...');
          initSession();
        }
      } catch (e) {
        console.warn('Polling error:', e);
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [isOpen, sessionId, isReceived, slot, roleName, onSuccess, onClose]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (!uploadUrl) return;
    navigator.clipboard.writeText(uploadUrl);
    toast.success('Mobile upload link copied to clipboard!');
  };

  // Multi-provider fallback list for QR codes
  const qrProviders = uploadUrl
    ? [
        `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(uploadUrl)}`,
        `https://quickchart.io/qr?text=${encodeURIComponent(uploadUrl)}&size=280&margin=2`,
        `https://chart.googleapis.com/chart?chs=280x280&cht=qr&chl=${encodeURIComponent(uploadUrl)}`,
      ]
    : [];

  const handleQrError = () => {
    if (qrProviderIndex + 1 < qrProviders.length) {
      setQrProviderIndex((prev) => prev + 1);
    } else {
      setQrFailed(true);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="animate-in fade-in-0 fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
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
            <span>Beam Photo from Phone</span>
          </div>

          <h3 className="text-xl font-black tracking-wide text-white">
            Upload for {roleName}
          </h3>

          <p className="text-xs text-white/60">
            Scan with your phone camera or WeChat to select from album
          </p>
        </div>

        {/* QR Code Container */}
        <div className="relative mx-auto my-4 flex size-56 items-center justify-center rounded-2xl border-2 border-amber-400/30 bg-white p-3 shadow-inner">
          {isLoadingSession ? (
            <div className="flex flex-col items-center gap-2 text-slate-800">
              <Loader2 className="size-8 animate-spin text-amber-500" />
              <span className="text-xs font-bold">Generating QR Code...</span>
            </div>
          ) : isReceived ? (
            <div className="animate-in zoom-in-95 flex flex-col items-center justify-center text-emerald-600">
              <CheckCircle2 className="size-16 animate-bounce" />
              <span className="mt-2 text-xs font-black">Sync Complete!</span>
              <span className="text-[10px] text-slate-500">
                Applying to studio...
              </span>
            </div>
          ) : qrFailed ? (
            <div className="flex flex-col items-center gap-2 p-2 text-slate-700">
              <QrCode className="size-10 text-amber-500" />
              <p className="text-center text-[11px] font-medium">
                QR preview unavailable. Click below to copy or open link
                directly:
              </p>
              <button
                type="button"
                onClick={handleCopyLink}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-black transition hover:bg-amber-400"
              >
                Copy Mobile Link
              </button>
            </div>
          ) : (
            <div className="relative size-full overflow-hidden rounded-xl">
              <img
                key={qrProviderIndex}
                src={qrProviders[qrProviderIndex]}
                alt="Mobile Upload QR Code"
                onError={handleQrError}
                className="size-full object-contain"
              />
              {/* Radar Scanner Line */}
              <div className="pointer-events-none absolute inset-x-0 h-1 animate-[bounce_2.5s_infinite] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_8px_#f59e0b]" />
            </div>
          )}
        </div>

        {/* Live Status Indicator */}
        <div className="flex items-center justify-center gap-2 text-xs">
          {isReceived ? (
            <span className="flex items-center gap-1.5 font-bold text-emerald-400">
              <CheckCircle2 className="size-3.5" />
              <span>Photo beamed to PC!</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-300/90">
              <span className="size-2 animate-ping rounded-full bg-amber-400" />
              <span className="text-[11px]">
                Waiting for mobile phone scan...
              </span>
            </span>
          )}
        </div>

        {/* Link Actions */}
        <div className="mt-3 flex items-center justify-center gap-2 border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={handleCopyLink}
            disabled={!uploadUrl}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            <Copy className="size-3 text-amber-400" />
            <span>Copy Link</span>
          </button>

          {uploadUrl && (
            <a
              href={uploadUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              <ExternalLink className="size-3 text-amber-400" />
              <span>Open in Tab</span>
            </a>
          )}

          <button
            type="button"
            onClick={initSession}
            title="Refresh QR Code"
            className="flex size-7 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className="size-3" />
          </button>
        </div>

        {/* Wi-Fi & LAN Notice */}
        <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-2.5 text-left text-[11px] leading-relaxed text-amber-200/90">
          <p className="flex items-center gap-1 font-bold text-amber-300">
            <Wifi className="size-3 text-amber-400" />
            <span>手机扫码提示：</span>
          </p>
          <p className="mt-1 text-[10px] text-white/75">
            1. 请确保手机与电脑在<strong>同一 Wi-Fi 网络</strong>（勿用手机
            4G/5G 流量）。
          </p>
          <p className="mt-0.5 text-[10px] text-white/75">
            2. <strong>若 Chrome 打不开</strong>：请关闭手机上的{' '}
            <strong>VPN/代理软件</strong>
            （或在代理中开启【绕过局域网】），并确保网址为{' '}
            <span className="font-mono text-amber-300">http://</span> 而非
            https://。
          </p>
          <p className="mt-0.5 truncate text-[10px] text-white/60">
            3. 直连地址：
            <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-[9px] text-amber-300">
              {uploadUrl || 'http://192.168.1.2:3000/...'}
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}

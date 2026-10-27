import { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import {
  Camera,
  CheckCircle2,
  Image as ImageIcon,
  Laptop,
  Loader2,
  RefreshCw,
  Send,
  Smartphone,
  Sparkles,
} from 'lucide-react';

export const Route = createFileRoute('/mobile-rap-upload')({
  component: MobileRapUploadPage,
});

function MobileRapUploadPage() {
  const [sessionId, setSessionId] = useState<string>('');
  const [slot, setSlot] = useState<string>('1');
  const [roleName, setRoleName] = useState<string>('Lead MC');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      setSessionId(searchParams.get('sessionId') || '');
      const s = searchParams.get('slot') || '1';
      setSlot(s);
      setRoleName(searchParams.get('role') || (s === '1' ? 'Lead MC' : 'Hype MC'));
    }
  }, []);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('Image exceeds 15MB limit. Please choose a smaller photo.');
      return;
    }

    setErrorMessage(null);
    setFileName(file.name);
    setFileSize((file.size / 1024 / 1024).toFixed(1) + ' MB');

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read file. Please try another photo.');
    };
    reader.readAsDataURL(file);
  };

  const handleSendToPc = async () => {
    if (!imagePreview) {
      setErrorMessage('Please select or take a photo first.');
      return;
    }
    if (!sessionId) {
      setErrorMessage('Session expired or invalid. Please scan the QR code again on PC.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/ai/rap/upload-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'upload',
          sessionId,
          slot: Number(slot),
          imageUrl: imagePreview,
          filename: fileName,
        }),
      });

      const data = await res.json();
      if (res.ok && data?.code === 0) {
        setIsDone(true);
      } else {
        throw new Error(data?.message || data?.error || 'Failed to beam photo to PC');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-between bg-slate-950 font-sans text-slate-100 antialiased selection:bg-amber-500 selection:text-black">
      {/* Background Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[300px] w-[500px] rounded-full bg-amber-500/10 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-rose-500/10 blur-[90px]" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 border-b border-white/10 bg-black/60 px-5 py-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
              <Sparkles className="size-4" />
            </span>
            <div>
              <h1 className="text-sm font-extrabold tracking-wide text-white">
                AI RAP MV STUDIO
              </h1>
              <p className="text-[10px] text-amber-400 font-mono">
                Mobile Beam Sync
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-300">
            <Smartphone className="size-3.5" />
            <span>Slot {slot}: {roleName}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-6">
        {isDone ? (
          /* Success Screen */
          <div className="flex flex-col items-center rounded-3xl border border-emerald-500/30 bg-emerald-950/20 p-8 text-center backdrop-blur-xl shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="relative mb-5 flex size-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 ring-8 ring-emerald-500/10">
              <CheckCircle2 className="size-10 animate-bounce" />
            </div>
            <h2 className="text-xl font-black text-white">
              Photo Beamed to PC!
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-emerald-200/80">
              Your photo is now active on your computer screen. You can continue directing your Rap MV on your desktop!
            </p>

            <div className="mt-6 flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-xs text-white/80">
              <Laptop className="size-4 text-amber-400" />
              <span>Check your PC browser now</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsDone(false);
                setImagePreview(null);
                setFileName('');
              }}
              className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-white/50 transition hover:text-white"
            >
              <RefreshCw className="size-3" />
              <span>Send another photo</span>
            </button>
          </div>
        ) : (
          /* Upload State */
          <div className="flex flex-col">
            <div className="mb-4 text-center">
              <h2 className="text-lg font-black text-white">
                Upload from Phone Camera / Album
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Choose a portrait or selfie for <strong className="text-amber-300">{roleName}</strong>
              </p>
            </div>

            {/* Photo Picker Box */}
            <label
              htmlFor="mobile-photo-file"
              className={`group relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed transition-all active:scale-[0.98] ${
                imagePreview
                  ? 'border-amber-400/80 bg-black/60 shadow-[0_0_30px_rgba(245,158,11,0.2)]'
                  : 'border-white/20 bg-white/[0.03] hover:border-amber-400/50 hover:bg-white/[0.06]'
              }`}
            >
              <input
                id="mobile-photo-file"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {imagePreview ? (
                <div className="relative flex size-full flex-col items-center justify-center p-4">
                  <div className="relative size-44 overflow-hidden rounded-2xl border-2 border-amber-400/60 shadow-xl">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="size-full object-cover"
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="truncate max-w-[200px] text-xs font-bold text-white">
                      {fileName}
                    </span>
                    <span className="text-[10px] text-white/50">{fileSize}</span>
                  </div>
                  <span className="mt-1 text-[11px] font-semibold text-amber-300">
                    Tap to replace photo
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center p-6 text-center">
                  <div className="mb-3 flex size-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                    <Camera className="size-8" />
                  </div>
                  <p className="text-sm font-bold text-white">
                    Tap to Open Camera or Photos
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Supports JPG, PNG, WEBP, HEIC
                  </p>
                  <div className="mt-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/70">
                    <ImageIcon className="size-3 text-amber-400" />
                    <span>Instant PC Synchronization</span>
                  </div>
                </div>
              )}
            </label>

            {/* Error Message */}
            {errorMessage && (
              <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
                {errorMessage}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="button"
              disabled={!imagePreview || isSubmitting}
              onClick={handleSendToPc}
              className={`mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black transition-all shadow-lg active:scale-95 ${
                !imagePreview || isSubmitting
                  ? 'cursor-not-allowed bg-white/10 text-white/40'
                  : 'bg-gradient-to-r from-amber-500 to-rose-500 text-black shadow-amber-500/25 hover:from-amber-400 hover:to-rose-400'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin text-black" />
                  <span>Beaming to PC...</span>
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  <span>🚀 Beam to PC Screen (传至电脑)</span>
                </>
              )}
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-5 py-4 text-center text-[11px] text-white/40">
        AI Rap MV Studio · Mobile Bridge · End-to-end encrypted
      </footer>
    </div>
  );
}

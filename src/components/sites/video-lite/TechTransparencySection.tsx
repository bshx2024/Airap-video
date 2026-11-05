'use client';

import React from 'react';
import { Link } from '@tanstack/react-router';
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  ShieldCheck,
  Video,
} from 'lucide-react';

export function TechTransparencySection() {
  return (
    <section
      id="technical-transparency"
      className="bg-[#030611] px-4 py-16 text-white transition-colors sm:px-6 sm:py-20"
    >
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1 text-xs font-semibold text-purple-300">
            <Cpu className="size-3.5 text-purple-400" />
            <span>Verified Quality Standards</span>
          </div>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
            Production Quality & Zero-Risk SLA
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-slate-300 sm:text-sm">
            Genuine 1080P output, verified audio-visual alignment, and an
            automated credit protection guarantee.
          </p>
        </div>

        {/* 3 Core Quality Pillars */}
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#080d1a] p-5 shadow-lg">
            <div className="flex items-center gap-2 text-amber-400">
              <CheckCircle2 className="size-4" />
              <h3 className="text-sm font-bold text-white">
                Suno v4 + Kling 4.0 Studio
              </h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Suno v4 generates rhyming lyrics and 44.1kHz beats. Kling 4.0
              Studio delivers 128-point lip-sync.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#080d1a] p-5 shadow-lg">
            <div className="flex items-center gap-2 text-cyan-400">
              <Video className="size-4" />
              <h3 className="text-sm font-bold text-white">
                Native 1080P 30 FPS Export
              </h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Authentic 1080×1920 (9:16) vertical export at 30 FPS without
              artificial upscaling blur.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#080d1a] p-5 shadow-lg">
            <div className="flex items-center gap-2 text-emerald-400">
              <ShieldCheck className="size-4" />
              <h3 className="text-sm font-bold text-white">
                100% Automated Refund SLA
              </h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              GPU timeouts or errors auto-refund 100% of consumed credits within
              2 seconds.
            </p>
          </div>
        </div>

        {/* Link to Benchmark Guide */}
        <div className="mt-6 text-center">
          <Link
            to="/compare"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-300 transition-colors hover:text-purple-200"
          >
            <span>
              Compare models and workflow benchmarks in our 2026 Guide
            </span>
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}

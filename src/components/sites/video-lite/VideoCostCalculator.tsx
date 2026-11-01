'use client';

import React, { useState } from 'react';
import { Calculator, CheckCircle2, Coins, Sparkles } from 'lucide-react';
import { getRapCostCredits } from '@/config/rap-presets';

export function VideoCostCalculator() {
  const [duration, setDuration] = useState<number>(15);
  const [resolution, setResolution] = useState<'720P' | '1080P'>('1080P');
  const [mode, setMode] = useState<'duo' | 'solo'>('duo');

  const baseCredits = getRapCostCredits(duration);
  // Estimate video yields across plans
  const starterCredits = 600;
  const proCredits = 1800;
  const masterCredits = 4800;

  const starterVideos = Math.floor(starterCredits / baseCredits);
  const proVideos = Math.floor(proCredits / baseCredits);
  const masterVideos = Math.floor(masterCredits / baseCredits);

  return (
    <div id="cost-calculator" className="mx-auto max-w-5xl px-4 py-12">
      <div className="rounded-3xl border border-amber-500/30 bg-[#0d1425] p-6 shadow-2xl backdrop-blur-xl sm:p-10">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-300">
            <Calculator className="size-3.5 text-amber-400" />
            <span>Interactive Cost Transparency</span>
          </div>
          <h3 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
            How Much Does One AI Rap Video Cost?
          </h3>
          <p className="mt-2 max-w-xl text-xs text-slate-300 sm:text-sm">
            Calculate exact credit consumption and see estimated monthly video output for your chosen format.
          </p>
        </div>

        {/* Calculator Controls */}
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {/* Duration Selector */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2.5">
              Video Duration:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 15].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`rounded-xl py-2 text-xs font-bold transition-all ${
                    duration === d
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 ring-1 ring-amber-400'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          {/* Resolution Selector */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2.5">
              Resolution:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['720P', '1080P'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setResolution(r)}
                  className={`rounded-xl py-2 text-xs font-bold transition-all ${
                    resolution === r
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 ring-1 ring-amber-400'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Mode Selector */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2.5">
              Creation Mode:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('duo')}
                className={`rounded-xl py-2 text-xs font-bold transition-all ${
                  mode === 'duo'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 ring-1 ring-amber-400'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                Duo Battle
              </button>
              <button
                type="button"
                onClick={() => setMode('solo')}
                className={`rounded-xl py-2 text-xs font-bold transition-all ${
                  mode === 'solo'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 ring-1 ring-amber-400'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                Solo MC
              </button>
            </div>
          </div>
        </div>

        {/* Calculation Result Callout */}
        <div className="mt-8 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-slate-900/40 p-6 text-center">
          <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
            Total Generation Cost:
          </div>
          <div className="mt-1 flex items-center justify-center gap-2">
            <Coins className="size-7 text-amber-400" />
            <span className="text-4xl font-black text-white sm:text-5xl">
              {baseCredits}
            </span>
            <span className="text-lg font-bold text-amber-300">Credits</span>
          </div>
          <p className="mt-2 text-xs text-slate-300">
            For <strong>{duration} seconds</strong> · <strong>{resolution}</strong> · <strong>{mode === 'duo' ? 'Duo Rap Battle (2 Photos)' : 'Solo Rap'}</strong> (including AI lyrics, 808 beats, lip sync & video export)
          </p>

          {/* Yields Breakdown across plans */}
          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-center">
            <div>
              <span className="text-[11px] text-slate-400 block">Starter Plan:</span>
              <strong className="text-sm font-bold text-white sm:text-base">
                ~{starterVideos} Videos/mo
              </strong>
            </div>
            <div>
              <span className="text-[11px] text-amber-300 block">Creator Pro (Best):</span>
              <strong className="text-sm font-bold text-amber-300 sm:text-base">
                ~{proVideos} Videos/mo
              </strong>
            </div>
            <div>
              <span className="text-[11px] text-purple-300 block">Studio Master:</span>
              <strong className="text-sm font-bold text-purple-300 sm:text-base">
                ~{masterVideos} Videos/mo
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

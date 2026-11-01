'use client';

import React from 'react';
import { Camera, CheckCircle2, Film, Mic, Sparkles, Wand2 } from 'lucide-react';

const HOW_TO_STEPS = [
  {
    step: '01',
    title: 'Step 1: Choose Your Rap Video Style',
    desc: 'Select the Migos Orange Studio, Duo Rap Battle, Solo Rap, or Pet Rap preset.',
    icon: Sparkles,
  },
  {
    step: '02',
    title: 'Step 2: Upload Your Photos',
    desc: 'Upload one or two clear portrait photos. For a duo battle, you can use two separate selfies.',
    icon: Camera,
  },
  {
    step: '03',
    title: 'Step 3: Create Your Rap',
    desc: 'Enter a topic, joke, birthday message, or roast idea. Choose your preferred music style and customize the lyrics.',
    icon: Mic,
  },
  {
    step: '04',
    title: 'Step 4: Generate and Share',
    desc: 'Generate your AI rap video, preview the result, and export it in a supported format for TikTok, Instagram Reels, or YouTube Shorts.',
    icon: Film,
  },
];

export function VideoHowItWorks() {
  return (
    <section
      id="how-it-works"
      className="bg-[#050813] px-4 py-20 text-white transition-colors sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-7xl">
        <header className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-300">
            <Wand2 className="size-3.5 text-amber-400" />
            <span>Fast 4-Step Creation Workflow</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            How to Make an AI Rap Video from Photos
          </h2>
          <p className="mx-auto mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">
            No filming, singing, or professional editing required. Turn selfies into viral TikTok rap battles in four simple steps.
          </p>
        </header>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_TO_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <article
                key={step.step}
                className="relative flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0c1322] p-7 transition-all duration-300 hover:border-amber-400/30 hover:bg-[#10192d] hover:shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black tracking-widest text-amber-400 uppercase">
                      STEP {step.step}
                    </span>
                    <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                      <Icon className="size-4" />
                    </div>
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
                    {step.desc}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

'use client';

import React from 'react';
import {
  AlertTriangle,
  Coins,
  FileCheck,
  Headphones,
  Lock,
  RefreshCcw,
  Shield,
  ShieldCheck,
} from 'lucide-react';

const TRUST_ITEMS = [
  {
    id: 'pricing',
    title: 'Transparent Pricing',
    desc: 'See the exact credit cost before generating your video. No surprise deductions, hidden subscription traps, or unannounced charges.',
    icon: Coins,
    linkText: 'View Pricing Table',
    href: '#pricing',
  },
  {
    id: 'rights',
    title: 'Clear Usage Rights',
    desc: 'Commercial-use permissions for self-media monetization on TikTok, Instagram Reels, and YouTube Shorts. All generated music is copyright-safe.',
    icon: FileCheck,
    linkText: 'Terms of Service',
    href: '/terms',
  },
  {
    id: 'privacy',
    title: 'Photo Privacy & Data Security',
    desc: 'Your uploaded photos are strictly used for your video synthesis tasks and automatically purged in accordance with our data retention policy. Never shared or sold.',
    icon: Lock,
    linkText: 'Privacy Policy',
    href: '/privacy',
  },
  {
    id: 'refunds',
    title: 'Automatic Failure Refunds',
    desc: 'If an AI generation task fails due to server load, timeout, or backend errors, the credits consumed are automatically refunded back to your balance.',
    icon: RefreshCcw,
    linkText: 'Refund Policy',
    href: '/refund-policy',
  },
  {
    id: 'support',
    title: 'Real Human Support',
    desc: 'Dedicated creator support for billing inquiries, prompt advice, or API questions. We respond promptly to keep your content schedule moving.',
    icon: Headphones,
    linkText: 'Contact Support',
    href: 'mailto:support@airap-video.net',
  },
];

export function TrustSafetySection() {
  return (
    <section
      id="trust-and-safety"
      className="bg-[#040713] px-4 py-20 text-white transition-colors sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-300">
            <ShieldCheck className="size-3.5 text-emerald-400" />
            <span>Trust, Privacy & Ethical AI</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Create with Confidence
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">
            We are committed to transparent pricing, strict portrait privacy protection, and ethical creator standards.
          </p>
        </div>

        {/* 5 Core Pillars */}
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TRUST_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#090e1d] p-7 transition-all duration-300 hover:border-emerald-400/30 hover:bg-[#0c1429]"
              >
                <div>
                  <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-5 text-base font-bold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
                    {item.desc}
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-white/5">
                  <a
                    href={item.href}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    {item.linkText} ➔
                  </a>
                </div>
              </div>
            );
          })}

          {/* Ethical AI Card */}
          <div className="flex flex-col justify-between rounded-2xl border border-amber-500/25 bg-amber-500/[0.04] p-7 sm:col-span-2 lg:col-span-1">
            <div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                <AlertTriangle className="size-5" />
              </div>
              <h3 className="mt-5 text-base font-bold text-white">
                Responsible AI Guidelines
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
                Airap strictly prohibits unauthorized impersonation, non-consensual sexualized media, deceptive deepfakes, hate speech, or harassment. Always secure permission before animating photos of real individuals.
              </p>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-3">
              <a
                href="/acceptable-use-policy"
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
              >
                Acceptable Use Policy (AUP) ➔
              </a>
              <span className="text-[11px] font-semibold text-amber-300/80">
                Community Standard
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

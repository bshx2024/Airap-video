import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { getPublicSiteMetaFn } from '@/modules/config/server';
import { m } from '@/paraglide/messages.js';
import { getLocale, locales, localizeUrl } from '@/paraglide/runtime.js';
import { Pricing } from '@/blocks/pricing';
import { SupportWidget } from '@/blocks/support-widget';
import { VideoCta } from '@/components/sites/video-lite/VideoCta';
import { VideoFaq } from '@/components/sites/video-lite/VideoFaq';
import { VideoFeatures } from '@/components/sites/video-lite/VideoFeatures';
import { VideoFooter } from '@/components/sites/video-lite/VideoFooter';
import { VideoHeader } from '@/components/sites/video-lite/VideoHeader';
import { VideoHeroGenerator } from '@/components/sites/video-lite/VideoHeroGenerator';
import { VideoMarquee } from '@/components/sites/video-lite/VideoMarquee';
import { VideoHowItWorks } from '@/components/sites/video-lite/VideoHowItWorks';
import { VideoPromptInspirations } from '@/components/sites/video-lite/VideoPromptInspirations';
import { VideoUseCases } from '@/components/sites/video-lite/VideoUseCases';
import { WhatIsVideoGenerator } from '@/components/sites/video-lite/WhatIsVideoGenerator';
import { AiRapHeroGenerator } from '@/components/sites/video-lite/AiRapHeroGenerator';
import { cn } from '@/lib/utils';

function HomePage() {
  const [generatorMode, setGeneratorMode] = useState<'rap' | 'classic'>('rap');
  const [selectedPrompt, setSelectedPrompt] = useState<{
    prompt: string;
    model: string;
    sourceImage?: string;
    /** Clear previous media/result before applying */
    reset?: boolean;
    /** Publish local/bundled media to storage immediately after attach */
    publishMedia?: boolean;
    /** Switch generator into reference-to-video mode */
    referenceMode?: boolean;
  } | null>(null);

  const handleUsePrompt = (prompt: string, model: string) => {
    setSelectedPrompt({ prompt, model, reset: true });
  };

  const handleUseVideo = (prompt: string, model: string, mediaUrl: string) => {
    setSelectedPrompt({
      prompt,
      model,
      sourceImage: mediaUrl,
      reset: true,
      publishMedia: true,
      referenceMode: true,
    });
  };

  return (
    <div className="video-home-page bg-background text-foreground min-h-screen font-sans antialiased transition-colors dark:bg-[#020617] dark:text-white">
      <VideoHeader />
      <main>
        {/* Generator Mode Switcher */}
        <div className="pt-24 pb-2 text-center bg-[#020617]">
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1.5 shadow-xl backdrop-blur-md">
            <button
              type="button"
              onClick={() => setGeneratorMode('rap')}
              className={cn(
                'cursor-pointer rounded-full px-5 py-2 text-xs font-bold transition-all sm:text-sm',
                generatorMode === 'rap'
                  ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white shadow-lg shadow-amber-500/25'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              🔥 AI Rap MV Studio
            </button>
            <button
              type="button"
              onClick={() => setGeneratorMode('classic')}
              className={cn(
                'cursor-pointer rounded-full px-5 py-2 text-xs font-bold transition-all sm:text-sm',
                generatorMode === 'classic'
                  ? 'bg-white/15 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              🎬 Classic Video Generator
            </button>
          </div>
        </div>

        {generatorMode === 'rap' ? (
          <AiRapHeroGenerator />
        ) : (
          <VideoHeroGenerator
            externalPrompt={selectedPrompt}
            onClearExternalPrompt={() => setSelectedPrompt(null)}
          />
        )}
        <VideoMarquee
          onSelectPrompt={(prompt, videoUrl) => {
            handleUseVideo(prompt, 'sora-2', videoUrl);
            const el = document.getElementById('generator');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        />
        <WhatIsVideoGenerator />
        <VideoHowItWorks />
        <VideoFeatures />
        <VideoUseCases />
        <VideoPromptInspirations onUsePrompt={handleUsePrompt} />
        <div className="text-foreground bg-white transition-colors dark:bg-[#060a13]">
          <Pricing isSection showFaq={false} />
        </div>
        <VideoFaq />
        <VideoCta />
      </main>
      <VideoFooter />
      <SupportWidget />
    </div>
  );
}

export const Route = createFileRoute('/')({
  loader: async () => {
    const locale = getLocale();
    const site = await getPublicSiteMetaFn();
    return {
      locale,
      appName: site.appName,
      appUrl: site.appUrl,
      appDescription: site.appDescription,
    };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const appName = loaderData?.appName || envConfigs.app_name;
    const appUrl = loaderData?.appUrl || envConfigs.app_url;
    const urlFor = (loc: string) =>
      localizeUrl(`${appUrl}/`, { locale: loc as any }).href;
    const title = m['landing.meta.title']({}, { locale: locale as any });
    const description =
      m['landing.meta.description']({}, { locale: locale as any }) ||
      loaderData?.appDescription ||
      envConfigs.app_description;

    const faqData = [
      {
        q: m['landing.video_faq.1.question']({}, { locale: locale as any }),
        a: m['landing.video_faq.1.answer']({}, { locale: locale as any }),
      },
      {
        q: m['landing.video_faq.2.question']({}, { locale: locale as any }),
        a: m['landing.video_faq.2.answer']({}, { locale: locale as any }),
      },
      {
        q: m['landing.video_faq.3.question']({}, { locale: locale as any }),
        a: m['landing.video_faq.3.answer']({}, { locale: locale as any }),
      },
      {
        q: m['landing.video_faq.4.question']({}, { locale: locale as any }),
        a: m['landing.video_faq.4.answer']({}, { locale: locale as any }),
      },
      {
        q: m['landing.video_faq.5.question']({}, { locale: locale as any }),
        a: m['landing.video_faq.5.answer']({}, { locale: locale as any }),
      },
      {
        q: m['landing.video_faq.6.question']({}, { locale: locale as any }),
        a: m['landing.video_faq.6.answer']({}, { locale: locale as any }),
      },
      {
        q: m['landing.video_faq.7.question']({}, { locale: locale as any }),
        a: m['landing.video_faq.7.answer']({}, { locale: locale as any }),
      },
      {
        q: m['landing.video_faq.8.question']({}, { locale: locale as any }),
        a: m['landing.video_faq.8.answer']({}, { locale: locale as any }),
      },
    ];

    const jsonLdData = [
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: appName,
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Web, iOS, Android',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        description: description,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqData.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.a,
          },
        })),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: 'How to make a viral AI rap video',
        description: 'Create a viral AI rap video in 4 simple steps.',
        step: [
          {
            '@type': 'HowToStep',
            name: m['landing.how_to.step_1_title']({}, { locale: locale as any }),
            text: m['landing.how_to.step_1_desc']({}, { locale: locale as any }),
          },
          {
            '@type': 'HowToStep',
            name: m['landing.how_to.step_2_title']({}, { locale: locale as any }),
            text: m['landing.how_to.step_2_desc']({}, { locale: locale as any }),
          },
          {
            '@type': 'HowToStep',
            name: m['landing.how_to.step_3_title']({}, { locale: locale as any }),
            text: m['landing.how_to.step_3_desc']({}, { locale: locale as any }),
          },
          {
            '@type': 'HowToStep',
            name: m['landing.how_to.step_4_title']({}, { locale: locale as any }),
            text: m['landing.how_to.step_4_desc']({}, { locale: locale as any }),
          },
        ],
      },
    ];

    return {
      meta: [
        { title },
        { name: 'description', content: description },
        {
          name: 'robots',
          content: 'noindex, nofollow, noarchive, nosnippet',
        },
        {
          name: 'googlebot',
          content: 'noindex, nofollow, noarchive, nosnippet',
        },
        {
          name: 'bingbot',
          content: 'noindex, nofollow, noarchive, nosnippet',
        },
        {
          name: 'keywords',
          content:
            'ai rap video generator, ai rap battle, migos orange background, ai rap video trend, ai rap video creator, ai rap video editor, ai rap video download, viral ai rap video, tiktok rap video, ai rap video song, rap lyrics ai',
        },
        { property: 'og:site_name', content: appName },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: urlFor(locale) },
        { property: 'og:image', content: `${appUrl}/logo.svg` },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: `${appUrl}/logo.svg` },
      ],
      links: [
        { rel: 'canonical', href: urlFor(locale) },
        ...locales.map((loc) => ({
          rel: 'alternate',
          hrefLang: loc,
          href: urlFor(loc),
        })),
        { rel: 'alternate', hrefLang: 'x-default', href: urlFor('en') },
      ],
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify(jsonLdData),
        },
      ],
    };
  },
  component: HomePage,
});

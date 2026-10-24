'use client';

import { useState } from 'react';
import { ArrowLeft, Check, Copy, WandSparkles } from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { Link, useRouter } from '@/core/i18n/navigation';
import type { StyleItem } from '@/config/styles';
import { saveGeneratorDraft } from '@/modules/generator-draft';
import { copyToClipboard } from '@/lib/copy';
import { m } from '@/paraglide/messages.js';
import { Button } from '@/components/ui/button';

export function StyleDetailPage({
  style,
  relatedStyles,
}: {
  style: StyleItem;
  relatedStyles: StyleItem[];
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const title = tDynamic(`landing.styles.items.${style.slug}.title`);
  const description = tDynamic(
    `landing.styles.items.${style.slug}.description`,
    style.prompt
  );

  const categoryName = tDynamic(`landing.styles.category.${style.category}`);
  const typeName = tDynamic(`landing.styles.type.${style.typeKey}`);

  const handleCopyPrompt = async () => {
    const success = await copyToClipboard(style.prompt);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUseStyle = () => {
    saveGeneratorDraft({
      prompt: style.prompt,
      modelId: style.model,
      aspectRatio: style.ratio,
      tab: 'text',
    });
    router.push('/text-to-image');
  };

  return (
    <div className="w-full px-4 py-10 sm:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <Link
          href="/styles"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="size-4" />
          {m['landing.styles.detail.back']()}
        </Link>

        <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)]">
          <div className="border-border bg-muted relative aspect-square overflow-hidden rounded-2xl border">
            <img
              src={style.image}
              alt={title}
              width={style.width}
              height={style.height}
              className="size-full object-cover"
            />
            {style.isNew && (
              <span className="bg-primary text-primary-foreground absolute top-4 right-4 rounded-full px-3 py-1.5 text-sm font-medium">
                {m['landing.styles.badge.new']()}
              </span>
            )}
          </div>

          <div>
            <h1 className="text-foreground font-serif text-3xl font-normal sm:text-4xl">
              {title}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              ID: {style.slug}
            </p>
            <p className="text-muted-foreground mt-5 max-w-2xl text-sm leading-relaxed">
              {description}
            </p>

            <dl className="mt-8 grid gap-6 sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground text-sm">
                  {m['landing.styles.detail.category']()}
                </dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  <span className="bg-muted text-foreground rounded-full px-3 py-1 text-xs">
                    {categoryName}
                  </span>
                  <span className="bg-muted text-foreground rounded-full px-3 py-1 text-xs">
                    {typeName}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-sm">
                  {m['landing.styles.detail.format']()}
                </dt>
                <dd className="text-foreground mt-2 font-medium">
                  {style.ratio}
                </dd>
              </div>
            </dl>

            <div className="mt-8">
              <div className="flex items-center justify-between gap-4">
                <p className="text-foreground text-sm font-medium">
                  {m['landing.styles.detail.prompt_label']()}
                </p>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1.5 text-sm transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="size-4" />
                      {m['landing.styles.detail.copied']()}
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      {m['landing.styles.detail.copy_prompt']()}
                    </>
                  )}
                </button>
              </div>
              <p className="bg-muted/70 border-border text-foreground mt-3 rounded-xl border p-5 text-sm leading-relaxed select-text">
                {style.prompt}
              </p>
            </div>

            <Button
              type="button"
              onClick={handleUseStyle}
              className="mt-7 h-10 w-full cursor-pointer gap-2"
            >
              <WandSparkles className="size-4" />
              {m['landing.styles.detail.use_style']()}
            </Button>
          </div>
        </div>

        {relatedStyles.length > 0 && (
          <section className="mt-20">
            <h2 className="text-foreground font-serif text-2xl font-normal">
              {m['landing.styles.detail.related_title']()}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {m['landing.styles.detail.related_description']()}
            </p>
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {relatedStyles.map((rel) => {
                const relTitle = tDynamic(
                  `landing.styles.items.${rel.slug}.title`
                );
                return (
                  <Link
                    key={rel.slug}
                    href={`/styles/${rel.slug}`}
                    className="group min-w-0"
                  >
                    <div className="bg-muted border-border aspect-square overflow-hidden rounded-xl border">
                      <img
                        src={rel.image}
                        alt={relTitle}
                        width={rel.width}
                        height={rel.height}
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                      />
                    </div>
                    <p className="text-foreground mt-3 truncate text-sm font-medium">
                      {relTitle}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

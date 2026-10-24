'use client';

import { useState } from 'react';
import { ArrowLeft, Check, Copy, WandSparkles } from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { Link, useRouter } from '@/core/i18n/navigation';
import { getImageModelById } from '@/config/ai-models';
import type { TemplateItem } from '@/config/templates';
import { saveGeneratorDraft } from '@/modules/generator-draft';
import { copyToClipboard } from '@/lib/copy';
import { m } from '@/paraglide/messages.js';
import { Button } from '@/components/ui/button';

export function TemplateDetailPage({
  template,
  relatedTemplates,
}: {
  template: TemplateItem;
  relatedTemplates: TemplateItem[];
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const title = tDynamic(`landing.templates.items.${template.slug}.title`);
  const description = tDynamic(
    `landing.templates.items.${template.slug}.description`,
    template.prompt
  );

  const catalogModel = getImageModelById(template.model);
  const modelName = catalogModel?.name || template.model;

  const handleCopyPrompt = async () => {
    const success = await copyToClipboard(template.prompt);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreateSimilar = () => {
    const draftBase = {
      prompt: template.prompt,
      modelId: template.model,
      aspectRatio: template.ratio,
    };

    if (template.mode === 'image_to_image') {
      saveGeneratorDraft({
        ...draftBase,
        image: template.image,
        tab: 'image',
      });
      router.push('/image-to-image');
      return;
    }

    saveGeneratorDraft({
      ...draftBase,
      tab: 'text',
    });
    router.push('/text-to-image');
  };

  return (
    <div className="w-full px-4 py-10 sm:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <Link
          href="/templates"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="size-4" />
          {m['landing.templates.detail.back']()}
        </Link>

        <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)]">
          <div className="border-border bg-muted relative aspect-square overflow-hidden rounded-2xl border">
            <img
              src={template.image}
              alt={title}
              width={template.width}
              height={template.height}
              className="size-full object-contain"
            />
            {template.isNew && (
              <span className="bg-primary text-primary-foreground absolute top-4 right-4 rounded-full px-3 py-1.5 text-sm font-medium">
                {m['landing.templates.badge.new']()}
              </span>
            )}
          </div>

          <div>
            <h1 className="text-foreground font-serif text-3xl font-normal sm:text-4xl">
              {title}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              ID: {template.slug}
            </p>
            <p className="text-muted-foreground mt-5 max-w-2xl text-sm leading-relaxed">
              {description}
            </p>

            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 text-sm">
              <div>
                <dt className="text-muted-foreground">
                  {m['landing.templates.detail.category']()}
                </dt>
                <dd className="text-foreground mt-1 font-medium">
                  {tDynamic(`landing.templates.category.${template.category}`)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {m['landing.templates.detail.type']()}
                </dt>
                <dd className="text-foreground mt-1 font-medium">
                  {template.mode === 'image_to_image'
                    ? m['landing.templates.detail.type_image']()
                    : m['landing.templates.detail.type_text']()}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {m['landing.templates.detail.model']()}
                </dt>
                <dd className="text-foreground mt-1 font-medium">
                  {modelName}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {m['landing.templates.detail.suggested_format']()}
                </dt>
                <dd className="text-foreground mt-1 font-medium">
                  {template.ratio}
                </dd>
              </div>
            </dl>

            <div className="mt-8">
              <div className="flex items-center justify-between gap-4">
                <p className="text-foreground text-sm font-medium">
                  {m['landing.templates.detail.prompt_label']()}
                </p>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1.5 text-sm transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="size-4" />
                      {m['landing.templates.detail.copied']()}
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      {m['landing.templates.detail.copy_prompt']()}
                    </>
                  )}
                </button>
              </div>
              <p className="bg-muted/70 border-border text-foreground mt-3 rounded-xl border p-5 text-sm leading-relaxed select-text">
                {template.prompt}
              </p>
            </div>

            <Button
              type="button"
              onClick={handleCreateSimilar}
              className="mt-7 h-10 w-full cursor-pointer gap-2"
            >
              <WandSparkles className="size-4" />
              {m['landing.templates.detail.create_similar']()}
            </Button>
          </div>
        </div>

        {relatedTemplates.length > 0 && (
          <section className="mt-20">
            <h2 className="text-foreground font-serif text-2xl font-normal">
              {m['landing.templates.detail.related_title']()}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {m['landing.templates.detail.related_description']()}
            </p>
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {relatedTemplates.map((rel) => {
                const relTitle = tDynamic(
                  `landing.templates.items.${rel.slug}.title`
                );
                return (
                  <Link
                    key={rel.slug}
                    href={`/templates/${rel.slug}`}
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

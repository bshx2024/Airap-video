'use client';

import { useRouter } from '@/core/i18n/navigation';
import type { TemplateItem } from '@/config/templates';
import { saveGeneratorDraft } from '@/modules/generator-draft';
import { m } from '@/paraglide/messages.js';

import { TemplateCard } from './TemplateCard';
import { TemplateFilters, useTemplateFilters } from './TemplateFilters';

export function TemplatesPage() {
  const router = useRouter();
  const {
    selectedCategory,
    selectedTag,
    selectedModel,
    availableTagIds,
    availableModelIds,
    filteredTemplates,
    handleCategoryChange,
    handleTagChange,
    setSelectedModel,
  } = useTemplateFilters();

  const handleUseTemplate = (template: TemplateItem) => {
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
    <div className="w-full px-4 py-14 sm:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <div>
          <h1 className="text-foreground font-serif text-3xl font-normal sm:text-4xl">
            {m['landing.templates.title']()}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
            {m['landing.templates.description']()}
          </p>
        </div>

        <TemplateFilters
          selectedCategory={selectedCategory}
          selectedTag={selectedTag}
          selectedModel={selectedModel}
          availableTagIds={availableTagIds}
          availableModelIds={availableModelIds}
          onCategoryChange={handleCategoryChange}
          onTagChange={handleTagChange}
          onModelChange={setSelectedModel}
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTemplates.map((item) => (
            <TemplateCard
              key={item.slug}
              item={item}
              onUse={handleUseTemplate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

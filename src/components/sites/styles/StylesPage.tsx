'use client';

import { useRouter } from '@/core/i18n/navigation';
import type { StyleItem } from '@/config/styles';
import { saveGeneratorDraft } from '@/modules/generator-draft';
import { m } from '@/paraglide/messages.js';

import { StyleCard } from './StyleCard';
import { StyleFilters, useStyleFilters } from './StyleFilters';

export function StylesPage() {
  const router = useRouter();
  const { selectedCategory, setSelectedCategory, filteredStyles } =
    useStyleFilters();

  const handleUseStyle = (item: StyleItem) => {
    saveGeneratorDraft({
      prompt: item.prompt,
      modelId: item.model,
      aspectRatio: item.ratio,
      tab: 'text',
    });
    router.push('/text-to-image');
  };

  return (
    <div className="w-full px-4 py-14 sm:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <div>
          <h1 className="text-foreground font-serif text-3xl font-normal sm:text-4xl">
            {m['landing.styles.title']()}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
            {m['landing.styles.description']()}
          </p>
        </div>

        <StyleFilters
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredStyles.map((item) => (
            <StyleCard key={item.slug} item={item} onUse={handleUseStyle} />
          ))}
        </div>
      </div>
    </div>
  );
}

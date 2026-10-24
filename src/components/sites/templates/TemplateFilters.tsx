'use client';

import { useMemo, useState, type ReactNode } from 'react';

import { tDynamic } from '@/core/i18n/dynamic';
import { getImageModelById } from '@/config/ai-models';
import {
  TEMPLATE_CATEGORY_IDS,
  TEMPLATE_MODEL_IDS,
  TEMPLATE_TAG_IDS,
  TEMPLATES_DATA,
} from '@/config/templates';
import { m } from '@/paraglide/messages.js';

import { TemplateFilterChip } from './TemplateFilterChip';

function filterLabel(kind: 'category' | 'tag', id: string): string {
  if (id === 'all') return m['landing.templates.filter.all']();
  return tDynamic(`landing.templates.${kind}.${id}`);
}

function modelFilterLabel(id: string): string {
  if (id === 'all') return m['landing.templates.filter.all']();
  return getImageModelById(id)?.name || id;
}

export function useTemplateFilters() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTag, setSelectedTag] = useState('all');
  const [selectedModel, setSelectedModel] = useState('all');

  const availableTagIds = useMemo(() => {
    if (selectedCategory === 'all') return null;
    const itemsInCat = TEMPLATES_DATA.filter(
      (t) => t.category === selectedCategory
    );
    return new Set(itemsInCat.flatMap((t) => t.tags));
  }, [selectedCategory]);

  const availableModelIds = useMemo(() => {
    let items = TEMPLATES_DATA;
    if (selectedCategory !== 'all') {
      items = items.filter((t) => t.category === selectedCategory);
    }
    if (selectedTag !== 'all') {
      items = items.filter((t) => t.tags.includes(selectedTag));
    }
    return new Set(items.map((t) => t.model));
  }, [selectedCategory, selectedTag]);

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
    if (catId !== 'all' && selectedTag !== 'all') {
      const itemsInCat = TEMPLATES_DATA.filter((t) => t.category === catId);
      if (!itemsInCat.some((t) => t.tags.includes(selectedTag))) {
        setSelectedTag('all');
      }
    }
  };

  const handleTagChange = (tagId: string) => {
    setSelectedTag(tagId);
    if (tagId !== 'all' && selectedModel !== 'all') {
      let items = TEMPLATES_DATA;
      if (selectedCategory !== 'all') {
        items = items.filter((t) => t.category === selectedCategory);
      }
      items = items.filter((t) => t.tags.includes(tagId));
      if (!items.some((t) => t.model === selectedModel)) {
        setSelectedModel('all');
      }
    }
  };

  const filteredTemplates = useMemo(() => {
    return TEMPLATES_DATA.filter((t) => {
      const matchCat =
        selectedCategory === 'all' || t.category === selectedCategory;
      const matchTag = selectedTag === 'all' || t.tags.includes(selectedTag);
      const matchModel = selectedModel === 'all' || t.model === selectedModel;
      return matchCat && matchTag && matchModel;
    });
  }, [selectedCategory, selectedTag, selectedModel]);

  return {
    selectedCategory,
    selectedTag,
    selectedModel,
    availableTagIds,
    availableModelIds,
    filteredTemplates,
    handleCategoryChange,
    handleTagChange,
    setSelectedModel,
  };
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground w-16 shrink-0 pt-1.5 text-sm sm:w-20">
        {label}
      </span>
      <div className="flex min-w-0 flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function TemplateFilters({
  selectedCategory,
  selectedTag,
  selectedModel,
  availableTagIds,
  availableModelIds,
  onCategoryChange,
  onTagChange,
  onModelChange,
}: {
  selectedCategory: string;
  selectedTag: string;
  selectedModel: string;
  availableTagIds: Set<string> | null;
  availableModelIds: Set<string>;
  onCategoryChange: (id: string) => void;
  onTagChange: (id: string) => void;
  onModelChange: (id: string) => void;
}) {
  return (
    <div className="border-border mt-10 space-y-4 border-y py-5">
      <FilterRow label={m['landing.templates.filter.category']()}>
        {TEMPLATE_CATEGORY_IDS.map((id) => (
          <TemplateFilterChip
            key={id}
            label={filterLabel('category', id)}
            active={selectedCategory === id}
            onClick={() => onCategoryChange(id)}
          />
        ))}
      </FilterRow>

      <FilterRow label={m['landing.templates.filter.tag']()}>
        {TEMPLATE_TAG_IDS.map((id) => {
          const isRelevant =
            !availableTagIds || id === 'all' || availableTagIds.has(id);
          return (
            <TemplateFilterChip
              key={id}
              label={filterLabel('tag', id)}
              active={selectedTag === id}
              muted={!isRelevant}
              onClick={() => onTagChange(id)}
            />
          );
        })}
      </FilterRow>

      <FilterRow label={m['landing.templates.filter.model']()}>
        {TEMPLATE_MODEL_IDS.map((id) => {
          const isRelevant = id === 'all' || availableModelIds.has(id);
          return (
            <TemplateFilterChip
              key={id}
              label={modelFilterLabel(id)}
              active={selectedModel === id}
              muted={!isRelevant}
              onClick={() => onModelChange(id)}
            />
          );
        })}
      </FilterRow>
    </div>
  );
}

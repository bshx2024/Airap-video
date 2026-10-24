'use client';

import { useMemo, useState } from 'react';

import { tDynamic } from '@/core/i18n/dynamic';
import { STYLE_CATEGORY_IDS, STYLES_DATA } from '@/config/styles';
import { m } from '@/paraglide/messages.js';

import { StyleFilterChip } from './StyleFilterChip';

function categoryLabel(id: string): string {
  if (id === 'all') return m['landing.styles.filter.all']();
  return tDynamic(`landing.styles.category.${id}`);
}

export function useStyleFilters() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredStyles = useMemo(() => {
    if (selectedCategory === 'all') return STYLES_DATA;
    return STYLES_DATA.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  return {
    selectedCategory,
    setSelectedCategory,
    filteredStyles,
  };
}

export function StyleFilters({
  selectedCategory,
  onCategoryChange,
}: {
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
}) {
  return (
    <div className="mt-10 flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground mr-1 text-sm">
        {m['landing.styles.filter.category']()}
      </span>
      {STYLE_CATEGORY_IDS.map((id) => (
        <StyleFilterChip
          key={id}
          label={categoryLabel(id)}
          active={selectedCategory === id}
          onClick={() => onCategoryChange(id)}
        />
      ))}
    </div>
  );
}

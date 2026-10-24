'use client';

import type { CreationItem } from '@/modules/creations/store';
import { cn } from '@/lib/utils';
import { LazyImage } from '@/components/lazy';

export interface RecentImageCardMediaProps {
  item: CreationItem;
  size?: 'default' | 'sm';
  className?: string;
  onClick?: () => void;
}

export function RecentImageCardMedia({
  item,
  size = 'default',
  className,
  onClick,
}: RecentImageCardMediaProps) {
  return (
    <div
      className={cn(
        'relative h-full w-full overflow-hidden rounded-[inherit] bg-black/5 dark:bg-black/20',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <LazyImage
        src={item.url}
        alt={item.prompt || ''}
        className={cn(
          'h-full w-full object-cover transition-transform duration-500 group-hover:scale-105',
          size === 'sm' && 'duration-300'
        )}
        wrapperClassName="h-full w-full"
      />
    </div>
  );
}

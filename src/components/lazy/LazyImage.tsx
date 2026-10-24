'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ImageIcon, ImageOff } from 'lucide-react';

export interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
  className?: string;
  placeholderSrc?: string;
  fallbackSrc?: string;
  fallbackText?: string;
  wrapperClassName?: string;
  effect?: 'blur' | 'opacity' | 'none';
  rootMargin?: string;
}

export function LazyImage({
  src,
  alt = '',
  className = '',
  placeholderSrc,
  fallbackSrc,
  fallbackText,
  wrapperClassName = '',
  effect = 'opacity',
  rootMargin = '200px',
  style,
  onLoad,
  onError,
  ...props
}: LazyImageProps) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsIntersecting(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoaded(true);
    onLoad?.(e);
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    onError?.(e);
  };

  const effectiveSrc = hasError
    ? fallbackSrc || placeholderSrc
    : isIntersecting
      ? src
      : placeholderSrc;

  const effectClass =
    effect === 'blur'
      ? `transition-all duration-500 ease-out ${isLoaded ? 'blur-0 opacity-100 scale-100' : 'blur-sm opacity-0 scale-105'}`
      : effect === 'opacity'
        ? `transition-all duration-500 ease-out ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-102'}`
        : '';

  return (
    <div
      ref={imgRef as any}
      className={`relative min-h-px overflow-hidden rounded-[inherit] ${wrapperClassName}`}
    >
      {/* Loading skeleton + 流光（无 blur） */}
      {!isLoaded && !hasError && (
        <div className="creation-skeleton-shimmer">
          <ImageIcon className="text-muted-foreground/30 relative z-[1] size-6" />
        </div>
      )}

      {/* Error Fallback when image fails to load (e.g. 404) */}
      {hasError && !fallbackSrc && (
        <div className="bg-muted/30 text-muted-foreground/45 absolute inset-0 z-1 flex flex-col items-center justify-center gap-1.5 p-2 select-none">
          <div className="bg-muted/80 flex size-8 items-center justify-center rounded-lg shadow-2xs sm:size-9 dark:bg-white/5">
            <ImageOff className="size-4 stroke-[1.75] sm:size-5" />
          </div>
          {fallbackText && (
            <span className="truncate text-[10px] font-medium tracking-tight opacity-70">
              {fallbackText}
            </span>
          )}
        </div>
      )}

      {effectiveSrc && (
        <img
          src={effectiveSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          style={style}
          className={`relative z-1 ${className} ${effectClass}`}
          {...props}
        />
      )}
    </div>
  );
}

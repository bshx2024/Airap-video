'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getRouteApi, useLocation } from '@tanstack/react-router';

import {
  resolveTopBannerConfigs,
  type TopBannerItemConfig,
} from '@/lib/top-banner';
import { cn } from '@/lib/utils';
import { getLocale, locales } from '@/paraglide/runtime.js';
import { useBannerAnnouncements } from '@/hooks/use-banner-announcements';
import { usePublicConfig } from '@/hooks/use-public-config';

const rootRoute = getRouteApi('__root__');

/** py-2 + text-xs + border — used until measured so sticky nav isn't covered. */
const TOP_BANNER_RESERVE_PX = 37;

function stripLocalePrefix(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  for (const locale of locales) {
    if (normalized === `/${locale}`) return '/';
    if (normalized.startsWith(`/${locale}/`)) {
      return normalized.slice(locale.length + 1) || '/';
    }
  }
  return normalized;
}

function isHomeSurface(pathname: string): boolean {
  return stripLocalePrefix(pathname) === '/';
}

function applyBannerHeight(height: number) {
  if (typeof document === 'undefined') return;
  // Only set the CSS variable — do not mutate header.style.top.
  document.documentElement.style.setProperty(
    '--top-banner-height',
    `${height}px`
  );
}

export function TopBanner() {
  const location = useLocation();
  const rootData = rootRoute.useLoaderData();
  const { data: liveConfig } = usePublicConfig();
  // Prefer live public config; fall back to SSR root loader so first paint
  // does not wait on /api/config/public.
  const config = liveConfig ?? rootData?.topBannerConfig;
  const locale = getLocale();

  const bannerConfig = useMemo(
    () => resolveTopBannerConfigs(config, locale),
    [config, locale]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isOverflow, setIsOverflow] = useState(false);
  const [currentScrollDuration, setCurrentScrollDuration] = useState(
    bannerConfig.scrollDuration
  );
  const [, setRemainingTime] = useState(bannerConfig.stayDuration * 1000);

  const bannerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  const bannerItems = useBannerAnnouncements();
  const totalItems = bannerItems.length;
  const activeItem: TopBannerItemConfig | undefined =
    bannerItems[currentIndex] || bannerItems[0];

  const onHome = isHomeSurface(location.pathname);
  const enabled = totalItems > 0 && onHome;
  const showBanner = enabled;

  useEffect(() => {
    setCurrentIndex(0);
  }, [bannerConfig.id, locale]);

  // useLayoutEffect: set offset before paint so sticky/fixed nav isn't covered.
  useLayoutEffect(() => {
    if (!showBanner) {
      applyBannerHeight(0);
      return;
    }

    const updateHeight = () => {
      const measured = bannerRef.current?.offsetHeight;
      applyBannerHeight(
        measured && measured > 0 ? measured : TOP_BANNER_RESERVE_PX
      );
    };

    updateHeight();

    let resizeObserver: ResizeObserver | null = null;
    if (bannerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateHeight);
      resizeObserver.observe(bannerRef.current);
    }

    window.addEventListener('resize', updateHeight);
    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', updateHeight);
      applyBannerHeight(0);
    };
  }, [showBanner, location.pathname, activeItem?.text]);

  const measureCurrentItem = useCallback(() => {
    if (!containerRef.current || !measureRef.current) return;
    const contentWidth = Math.ceil(
      measureRef.current.getBoundingClientRect().width ||
        measureRef.current.scrollWidth
    );
    const containerWidth = Math.floor(
      containerRef.current.getBoundingClientRect().width ||
        containerRef.current.clientWidth
    );
    if (containerWidth <= 0) return;
    const overflow = contentWidth > containerWidth;
    setIsOverflow(overflow);

    if (overflow) {
      const duration = Math.max(
        12,
        bannerConfig.scrollDuration > 0
          ? bannerConfig.scrollDuration
          : Math.round((contentWidth + 48) / 45)
      );
      setCurrentScrollDuration(duration);
      setRemainingTime(duration * 1000);
    } else {
      setRemainingTime(Math.max(2, bannerConfig.stayDuration) * 1000);
    }
  }, [bannerConfig.scrollDuration, bannerConfig.stayDuration]);

  useEffect(() => {
    if (!showBanner) return;
    const rafId = requestAnimationFrame(() => {
      measureCurrentItem();
    });
    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        measureCurrentItem();
      });
      resizeObserver.observe(containerRef.current);
    }
    const handleResize = () => measureCurrentItem();
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(rafId);
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [showBanner, currentIndex, measureCurrentItem, activeItem?.text]);

  useEffect(() => {
    if (!showBanner || totalItems <= 1 || isHovered) return;
    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 100) {
          setCurrentIndex((curr) => (curr + 1) % totalItems);
          return 0;
        }
        return prev - 100;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [showBanner, totalItems, isHovered, currentIndex]);

  if (!enabled || !showBanner || !activeItem) return null;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `:root{--top-banner-height:${TOP_BANNER_RESERVE_PX}px}`,
        }}
      />
      <div
        ref={bannerRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="fixed top-0 right-0 left-0 z-[60] border-b border-amber-500/35 bg-[#fff4e8] px-4 py-2 text-amber-900 shadow-xs transition-all dark:border-amber-400/35 dark:bg-[#2a211b] dark:text-amber-200"
      >
        <div className="mx-auto flex max-w-6xl items-center">
          <div
            ref={containerRef}
            className="relative min-w-0 flex-1 overflow-hidden"
          >
            <div
              ref={measureRef}
              className="pointer-events-none invisible absolute top-0 left-0 text-xs whitespace-nowrap opacity-0"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: activeItem.text }}
            />
            <div
              key={currentIndex}
              className={cn(
                'flex w-full min-w-0 items-center overflow-hidden',
                totalItems > 1 && 'top-banner-slide-in'
              )}
            >
              {isOverflow ? (
                <div
                  className={cn(
                    'top-banner-marquee-track',
                    isHovered && 'is-paused'
                  )}
                  style={{
                    animationDuration: `${currentScrollDuration}s`,
                    animationPlayState: isHovered ? 'paused' : 'running',
                  }}
                >
                  {[0, 1].map((idx) => (
                    <div
                      key={idx}
                      className="top-banner-marquee-item text-center text-xs font-medium"
                      dangerouslySetInnerHTML={{ __html: activeItem.text }}
                    />
                  ))}
                </div>
              ) : (
                <div
                  className="w-full truncate text-center text-xs font-medium"
                  dangerouslySetInnerHTML={{ __html: activeItem.text }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

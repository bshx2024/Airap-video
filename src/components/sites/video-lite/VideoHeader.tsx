'use client';

import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { Link, usePathname } from '@/core/i18n/navigation';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { AnnouncementBell } from '@/components/announcement-bell';
import { LocaleSelector } from '@/components/locale-selector';
import { SiteBrand } from '@/components/site-brand';
import { SiteUserMenu } from '@/components/site-user-menu';
import { ThemeToggle } from '@/components/theme-toggle';

export function VideoHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const isScrolledRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);
  const { data: session } = useSession();
  const pathname = usePathname();
  const user = session?.user;
  const isHomePage = pathname === '/';
  const isSolidHeader = isScrolled || mobileMenuOpen || !isHomePage;
  const signInHref =
    pathname && pathname !== '/sign-in' && pathname !== '/sign-up'
      ? `/sign-in?callbackUrl=${encodeURIComponent(pathname)}`
      : '/sign-in';

  useEffect(() => {
    const handleScroll = () => {
      if (scrollRafRef.current != null) return;
      scrollRafRef.current = window.requestAnimationFrame(() => {
        scrollRafRef.current = null;
        const next = window.scrollY > 50;
        if (next === isScrolledRef.current) return;
        isScrolledRef.current = next;
        setIsScrolled(next);
      });
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollRafRef.current != null) {
        window.cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navItems = [
    { label: m['landing.nav.showcase'](), href: '/#showcase' },
    { label: m['landing.nav.features'](), href: '/#features' },
    { label: '⚡ 工作流调试 (Coze)', href: '/tools/workflow' },
    { label: m['landing.nav.pricing'](), href: '/pricing' },
    { label: m['landing.nav.faq'](), href: '/#faq' },
  ];

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-[45] text-white transition-all duration-300',
        isSolidHeader
          ? 'border-b border-white/10'
          : 'border-b border-transparent'
      )}
      style={{ top: 'var(--top-banner-height, 0px)' }}
    >
      {isSolidHeader ? (
        <div
          aria-hidden
          className={cn(
            'absolute inset-0 z-0 shadow-lg shadow-black/20',
            mobileMenuOpen ? 'bg-[#020617]' : 'bg-[#020617]/72 backdrop-blur-xl'
          )}
        />
      ) : null}

      <div className="relative z-10 mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-[clamp(1rem,2.5vw,3rem)] sm:h-16">
        <div className="flex min-w-0 items-center gap-6 lg:gap-10">
          <Link
            href="/"
            className="flex shrink-0 items-center opacity-95 transition hover:opacity-100"
          >
            <SiteBrand
              className="gap-2 sm:gap-2.5"
              logoClassName="size-7 rounded-[9px] sm:size-8"
              nameClassName="text-base font-extrabold font-sans tracking-[-0.025em] text-white not-italic sm:text-lg"
            />
          </Link>

          <nav
            aria-label={m['landing.nav.primary']()}
            className="hidden items-center gap-6 lg:flex"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-white/65 transition-colors duration-150 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center">
          <div className="hidden items-center gap-2 text-white lg:flex">
            <div className="[&_button]:border-transparent [&_button]:text-white/70 [&_button:hover]:bg-white/10 [&_button:hover]:text-white [&_button:hover_svg]:!text-white [&_svg]:!text-white/70">
              <ThemeToggle />
            </div>
            <div className="[&_button]:border-transparent [&_button]:text-white/70 [&_button:hover]:bg-white/10 [&_button:hover]:text-white [&_button:hover_svg]:!text-white [&_svg]:!text-white/70">
              <AnnouncementBell />
              <LocaleSelector />
            </div>

            {user ? (
              <SiteUserMenu
                name={user.name || m['landing.nav.user_fallback']()}
                email={user.email}
                image={user.image}
              />
            ) : (
              <Link
                href={signInHref}
                className="rounded-full bg-[#2563eb] px-3 py-1.5 text-[12px] font-semibold text-white shadow-[0_8px_28px_rgba(37,99,235,0.3)] transition duration-150 hover:-translate-y-0.5 hover:bg-[#1d4ed8] sm:px-4 sm:py-2 sm:text-[13px]"
              >
                {m['landing.nav.get_started']()}
              </Link>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="cursor-pointer p-2 text-white/70 hover:text-white lg:hidden"
            aria-label={
              mobileMenuOpen
                ? m['landing.nav.close_menu']()
                : m['landing.nav.open_menu']()
            }
          >
            {mobileMenuOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="relative z-10 border-t border-white/10 bg-[#020617] px-[clamp(1rem,2.5vw,3rem)] pt-2 pb-4 text-white lg:hidden">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
            <div className="flex items-center gap-1 text-white [&_button]:border-transparent [&_button]:text-white/70 [&_button:hover]:bg-white/10 [&_button:hover]:text-white [&_button:hover_svg]:!text-white [&_svg]:!text-white/70">
              <AnnouncementBell />
              <LocaleSelector />
              <ThemeToggle />
            </div>

            {user ? (
              <SiteUserMenu
                name={user.name || m['landing.nav.user_fallback']()}
                email={user.email}
                image={user.image}
              />
            ) : (
              <Link
                href={signInHref}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-full bg-[#2563eb] px-3 py-1.5 text-[12px] font-semibold text-white shadow-[0_8px_28px_rgba(37,99,235,0.3)] transition duration-150 hover:-translate-y-0.5 hover:bg-[#1d4ed8]"
              >
                {m['landing.nav.get_started']()}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

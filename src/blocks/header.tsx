'use client';

import { useEffect, useState, type ComponentType, type SVGProps } from 'react';
import {
  Aperture,
  ArrowRight,
  ChevronDown,
  Eraser,
  Expand,
  ImagePlus,
  LayoutTemplate,
  Library,
  Maximize2,
  Menu,
  Palette,
  Sparkles,
  Type,
  X,
  Zap,
} from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { tDynamic } from '@/core/i18n/dynamic';
import { Link, usePathname } from '@/core/i18n/navigation';
import { needsModelIconInvert } from '@/config/ai-models';
import { NAV_FEATURES, NAV_MODELS, NAV_TOOLS } from '@/config/landing-data';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { LocaleSelector } from '@/components/locale-selector';
import { SiteBrand } from '@/components/site-brand';
import { SiteUserMenu } from '@/components/site-user-menu';
import { ThemeToggle } from '@/components/theme-toggle';

function BananaIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 13c3.5-2 8-2 10 2a5.5 5.5 0 0 1 8 5" />
      <path d="M5.15 17.89c5.52-1.52 8.65-6.89 7-12C11.55 4 11.5 2 13 2c3.22 0 5 5.5 5 8 0 6.5-4.2 12-10.49 12C5.11 22 2 22 2 20c0-1.5 1.14-1.55 3.15-2.11Z" />
    </svg>
  );
}

const NAV_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  type: Type,
  'image-plus': ImagePlus,
  library: Library,
  'layout-template': LayoutTemplate,
  palette: Palette,
  zap: Zap,
  banana: BananaIcon,
  sparkles: Sparkles,
  aperture: Aperture,
  eraser: Eraser,
  'maximize-2': Maximize2,
  expand: Expand,
};

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileGroup, setMobileGroup] = useState('features');
  const { data: session } = useSession();
  const user = session?.user;
  const pathname = usePathname();
  const signInHref =
    pathname && pathname !== '/sign-in' && pathname !== '/sign-up'
      ? `/sign-in?callbackUrl=${encodeURIComponent(pathname)}`
      : '/sign-in';

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const dropdownItems = [
    { id: 'features', label: m['landing.nav.features'](), items: NAV_FEATURES },
    { id: 'models', label: m['landing.nav.models'](), items: NAV_MODELS },
    { id: 'tools', label: m['landing.nav.tools'](), items: NAV_TOOLS },
  ];

  const navItemIconClass = (icon: string) =>
    icon === 'zap'
      ? 'size-4 text-amber-500'
      : icon === 'banana'
        ? 'size-4 text-yellow-500'
        : icon === 'sparkles'
          ? 'size-4 text-emerald-500'
          : icon === 'aperture'
            ? 'size-4 text-blue-500'
            : 'size-4 text-primary';

  const renderNavLink = (
    item: (typeof NAV_FEATURES)[number],
    onNavigate?: () => void
  ) => {
    const isImageIcon = item.icon.startsWith('/');
    const Icon = NAV_ICONS[item.icon] || Type;
    return (
      <Link
        key={item.id}
        href={item.href}
        onClick={onNavigate}
        className="text-popover-foreground hover:bg-muted flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
      >
        {isImageIcon ? (
          <img
            src={item.icon}
            alt=""
            width={16}
            height={16}
            className={cn(
              'size-4 shrink-0 rounded-sm object-cover',
              needsModelIconInvert(item.icon) && 'dark:invert'
            )}
          />
        ) : (
          <Icon className={navItemIconClass(item.icon)} />
        )}
        {item.label ? (
          <div>
            <div>{item.label}</div>
            <div className="text-muted-foreground text-[11px] font-normal">
              {tDynamic(`config.ai_models.${item.id}.nav_description`)}
            </div>
          </div>
        ) : (
          tDynamic(`landing.nav.items.${item.id}.label`)
        )}
      </Link>
    );
  };

  return (
    <header
      suppressHydrationWarning
      style={{
        top: 'var(--top-banner-height, 0px)',
        marginTop: 'var(--top-banner-height, 0px)',
      }}
      className="border-border/40 bg-background/80 sticky z-50 w-full border-b backdrop-blur-md transition-[background-color,border-color,backdrop-filter,top,margin-top] duration-200"
    >
      <div className="mx-auto flex h-14 w-[calc(100%-2rem)] max-w-6xl items-center justify-between">
        <div className="flex min-w-0 items-center gap-12">
          <Link href="/" className="flex shrink-0 items-center">
            <SiteBrand />
          </Link>

          <nav className="hidden items-center gap-6 text-sm md:flex">
            {dropdownItems.map((group) => (
              <div
                key={group.id}
                className="relative"
                onMouseEnter={() => setActiveDropdown(group.id)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 py-2 transition-colors outline-none"
                >
                  {group.label}
                  <ChevronDown className="size-3.5 transition-transform duration-200" />
                </button>
                {activeDropdown === group.id && (
                  <div
                    className={`absolute top-full left-0 z-50 pt-1.5 ${
                      group.id === 'models' ? 'w-56' : 'w-52'
                    }`}
                  >
                    <div className="border-border bg-popover/95 animate-in fade-in zoom-in-95 rounded-xl border p-1.5 shadow-xl backdrop-blur-lg duration-150">
                      {group.items.map((item) => renderNavLink(item))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <Link
              href="/pricing"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {m['landing.nav.pricing']()}
            </Link>
            <Link
              href="/blog"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {m['landing.nav.blog']()}
            </Link>
          </nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <LocaleSelector />
          <ThemeToggle />
          {user ? (
            <SiteUserMenu
              name={user.name || 'User'}
              email={user.email}
              image={user.image}
            />
          ) : (
            <Link
              href={signInHref}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium shadow transition-all active:translate-y-px"
            >
              {m['landing.hero.cta']()}
              <ArrowRight className="size-4" />
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-foreground cursor-pointer p-2 md:hidden"
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

      {mobileMenuOpen && (
        <div className="border-border/20 bg-background/95 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b px-4 py-4 backdrop-blur-lg md:hidden">
          <div className="flex flex-col gap-1 text-sm font-medium">
            {dropdownItems.map((group) => {
              const open = mobileGroup === group.id;
              return (
                <div key={group.id} className="border-border/20 border-b py-1">
                  <button
                    type="button"
                    onClick={() => setMobileGroup(open ? '' : group.id)}
                    className="text-muted-foreground hover:text-foreground flex w-full cursor-pointer items-center justify-between py-2 transition-colors outline-none"
                  >
                    {group.label}
                    <ChevronDown
                      className={`size-3.5 transition-transform duration-200 ${
                        open ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {open && (
                    <div className="pb-2">
                      {group.items.map((item) =>
                        renderNavLink(item, () => setMobileMenuOpen(false))
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <Link
              href="/pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="text-muted-foreground hover:text-foreground border-border/20 border-b py-3 transition-colors"
            >
              {m['landing.nav.pricing']()}
            </Link>
            <Link
              href="/blog"
              onClick={() => setMobileMenuOpen(false)}
              className="text-muted-foreground hover:text-foreground border-border/20 border-b py-3 transition-colors"
            >
              {m['landing.nav.blog']()}
            </Link>

            <div className="mt-3 flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <LocaleSelector />
                <ThemeToggle />
              </div>
              {user ? (
                <SiteUserMenu
                  name={user.name || 'User'}
                  email={user.email}
                  image={user.image}
                />
              ) : (
                <Link
                  href={signInHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="bg-primary text-primary-foreground inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium"
                >
                  {m['landing.hero.cta']()}
                  <ArrowRight className="size-3.5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

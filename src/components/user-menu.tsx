import { useQuery } from '@tanstack/react-query';
import {
  CheckIcon,
  Coins,
  EllipsisVerticalIcon,
  Film,
  LanguagesIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  SettingsIcon,
  ShieldIcon,
  SunIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';

import { signOut } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import { localeNames } from '@/config/locale';
import { clearLocalCreations } from '@/modules/creations/store';
import { apiGet } from '@/lib/api-client';
import { getQueryClient } from '@/lib/query-client';
import { m } from '@/paraglide/messages.js';
import {
  getLocale,
  locales,
  localizeHref,
  setLocale,
} from '@/paraglide/runtime.js';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

export function UserMenu({
  name,
  email,
  image,
}: {
  name: string;
  email: string;
  image?: string | null;
  /** @deprecated Kept for call-site compatibility; menu uses in-app settings links. */
  profileHref?: string;
}) {
  const locale = getLocale();
  const { theme, setTheme } = useTheme();
  const { isMobile } = useSidebar();
  const { data } = useUserPermissions();
  const isAdmin = data?.isAdmin === true;

  const { data: creditsData } = useQuery({
    queryKey: ['credits', 'balance'],
    queryFn: () => apiGet<{ balance: number }>('/api/credits?summary=1'),
  });
  const balance = creditsData?.balance;

  async function handleSignOut() {
    clearLocalCreations();
    await signOut();
    // Drop user-scoped React Query cache, then hard-nav home so AppLayout's
    // unauthenticated redirect to /sign-in cannot win the race.
    getQueryClient().clear();
    window.location.assign(localizeHref('/'));
  }

  function handleLocaleSwitch(newLocale: string) {
    // Writes the locale cookie and reloads on the localized URL.
    setLocale(newLocale as typeof locale);
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger className="ring-sidebar-ring w-full rounded-lg outline-none focus-visible:ring-2 [&>div]:w-full">
            <SidebarMenuButton
              size="lg"
              render={<div />}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8 rounded-lg">
                <AvatarImage src={image || undefined} alt={name} />
                <AvatarFallback className="rounded-lg text-xs">
                  {name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{name}</span>
                <span className="text-foreground/70 truncate text-xs">
                  {email}
                </span>
              </div>
              <EllipsisVerticalIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8">
                    <AvatarImage src={image || undefined} alt={name} />
                    <AvatarFallback className="rounded-lg text-xs">
                      {name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{name}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/settings/credits" />}>
              <Coins className="size-4 shrink-0 text-amber-500" />
              <span className="min-w-0 flex-1 truncate">
                {m['settings.nav.credits']()}
              </span>
              <span
                className="text-muted-foreground ml-2 max-w-[120px] truncate font-mono text-xs font-semibold"
                title={
                  balance !== undefined ? balance.toLocaleString() : undefined
                }
              >
                {balance !== undefined ? balance.toLocaleString() : '...'}
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/my-creations" />}>
              <Film className="size-4" />
              {m['settings.nav.creations']()}
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/settings" />}>
              <SettingsIcon className="size-4" />
              {m['common.nav.settings']()}
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem render={<Link href="/admin" />}>
                <ShieldIcon className="size-4" />
                {m['common.systems.admin']()}
              </DropdownMenuItem>
            )}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2 px-2 py-2">
                <LanguagesIcon className="size-4" />
                <span className="flex-1">{localeNames[locale] || locale}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {locales.map((loc) => (
                  <DropdownMenuItem
                    key={loc}
                    onClick={() => handleLocaleSwitch(loc)}
                  >
                    <span className="flex-1">{localeNames[loc] || loc}</span>
                    {loc === locale && <CheckIcon className="size-3.5" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2 px-2 py-2">
                <PaletteIcon className="size-4" />
                <span className="flex-1">
                  {theme === 'dark'
                    ? m['common.nav.theme_dark']()
                    : theme === 'light'
                      ? m['common.nav.theme_light']()
                      : m['common.nav.theme_system']()}
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setTheme('light')}>
                  <SunIcon className="size-4" />
                  <span className="flex-1">
                    {m['common.nav.theme_light']()}
                  </span>
                  {theme === 'light' && <CheckIcon className="size-3.5" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>
                  <MoonIcon className="size-4" />
                  <span className="flex-1">{m['common.nav.theme_dark']()}</span>
                  {theme === 'dark' && <CheckIcon className="size-3.5" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}>
                  <MonitorIcon className="size-4" />
                  <span className="flex-1">
                    {m['common.nav.theme_system']()}
                  </span>
                  {theme === 'system' && <CheckIcon className="size-3.5" />}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOutIcon className="size-4" />
              {m['common.sign.sign_out_title']()}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

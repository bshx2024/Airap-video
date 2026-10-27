import { createFileRoute, Outlet } from '@tanstack/react-router';
import {
  Bot,
  CreditCard,
  FolderOpen,
  Home,
  LayoutDashboard,
  Megaphone,
  Radar,
  Settings,
  Shield,
  Video,
} from 'lucide-react';

import { m } from '@/paraglide/messages.js';
import { AppLayout } from '@/components/app-layout';
import { SiteBrand } from '@/components/site-brand';

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
});

function AdminLayout() {
  const group = m['common.systems.admin']();
  const navItems = [
    {
      href: '/admin',
      label: m['admin.nav.overview'](),
      icon: LayoutDashboard,
      group,
    },
    {
      href: '/admin/users',
      label: m['admin.nav.rbac'](),
      icon: Shield,
      group,
      items: [
        { href: '/admin/users', label: m['admin.nav.users']() },
        { href: '/admin/invite-codes', label: m['admin.nav.invite_codes']() },
        { href: '/admin/roles', label: m['admin.nav.roles']() },
        { href: '/admin/permissions', label: m['admin.nav.permissions']() },
      ],
    },
    {
      href: '/admin/payments',
      label: m['admin.nav.billing'](),
      icon: CreditCard,
      group,
      items: [
        { href: '/admin/payments', label: m['admin.nav.payments']() },
        { href: '/admin/subscriptions', label: m['admin.nav.subscriptions']() },
        { href: '/admin/credits', label: m['admin.nav.credits']() },
      ],
    },
    {
      href: '/admin/ai-video-dashboard',
      label: m['admin.nav.ai_video'](),
      icon: Video,
      group,
      items: [
        {
          href: '/admin/ai-video-dashboard',
          label: m['admin.nav.ai_video_dashboard'](),
        },
        {
          href: '/admin/ai-tasks?type=video',
          label: m['admin.nav.ai_video_tasks'](),
        },
        {
          href: '/admin/workflow',
          label: '⚡ 可视化工作流 (Coze)',
        },
        {
          href: '/admin/ai-tasks?type=video&status=failed',
          label: m['admin.nav.ai_video_failed_tasks'](),
        },
      ],
    },
    {
      href: '/admin/announcements',
      label: m['admin.nav.announcements'](),
      icon: Megaphone,
      group,
    },
    {
      href: '/admin/categories',
      label: m['admin.nav.content'](),
      icon: FolderOpen,
      group,
      items: [
        { href: '/admin/categories', label: m['admin.nav.categories']() },
        { href: '/admin/posts', label: m['admin.nav.posts']() },
        { href: '/admin/tickets', label: m['admin.nav.tickets']() },
      ],
    },
    {
      href: '/admin/crawler-logs',
      label: '爬虫与蜘蛛',
      icon: Radar,
      group,
    },
  ];

  const footerNavItems = [
    {
      href: '/admin/agent',
      label: m['admin.nav.agent'](),
      icon: Bot,
    },
    {
      href: '/admin/settings',
      label: m['admin.nav.settings'](),
      icon: Settings,
    },
    { href: '/', label: m['common.systems.home'](), icon: Home, newTab: true },
  ];

  return (
    <AppLayout
      navItems={navItems}
      footerNavItems={footerNavItems}
      brand={<SiteBrand />}
      brandHref="/admin"
      profileHref="/settings/profile"
      requirePermission="admin.*"
    >
      <Outlet />
    </AppLayout>
  );
}

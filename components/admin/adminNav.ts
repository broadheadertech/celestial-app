import type { ComponentType } from 'react';
import {
  Users,
  Package,
  ShoppingBag,
  Settings,
  LayoutDashboard,
  TrendingUp,
  Megaphone,
  Boxes,
  Wallet,
  Sliders,
  Zap,
  Calendar,
  MessageCircle,
  Gauge,
  Award,
  ScrollText,
  Store,
  MessageSquareQuote,
  Newspaper,
} from 'lucide-react';

/**
 * Single source of truth for admin navigation. Consumed by the desktop
 * sidebar (AdminSidebar) and the phone drawer (AdminMobileNav) so the two
 * can't drift apart.
 */

export interface AdminNavItem {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
  /** Extra route prefixes that should mark this item active. */
  matchPaths?: string[];
  superAdminOnly?: boolean;
}

export interface AdminNavSection {
  title: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    title: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard' },
      { id: 'analytics', label: 'Analytics', icon: TrendingUp, href: '/admin/analytics' },
      {
        id: 'product-performance',
        label: 'Product Performance',
        icon: Gauge,
        href: '/admin/product-performance',
      },
      {
        id: 'associate-performance',
        label: 'Associate Performance',
        icon: Award,
        href: '/admin/associate-performance',
      },
    ],
  },
  {
    title: 'Sales',
    items: [
      { id: 'pos', label: 'POS', icon: Zap, href: '/admin/pos' },
      {
        id: 'orders',
        label: 'Orders & Reservations',
        icon: ShoppingBag,
        href: '/admin/orders',
        matchPaths: ['/admin/orders', '/admin/reservation-detail'],
      },
      { id: 'viewings', label: 'Viewings', icon: Calendar, href: '/admin/viewings' },
      { id: 'messages', label: 'Messages', icon: MessageCircle, href: '/admin/messages' },
    ],
  },
  {
    title: 'Management',
    items: [
      {
        id: 'products',
        label: 'Products',
        icon: Package,
        href: '/admin/products',
        matchPaths: ['/admin/products', '/admin/product-detail'],
      },
      {
        id: 'inventory',
        label: 'Inventory',
        icon: Boxes,
        href: '/admin/inventory',
        matchPaths: ['/admin/inventory'],
      },
    ],
  },
  {
    title: 'People',
    items: [
      { id: 'users', label: 'Customers', icon: Users, href: '/admin/users' },
      { id: 'associates', label: 'Associates', icon: Award, href: '/admin/associates' },
    ],
  },
  {
    title: 'Finance',
    items: [{ id: 'finance', label: 'P&L & Expenses', icon: Wallet, href: '/admin/finance' }],
  },
  {
    title: 'Settings',
    items: [
      { id: 'settings', label: 'Settings', icon: Settings, href: '/admin/settings' },
      { id: 'business', label: 'Business Details', icon: Store, href: '/admin/business' },
      {
        id: 'testimonials',
        label: 'Testimonials',
        icon: MessageSquareQuote,
        href: '/admin/testimonials',
      },
      { id: 'journal', label: 'Journal', icon: Newspaper, href: '/admin/journal' },
      {
        id: 'app-settings',
        label: 'App Settings',
        icon: Sliders,
        href: '/admin/app-settings',
        superAdminOnly: true,
      },
      { id: 'audit-log', label: 'Audit Log', icon: ScrollText, href: '/admin/audit-log' },
      { id: 'marketing', label: 'Marketing', icon: Megaphone, href: '/admin/marketing' },
    ],
  },
];

/** Sections visible to the given role (drops superAdminOnly items and empty sections). */
export function getAdminNavSections(role: string | undefined | null): AdminNavSection[] {
  const isSuperAdmin = role === 'super_admin';
  return ADMIN_NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => !i.superAdminOnly || isSuperAdmin),
  })).filter((s) => s.items.length > 0);
}

export function isAdminNavItemActive(item: AdminNavItem, pathname: string | null | undefined): boolean {
  const normalizedPathname = (pathname ?? '').replace(/\/$/, '');

  if (item.id === 'dashboard') {
    return normalizedPathname === '/admin/dashboard';
  }

  if (normalizedPathname === item.href) return true;

  if (item.matchPaths) {
    for (const path of item.matchPaths) {
      if (normalizedPathname === path || normalizedPathname.startsWith(path + '/')) {
        return true;
      }
    }
  }

  return normalizedPathname.startsWith(item.href + '/');
}

/** The nav item for the current route, if any. */
export function findActiveAdminNavItem(
  sections: AdminNavSection[],
  pathname: string | null | undefined,
): AdminNavItem | undefined {
  for (const section of sections) {
    for (const item of section.items) {
      if (isAdminNavItemActive(item, pathname)) return item;
    }
  }
  return undefined;
}

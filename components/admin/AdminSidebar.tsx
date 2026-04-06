'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  BarChart3,
  Users,
  Package,
  ShoppingBag,
  Settings,
  LayoutDashboard,
  TrendingUp,
  Megaphone,
  Boxes,
  Fish,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  matchPaths?: string[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export default function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const sections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          href: '/admin/dashboard',
        },
        {
          id: 'analytics',
          label: 'Analytics',
          icon: TrendingUp,
          href: '/admin/analytics',
        },
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
        {
          id: 'orders',
          label: 'Orders & Reservations',
          icon: ShoppingBag,
          href: '/admin/orders',
          matchPaths: ['/admin/orders', '/admin/reservation-detail'],
        },
      ],
    },
    {
      title: 'People',
      items: [
        {
          id: 'users',
          label: 'Customers',
          icon: Users,
          href: '/admin/users',
        },
      ],
    },
    {
      title: 'Settings',
      items: [
        {
          id: 'settings',
          label: 'Settings',
          icon: Settings,
          href: '/admin/settings',
        },
        {
          id: 'marketing',
          label: 'Marketing',
          icon: Megaphone,
          href: '/admin/marketing',
        },
      ],
    },
  ];

  const isActiveRoute = (item: NavItem): boolean => {
    const normalizedPathname = pathname.replace(/\/$/, '');

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

    if (normalizedPathname.startsWith(item.href + '/')) return true;

    return false;
  };

  return (
    <aside className="hidden sm:flex fixed top-0 left-0 bottom-0 w-64 bg-background border-r border-white/10 flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center">
            <Fish className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">Dragon Cave</h1>
            <p className="text-[10px] text-white/50">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-3 mb-2 text-[10px] font-semibold text-white/30 uppercase tracking-wider">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item);

                return (
                  <button
                    key={item.id}
                    onClick={() => router.push(item.href)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                      isActive
                        ? 'bg-primary/10 text-primary font-medium border border-primary/20'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-primary' : ''}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-[10px] text-white/30 text-center">Dragon Cave Inventory</p>
      </div>
    </aside>
  );
}

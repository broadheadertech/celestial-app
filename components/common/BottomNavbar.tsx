'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  BarChart3,
  Users,
  Package,
  ShoppingBag,
  Wallet,
  Zap,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  matchPaths?: string[]; // Additional paths that should show this item as active
}

interface BottomNavbarProps {
  className?: string;
}

const BottomNavbar: React.FC<BottomNavbarProps> = ({ className = '' }) => {
  const router = useRouter();
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: BarChart3,
      href: '/admin/dashboard',
      matchPaths: ['/admin']
    },
    {
      id: 'pos',
      label: 'POS',
      icon: Zap,
      href: '/admin/pos'
    },
    {
      id: 'products',
      label: 'Products',
      icon: Package,
      href: '/admin/products',
      matchPaths: ['/admin/products/add', '/admin/products/edit']
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: ShoppingBag,
      href: '/admin/orders',
      matchPaths: ['/admin/reservations', '/admin/orders']
    },
    {
      id: 'finance',
      label: 'P&L',
      icon: Wallet,
      href: '/admin/finance'
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users,
      href: '/admin/users',
      matchPaths: ['/admin/settings', '/admin/analytics', '/admin/marketing', '/admin/app-settings']
    }
  ];

  const isActiveRoute = (item: NavItem): boolean => {
    // Normalize pathname to remove trailing slashes
    const normalizedPathname = pathname.replace(/\/$/, '');

    // Special case: dashboard should only be active on exact dashboard
    if (item.id === 'dashboard') {
      return normalizedPathname === '/admin/dashboard';
    }

    // Check exact match first
    if (normalizedPathname === item.href) {
      return true;
    }

    // Check additional match paths if they exist
    if (item.matchPaths) {
      for (const path of item.matchPaths) {
        // Exact match
        if (normalizedPathname === path) {
          return true;
        }
        // Nested routes (e.g., /admin/products/123)
        if (normalizedPathname.startsWith(path + '/')) {
          return true;
        }
      }
    }

    // For nested routes of the main href
    if (normalizedPathname.startsWith(item.href + '/')) {
      return true;
    }

    return false;
  };

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-white/10 sm:hidden ${className}`}>
      <div className="grid grid-cols-6 py-2">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = isActiveRoute(item);

          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.href)}
              className={`flex flex-col items-center py-2 px-1 transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted hover:text-foreground'
              }`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <IconComponent className="w-5 h-5 mb-1" />
              <span className={`text-[10px] leading-tight ${isActive ? 'font-medium' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavbar;
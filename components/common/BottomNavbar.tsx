'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  BarChart3,
  Users,
  Package,
  ShoppingBag,
  Settings
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
      label: 'Dashboard',
      icon: BarChart3,
      href: '/admin/dashboard',
      matchPaths: ['/admin', '/admin/dashboard']
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users,
      href: '/admin/users'
    },
    {
      id: 'products',
      label: 'Products',
      icon: Package,
      href: '/admin/products',
      matchPaths: ['/admin/products/add', '/admin/products/form', '/admin/products/edit']
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: ShoppingBag,
      href: '/admin/orders',
      matchPaths: ['/admin/reservations']
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      href: '/admin/settings'
    }
  ];

  const isActiveRoute = (item: NavItem): boolean => {
    // Check exact match first
    if (pathname === item.href) return true;
    
    // Check additional match paths if they exist
    if (item.matchPaths) {
      for (const path of item.matchPaths) {
        // Exact match
        if (pathname === path) return true;
        // Nested routes (e.g., /admin/products/123)
        if (pathname.startsWith(path + '/')) return true;
      }
    }
    
    // For nested routes, check if current path starts with the item href
    // But exclude root '/admin' to prevent dashboard from being active on all admin pages
    if (item.href !== '/admin' && pathname.startsWith(item.href + '/')) {
      return true;
    }
    
    // Special case for dashboard - only active on exact matches and specified matchPaths
    if (item.id === 'dashboard') {
      return pathname === '/admin' || pathname === '/admin/dashboard';
    }
    
    return false;
  };

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-white/10 sm:hidden ${className}`}>
      <div className="grid grid-cols-5 py-2">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = isActiveRoute(item);
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.href)}
              className={`flex flex-col items-center py-2 px-3 transition-colors ${
                isActive 
                  ? 'text-primary' 
                  : 'text-muted hover:text-foreground'
              }`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <IconComponent className="w-5 h-5 mb-1" />
              <span className={`text-xs ${isActive ? 'font-medium' : ''}`}>
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
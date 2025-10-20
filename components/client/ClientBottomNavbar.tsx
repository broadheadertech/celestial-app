'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCartStore } from '@/store/cart';
import {
  Home,
  Search,
  ShoppingCart,
  User,
  Package
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  matchPaths?: string[]; // Additional paths that should show this item as active
}

interface ClientBottomNavbarProps {
  className?: string;
}

const ClientBottomNavbar: React.FC<ClientBottomNavbarProps> = ({ className = '' }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { items } = useCartStore();

  const cartItemCount = items?.reduce((count, item) => count + item.quantity, 0) || 0;

  const navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      href: '/client/dashboard',
      matchPaths: ['/client/dashboard']
    },
    {
      id: 'search',
      label: 'Search',
      icon: Search,
      href: '/client/search',
      matchPaths: ['/client/search', '/client/categories', '/client/product']
    },
    {
      id: 'cart',
      label: 'Cart',
      icon: ShoppingCart,
      href: '/client/cart',
      matchPaths: ['/client/cart']
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      href: '/client/profile',
      matchPaths: ['/client/profile', '/client/profile-edit', '/client/reservations', '/client/reservation-success']
    }
  ];

  const isActiveRoute = (item: NavItem): boolean => {
    // Normalize pathname to remove trailing slashes
    const normalizedPathname = pathname.replace(/\/$/, '');

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
        // Nested routes (e.g., /client/product/123)
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
    <div className={`fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-white/10 ${className}`}>
      <div className="grid grid-cols-4 py-1">
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
                  : 'text-white/60 hover:text-white'
              }`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <IconComponent className="w-5 h-5 mb-1" />

                {/* Special elements for specific items */}
                {item.id === 'home' && isActive && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                )}

                {item.id === 'cart' && cartItemCount > 0 && (
                  <span className="absolute -top-0 -right-1 min-w-[16px] h-4 bg-primary text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {cartItemCount > 9 ? '9+' : cartItemCount}
                  </span>
                )}
              </div>
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

export default ClientBottomNavbar;
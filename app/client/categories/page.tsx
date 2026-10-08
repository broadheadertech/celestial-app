'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Fish,
  Package,
  Lightbulb,
  Wrench,
  Palette,
  Utensils,
  Star,
  TrendingUp
} from 'lucide-react';
import { useAuthStore, useIsAuthenticated } from '@/store/auth';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import MemberSidebar from '@/components/dc/kit/MemberSidebar';
import SearchField from '@/components/dc/kit/SearchField';
import EmptyState from '@/components/dc/kit/EmptyState';
import { MenuIcon } from '@/components/dc/kit/icons';

export default function CategoriesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAuthenticated = useIsAuthenticated();
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Fetch real categories and products from Convex
  const categoriesQuery = useQuery(api.services.categories.getCategories, { isActive: true }) || [];
  const productsQuery = useQuery(api.services.products.getProducts, { isActive: true }) || [];

  // Icon mapping for categories
  const getIconForCategory = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('fish')) return Fish;
    if (name.includes('tank')) return Package;
    if (name.includes('light')) return Lightbulb;
    if (name.includes('filter')) return Wrench;
    if (name.includes('decoration') || name.includes('plant')) return Palette;
    if (name.includes('food') || name.includes('supply')) return Utensils;
    return Package; // Default icon
  };

  // Calculate product count for each category
  const getCategoryProductCount = (categoryId: string) => {
    return productsQuery.filter(product => product.categoryId === categoryId).length;
  };

  // Transform categories with real data
  const categories = categoriesQuery.map(category => ({
    ...category,
    count: getCategoryProductCount(category._id),
    icon: getIconForCategory(category.name),
    featured: getCategoryProductCount(category._id) > 5, // Featured if has more than 5 products
    trending: getCategoryProductCount(category._id) > 10, // Trending if has more than 10 products
  }));

  // Redirect admins and super_admins to their respective dashboards
  if (isAuthenticated && user?.role === 'admin') {
    router.push('/admin/dashboard');
    return null;
  }

  if (isAuthenticated && user?.role === 'super_admin') {
    router.push('/admin/dashboard');
    return null;
  }

  // Filter categories based on search
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Separate featured and regular categories
  const featuredCategories = filteredCategories.filter(cat => cat.featured);
  const regularCategories = filteredCategories.filter(cat => !cat.featured);

  const handleCategoryPress = (categoryId: string, categoryName: string) => {
    // Use category name for search page compatibility
    router.push(`/client/search?category=${categoryName.toLowerCase()}`);
  };

  const pressKeys = (categoryId: string, categoryName: string) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCategoryPress(categoryId, categoryName);
    }
  };

  const top = (
    <div className="dk-app-top">
      <div className="dk-app-top-l">
        <button
          type="button"
          className="dk-view-btn dk-app-menu"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          aria-controls="sidebar"
          aria-expanded={sidebarOpen}
        >
          <MenuIcon />
        </button>
        <h1>Categories</h1>
      </div>
    </div>
  );

  // Loading state
  if (!categoriesQuery || !productsQuery) {
    return (
      <div className="dk dk-member">
        <div className="dk-app">
          <MemberSidebar id="sidebar" active="browse" open={sidebarOpen} onClose={closeSidebar} />
          <section className="dk-app-main" aria-busy="true">
            {top}
            {/* Loading skeleton */}
            <div className="dk-panel muted" style={{ height: 48, marginTop: 17, borderRadius: 'var(--dk-r-pill)' }} />
            <div className="dk-stack" style={{ marginTop: 32 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="dk-panel muted" style={{ height: 96 }} />
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="dk dk-member">
      <div className="dk-app">
        <MemberSidebar id="sidebar" active="browse" open={sidebarOpen} onClose={closeSidebar} />

        <section className="dk-app-main">
          {top}

          {/* Search Bar */}
          <SearchField
            className="dk-app-search"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search categories..."
            label="Search categories"
            iconSize={18}
          />

          {/* Featured Categories */}
          {searchQuery === '' && featuredCategories.length > 0 && (
            <div className="dk-app-section">
              <div className="dk-row between" style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: 20 }}>Featured Categories</h2>
                <span className="dk-status pale">
                  <Star size={12} aria-hidden="true" />
                  Popular
                </span>
              </div>

              <div className="dk-grid-3" style={{ gap: 16 }}>
                {featuredCategories.map((category) => {
                  const IconComponent = category.icon;
                  return (
                    <div
                      key={`featured-${category._id}`}
                      role="button"
                      tabIndex={0}
                      className="dk-panel lift dk-cat-card"
                      onClick={() => handleCategoryPress(category._id, category.name)}
                      onKeyDown={pressKeys(category._id, category.name)}
                      aria-label={`Browse ${category.name}, ${category.count} products`}
                    >
                      <div className="dk-row between" style={{ alignItems: 'flex-start' }}>
                        <span className="dk-cat-icon" aria-hidden="true">
                          <IconComponent size={24} />
                        </span>
                        {category.trending && (
                          <span className="dk-status red">
                            <TrendingUp size={12} aria-hidden="true" />
                            HOT
                          </span>
                        )}
                      </div>
                      <h3 className="dk-cat-name">{category.name}</h3>
                      <p className="dk-cat-desc">{category.description}</p>
                      <div className="dk-cat-foot">
                        <span className="dk-cat-count">{category.count} products</span>
                        <span className="dk-cat-go">Browse</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Categories */}
          <div className="dk-app-section">
            <h2 style={{ fontSize: 20, marginBottom: 16 }}>
              {searchQuery ? `Search Results (${filteredCategories.length})` : 'All Categories'}
            </h2>

            {filteredCategories.length > 0 ? (
              <div className="dk-stack" style={{ gap: 12 }}>
                {regularCategories.map((category) => {
                  const IconComponent = category.icon;
                  return (
                    <div
                      key={category._id}
                      role="button"
                      tabIndex={0}
                      className="dk-panel lift dk-cat-row"
                      onClick={() => handleCategoryPress(category._id, category.name)}
                      onKeyDown={pressKeys(category._id, category.name)}
                      aria-label={`Browse ${category.name}, ${category.count} products available`}
                    >
                      <span className="dk-cat-icon" aria-hidden="true">
                        <IconComponent size={22} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 className="dk-cat-name" style={{ marginTop: 0 }}>{category.name}</h3>
                        <p className="dk-cat-desc">{category.description}</p>
                        <div className="dk-row wrap" style={{ gap: 8, marginTop: 8 }}>
                          <span className="dk-cat-count">{category.count} products available</span>
                          {category.trending && (
                            <span className="dk-status pale">
                              <TrendingUp size={12} aria-hidden="true" />
                              Trending
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="dk-cat-arrow" aria-hidden="true" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="dk-panel" style={{ padding: 0 }}>
                <EmptyState
                  icon={<Search size={26} />}
                  title="No categories found"
                  actions={searchQuery ? (
                    <button type="button" className="dk-btn dk-btn-red" onClick={() => setSearchQuery('')}>
                      Clear Search
                    </button>
                  ) : undefined}
                >
                  Try searching with different keywords
                </EmptyState>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  Fish,
  Package,
  Lightbulb,
  Wrench,
  Palette,
  Utensils,
  Star,
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import { useAuthStore, useIsAuthenticated } from '@/store/auth';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

// Mock categories data
const mockCategories = [
  {
    _id: 'fish',
    name: 'Aquarium Fish',
    description: 'Tropical, marine, and freshwater species',
    image: '/api/placeholder/300/200',
    count: 45,
    featured: true,
    trending: true,
    icon: Fish
  },
  {
    _id: 'tanks',
    name: 'Aquarium Tanks',
    description: 'Various sizes and styles available',
    image: '/api/placeholder/300/200',
    count: 28,
    featured: true,
    trending: false,
    icon: Package
  },
  {
    _id: 'lighting',
    name: 'Lighting Systems',
    description: 'LED and fluorescent lighting solutions',
    image: '/api/placeholder/300/200',
    count: 15,
    featured: true,
    trending: true,
    icon: Lightbulb
  },
  {
    _id: 'filtration',
    name: 'Filtration Systems',
    description: 'Keep your tank water crystal clear',
    image: '/api/placeholder/300/200',
    count: 12,
    featured: false,
    trending: false,
    icon: Wrench
  },
  {
    _id: 'decorations',
    name: 'Decorations',
    description: 'Plants, rocks, and tank accessories',
    image: '/api/placeholder/300/200',
    count: 33,
    featured: false,
    trending: true,
    icon: Palette
  },
  {
    _id: 'food',
    name: 'Fish Food & Supplies',
    description: 'Nutrition and care products',
    image: '/api/placeholder/300/200',
    count: 22,
    featured: false,
    trending: false,
    icon: Utensils
  }
];

export default function CategoriesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAuthenticated = useIsAuthenticated();
  const [searchQuery, setSearchQuery] = useState('');

  // Redirect admins and super_admins to their respective dashboards
  if (isAuthenticated && user?.role === 'admin') {
    router.push('/admin/dashboard');
    return null;
  }

  if (isAuthenticated && user?.role === 'super_admin') {
    router.push('/control_panel');
    return null;
  }

  // Filter categories based on search
  const filteredCategories = mockCategories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate featured and regular categories
  const featuredCategories = filteredCategories.filter(cat => cat.featured);
  const regularCategories = filteredCategories.filter(cat => !cat.featured);

  const handleCategoryPress = (categoryId: string) => {
    router.push(`/client/search?category=${categoryId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-xl font-semibold text-white">Categories</h1>
            <div className="w-10" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-6 py-4">
        <div className="flex items-center bg-secondary border border-white/10 rounded-xl px-4 py-3">
          <Search className="w-5 h-5 text-muted mr-3" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-white placeholder-muted focus:outline-none"
          />
        </div>
      </div>

      <div className="px-6 pb-8">
        {/* Featured Categories */}
        {searchQuery === '' && featuredCategories.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Featured Categories</h2>
              <div className="flex items-center">
                <Star className="w-4 h-4 text-primary mr-1" />
                <span className="text-sm text-primary">Popular</span>
              </div>
            </div>

            <div className="space-y-4">
              {featuredCategories.map((category) => {
                const IconComponent = category.icon;
                return (
                  <Card
                    key={`featured-${category._id}`}
                    className="overflow-hidden hover:scale-[1.02] transition-transform cursor-pointer"
                    onClick={() => handleCategoryPress(category._id)}
                  >
                    <div className="relative">
                      <div className="h-32 bg-gradient-to-r from-primary/20 to-info/20 flex items-center justify-center">
                        <IconComponent className="w-12 h-12 text-primary" />
                      </div>
                      {category.trending && (
                        <div className="absolute top-3 right-3 bg-primary px-2 py-1 rounded-full">
                          <div className="flex items-center">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            <span className="text-xs font-medium">HOT</span>
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-3 left-3">
                        <span className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg text-xs text-white">
                          Featured
                        </span>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-white">{category.name}</h3>
                        <ChevronRight className="w-5 h-5 text-muted" />
                      </div>
                      <p className="text-sm text-muted mb-3">{category.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-primary font-medium">
                          {category.count} products
                        </span>
                        <Button variant="ghost" size="sm">
                          Browse
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* All Categories */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">
            {searchQuery ? `Search Results (${filteredCategories.length})` : 'All Categories'}
          </h2>

          {filteredCategories.length > 0 ? (
            <div className="space-y-3">
              {regularCategories.map((category) => {
                const IconComponent = category.icon;
                return (
                  <Card
                    key={category._id}
                    className="p-4 hover:scale-[1.02] transition-transform cursor-pointer"
                    onClick={() => handleCategoryPress(category._id)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                        <IconComponent className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-white">{category.name}</h3>
                          <ChevronRight className="w-5 h-5 text-muted" />
                        </div>
                        <p className="text-sm text-muted mb-2">{category.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-primary font-medium">
                            {category.count} products available
                          </span>
                          {category.trending && (
                            <div className="flex items-center">
                              <TrendingUp className="w-4 h-4 text-primary mr-1" />
                              <span className="text-xs text-primary">Trending</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted" />
              </div>
              <h3 className="font-semibold text-white mb-2">No categories found</h3>
              <p className="text-sm text-muted mb-6">
                Try searching with different keywords
              </p>
              {searchQuery && (
                <Button
                  onClick={() => setSearchQuery('')}
                  variant="outline"
                >
                  Clear Search
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom spacing */}
      <div className="h-6" />
    </div>
  );
}

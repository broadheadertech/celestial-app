'use client';

import { useState, useMemo, useEffect, useRef, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCartStore } from '@/store/cart';
import { useAuthStore, useIsAuthenticated } from '@/store/auth';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Product } from '@/types';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';
import MemberSidebar from '@/components/dc/kit/MemberSidebar';
import MemberProductCard from '@/components/dc/kit/MemberProductCard';
import SearchField from '@/components/dc/kit/SearchField';
import { CaretIcon, ChevronIcon, GridIcon, ListIcon, MenuIcon } from '@/components/dc/kit/icons';

const peso = (n: number) => '₱' + Math.round(n || 0).toLocaleString('en-PH');

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addItem, getItemById, updateQuantity } = useCartStore();
  const { user } = useAuthStore();
  const isAuthenticated = useIsAuthenticated();

  const isStaff = isAuthenticated && (user?.role === 'admin' || user?.role === 'super_admin');

  const [searchQuery, setSearchQuery] = useState(searchParams?.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams?.get('category') || 'all');
  const [sortBy, setSortBy] = useState('default');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Phones/tablets: the filters panel is folded away behind a toggle so products show first.
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Filters card: price range (null = full range) and availability. Defaults show everything.
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);
  const [showInStock, setShowInStock] = useState(true);
  const [showSoldOut, setShowSoldOut] = useState(true);

  const PRODUCTS_PER_PAGE = 15;
  const topRef = useRef<HTMLDivElement>(null);

  // Fetch real products data from Convex
  const productsData = useQuery(api.services.products.getProducts,
    { isActive: true }
  );
  const productsQuery = useMemo(() => productsData ?? [], [productsData]);

  // Fetch categories from Convex
  const categoriesData = useQuery(api.services.categories.getCategories,
    { isActive: true }
  );
  const categoriesQuery = useMemo(() => categoriesData ?? [], [categoriesData]);

  // Wishlist hearts (signed-in customers only)
  const wishlist = useQuery(
    api.services.wishlist.getWishlist,
    isAuthenticated && user?._id ? { userId: user._id as Id<'users'> } : 'skip',
  );
  const toggleWishlist = useMutation(api.services.wishlist.toggleWishlist);
  const savedIds = useMemo(
    () => new Set((wishlist ?? []).map((w) => String(w.productId))),
    [wishlist],
  );

  const priceCeiling = useMemo(
    () => Math.max(100, Math.ceil(Math.max(0, ...productsQuery.map((p) => p.price)) / 100) * 100),
    [productsQuery],
  );
  const [minPrice, maxPrice] = priceRange ?? [0, priceCeiling];

  const filteredProducts = useMemo(() => {
    let filtered = productsQuery;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => {
        const category = categoriesQuery.find(cat => cat._id === product.categoryId);
        return category?.name?.toLowerCase() === selectedCategory.toLowerCase();
      });
    }

    // Filter by price range and availability (only when narrowed from the defaults)
    if (priceRange) {
      filtered = filtered.filter(product => product.price >= priceRange[0] && product.price <= priceRange[1]);
    }
    if (!showInStock || !showSoldOut) {
      filtered = filtered.filter(product => (product.stock > 0 ? showInStock : showSoldOut));
    }

    // Sort products
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'newest':
        filtered.sort((a, b) => b.createdAt - a.createdAt);
        break;
    }

    return filtered;
  }, [productsQuery, categoriesQuery, searchQuery, selectedCategory, sortBy, priceRange, showInStock, showSoldOut]);

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const endIndex = startIndex + PRODUCTS_PER_PAGE;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortBy, priceRange, showInStock, showSoldOut]);

  // Redirect admins and super_admins to their respective dashboards
  useEffect(() => {
    if (isStaff) router.push('/admin/dashboard');
  }, [isStaff, router]);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    if (!filtersOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFiltersOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [filtersOpen]);

  if (isStaff) return null;

  // Scroll to top when page changes
  const handlePageChange = (page: number) => {
    setIsLoading(true);
    setCurrentPage(page);

    setTimeout(() => {
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setIsLoading(false);
    }, 100);
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const handleAddToCart = (product: Product) => {
    if (product.stock === 0) return;
    addItem(product, 1);
  };

  const handleQuantityChange = (product: Product, change: number) => {
    const cartItem = getItemById(product._id);
    const currentQuantity = cartItem?.quantity || 0;
    const newQuantity = Math.max(0, Math.min(product.stock, currentQuantity + change));

    if (newQuantity === 0) return;
    updateQuantity(product._id, newQuantity);
  };

  const handleProductClick = (product: Product) => {
    router.push(`/client/product-detail?id=${product._id}`);
  };

  const handleToggleWishlist = async (product: Product) => {
    if (!user?._id) return;
    try {
      await toggleWishlist({ userId: user._id as Id<'users'>, productId: product._id as Id<'products'> });
    } catch (error) {
      console.error('Wishlist update failed:', error);
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSortBy('default');
    setPriceRange(null);
    setShowInStock(true);
    setShowSoldOut(true);
    setCurrentPage(1);
  };

  const setMin = (v: number) => setPriceRange([Math.min(v, maxPrice), maxPrice]);
  const setMax = (v: number) => setPriceRange([minPrice, Math.max(v, minPrice)]);
  const pct = (v: number) => (v / priceCeiling) * 100;
  const categoryName = (id: string) => categoriesQuery.find((c) => c._id === id)?.name;
  const firstName = user?.firstName || '';

  return (
    <div className="dk dk-member">
      <div className="dk-app">
        <MemberSidebar id="sidebar" active="browse" open={sidebarOpen} onClose={closeSidebar} />

        <section className="dk-app-main" ref={topRef}>
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
              <div><p className="dk-eyebrow">BROWSE</p><h1>Browse the collection</h1></div>
            </div>
            <div className="dk-app-actions">
              {user ? (
                <Link className="dk-user-pill" href="/client/profile" aria-label="Account">
                  <span className="dk-avatar">{(firstName[0] || 'D').toUpperCase()}</span>
                  <span><CaretIcon /></span>
                </Link>
              ) : (
                <Link className="dk-btn dk-btn-outline-dark sm" href="/auth/login">Sign in</Link>
              )}
            </div>
          </div>

          <SearchField
            className="dk-app-search"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search for aquatic products…"
            label="Search for aquatic products"
            iconSize={18}
          />

          <div className="dk-app-body">
            {filtersOpen && <button type="button" className="dk-filter-scrim" aria-label="Close filters" tabIndex={-1} onClick={() => setFiltersOpen(false)} />}
            <aside id="browse-filters" className={`dk-filter-card${filtersOpen ? ' open' : ''}`} aria-label="Filters">
              <div className="dk-fc-head">
                <h2>Filters</h2>
                <div className="dk-row" style={{ gap: 16 }}>
                  <button type="button" onClick={clearAllFilters}>Clear</button>
                  {/* Phones/tablets only (the panel is a bottom sheet there) */}
                  <button type="button" className="dk-fc-done" onClick={() => setFiltersOpen(false)}>Done</button>
                </div>
              </div>
              <div className="dk-fc-body">
                <fieldset className="dk-fc-group">
                  <legend>FAMILY</legend>
                  <div className="dk-fc-list">
                    {[
                      { value: 'all', label: 'All' },
                      ...categoriesQuery.map(category => ({
                        value: category.name.toLowerCase(),
                        label: category.name
                      }))
                    ].map((category) => (
                      <label key={category.value} className="dk-check">
                        <input
                          type="radio"
                          name="family"
                          value={category.value}
                          checked={selectedCategory.toLowerCase() === category.value}
                          onChange={() => setSelectedCategory(category.value)}
                        />
                        {category.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="dk-fc-group">
                  <h3 id="price-range-label">PRICE RANGE</h3>
                  <div className="dk-range" role="group" aria-labelledby="price-range-label">
                    <div className="dk-track" />
                    <div className="dk-fill" style={{ left: `${pct(minPrice)}%`, right: `${100 - pct(maxPrice)}%` }} />
                    <input type="range" min={0} max={priceCeiling} step={100} value={minPrice} onChange={(e) => setMin(Number(e.target.value))} aria-label="Minimum price" aria-valuetext={peso(minPrice)} />
                    <input type="range" min={0} max={priceCeiling} step={100} value={maxPrice} onChange={(e) => setMax(Number(e.target.value))} aria-label="Maximum price" aria-valuetext={peso(maxPrice)} />
                  </div>
                  <div className="dk-range-vals"><span>{peso(minPrice)}</span><span>{peso(maxPrice)}</span></div>
                </div>
                <fieldset className="dk-fc-group">
                  <legend>AVAILABILITY</legend>
                  <div className="dk-fc-list">
                    <label className="dk-toggle"><input type="checkbox" role="switch" checked={showInStock} onChange={(e) => setShowInStock(e.target.checked)} /> In stock</label>
                    <label className="dk-toggle"><input type="checkbox" role="switch" checked={showSoldOut} onChange={(e) => setShowSoldOut(e.target.checked)} /> Sold out</label>
                  </div>
                </fieldset>
              </div>
            </aside>

            <div>
              <div className="dk-res-head">
                <p className="dk-res-count" aria-live="polite">
                  {filteredProducts.length === 0
                    ? 'Showing 0 of 0'
                    : `Showing ${startIndex + 1}–${Math.min(endIndex, filteredProducts.length)} of ${filteredProducts.length}`}
                </p>
                <div className="dk-res-tools">
                  <button
                    type="button"
                    className="dk-chip dk-filter-toggle"
                    aria-expanded={filtersOpen}
                    aria-controls="browse-filters"
                    onClick={() => setFiltersOpen((o) => !o)}
                  >
                    Filters
                  </button>
                  <label className="sr-only" htmlFor="b-sort">Sort</label>
                  <select id="b-sort" className="dk-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="default">Sort: Featured</option>
                    <option value="price-low">Price: low to high</option>
                    <option value="price-high">Price: high to low</option>
                    <option value="rating">Highest Rated</option>
                    <option value="newest">Newest First</option>
                  </select>
                  <button type="button" className="dk-view-btn" aria-pressed={viewMode === 'grid'} aria-label="Grid view" onClick={() => setViewMode('grid')}><GridIcon /></button>
                  <button type="button" className="dk-view-btn" aria-pressed={viewMode === 'list'} aria-label="List view" onClick={() => setViewMode('list')}><ListIcon /></button>
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="dk-member-empty">
                  <h3>No products found</h3>
                  <p>We couldn&apos;t find any products matching your criteria. Try adjusting your search or filters.</p>
                  <div className="dk-row">
                    <button type="button" className="dk-btn dk-btn-red" onClick={clearAllFilters}>Clear All Filters</button>
                    <button type="button" className="dk-btn dk-btn-outline-dark" onClick={() => router.push('/client/categories')}>Browse Categories</button>
                  </div>

                  {/* Popular suggestions */}
                  {productsQuery.length > 0 && (
                    <>
                      <p style={{ marginTop: 28 }}>Popular Products</p>
                      <div className="dk-popular">
                        {productsQuery.slice(0, 6).map((product) => (
                          <button key={product._id} type="button" onClick={() => router.push(`/client/product-detail?id=${product._id}`)}>
                            <b>{product.name}</b>
                            <small>₱{product.price.toFixed(2)}</small>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : isLoading ? (
                <div className="dk-member-empty" role="status"><p>Loading products...</p></div>
              ) : (
                <div className={`dk-pgrid${viewMode === 'list' ? ' list' : ''}`}>
                  {currentProducts.map((product) => (
                    <MemberProductCard
                      key={product._id}
                      name={product.name}
                      image={product.image}
                      price={product.price}
                      originalPrice={product.originalPrice}
                      stock={product.stock}
                      category={categoryName(product.categoryId as string)}
                      cartQty={getItemById(product._id)?.quantity}
                      onOpen={() => handleProductClick(product as Product)}
                      onAdd={() => handleAddToCart(product as Product)}
                      onQty={(change) => handleQuantityChange(product as Product, change)}
                      saved={savedIds.has(String(product._id))}
                      onToggleSave={user?._id ? () => handleToggleWishlist(product as Product) : undefined}
                    />
                  ))}
                </div>
              )}

              {totalPages > 1 && !isLoading && (
                <nav className="dk-pagination" aria-label="Pages">
                  <button type="button" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} aria-label="Previous page">
                    <ChevronIcon dir="left" />
                  </button>
                  {getPageNumbers().map((page, index) =>
                    typeof page === 'number' ? (
                      <button key={index} type="button" onClick={() => handlePageChange(page)} aria-current={currentPage === page ? 'page' : undefined}>
                        {page}
                      </button>
                    ) : (
                      <span key={index} aria-hidden="true">…</span>
                    ),
                  )}
                  <button type="button" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} aria-label="Next page">
                    <ChevronIcon />
                  </button>
                </nav>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <Suspense fallback={
        <div className="dk dk-member">
          <div className="dk-member-empty" role="status" style={{ margin: 24 }}><p>Loading search...</p></div>
        </div>
      }>
        <SearchContent />
      </Suspense>
    </SafeAreaProvider>
  );
}

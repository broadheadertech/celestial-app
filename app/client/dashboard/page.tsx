"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Star,
  Zap,
  TrendingUp,
  Package,
  Crown,
  MapPin,
  CalendarCheck,
  Fish,
  Droplet,
  Leaf,
  Box,
  Eye,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { useAuthStore, useIsAuthenticated, useIsGuest } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { Product } from "@/types";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import ClientNotificationModal from "@/components/modal/ClientNotifModal";
import { useToastHelpers } from "@/components/ui/ToastManager";
import SafeAreaProvider from "@/components/provider/SafeAreaProvider";
import MemberSidebar from "@/components/dc/kit/MemberSidebar";
import MemberProductCard from "@/components/dc/kit/MemberProductCard";
import Placeholder from "@/components/dc/kit/Placeholder";
import { ChevronIcon, MenuIcon, SearchIcon } from "@/components/dc/kit/icons";

/** Section heading row: title, optional status tag, and a "See All" text link. */
function SectionHead({
  title,
  tag,
  onSeeAll,
}: {
  title: string;
  tag?: ReactNode;
  onSeeAll?: () => void;
}) {
  return (
    <div className="dk-row between" style={{ marginTop: 40, gap: 16 }}>
      <div className="dk-row wrap" style={{ gap: 10, minWidth: 0 }}>
        <h2 style={{ fontSize: 20 }}>{title}</h2>
        {tag}
      </div>
      {onSeeAll && (
        <button type="button" className="dk-btn dk-btn-text" onClick={onSeeAll} style={{ fontSize: 14, gap: 4, flex: "none" }}>
          See All
          <ChevronIcon />
        </button>
      )}
    </div>
  );
}

/** Placeholder card for a section that hasn't loaded yet (prompt or spinner text). */
function SectionPrompt({ children, role }: { children: ReactNode; role?: string }) {
  return (
    <div className="dk-member-empty" role={role} style={{ padding: "36px 16px", marginTop: 40 }}>
      {children}
    </div>
  );
}

function ClientDashboardContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addItem, getItemById, updateQuantity } = useCartStore();
  const isAuthenticated = useIsAuthenticated();
  const isGuest = useIsGuest();
  const { success, error } = useToastHelpers();
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasShownReservationNotif, setHasShownReservationNotif] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Lazy loading states
  const [loadedSections, setLoadedSections] = useState({
    limited: true,
    newArrivals: false,
    topRated: false,
    featured: false,
  });
  const [isLoadingSection, setIsLoadingSection] = useState<string | null>(null);

  // Handle hydration to prevent SSR mismatch
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Fetch data from Convex
  const productsData = useQuery(api.services.products.getProducts, { isActive: true });
  const topRatedProductsData = useQuery(api.services.products.getTopRatedProducts, {
    limit: 18,
    minRating: 4.0,
  });
  const categoriesData = useQuery(api.services.categories.getCategories, { isActive: true });
  // Stable empty fallbacks so the memos below don't recompute on every render while loading.
  const productsQuery = useMemo(() => productsData ?? [], [productsData]);
  const topRatedProductsQuery = useMemo(() => topRatedProductsData ?? [], [topRatedProductsData]);
  const categoriesQuery = useMemo(() => categoriesData ?? [], [categoriesData]);

  // Get client notifications - only if user is authenticated
  const clientNotifications = useQuery(
    api.services.notifications.getClientNotifications,
    isAuthenticated && user
      ? {
          userId: user._id,
          userEmail: user.email,
          limit: 20,
        }
      : "skip",
  );

  const clientNotificationCounts = useQuery(
    api.services.notifications.getClientNotificationCounts,
    isAuthenticated && user
      ? {
          userId: user._id,
          userEmail: user.email,
        }
      : "skip",
  );

  const displayName = isAuthenticated && user ? user.firstName || "User" : "Guest";

  // Banner auto-rotation (image-based)
  const banners = [
    { id: 1, src: "/banner/ban1.jpg", alt: "Banner 1" },
    { id: 2, src: "/banner/ban2.jpg", alt: "Banner 2" },
    { id: 3, src: "/banner/ban3.jpg", alt: "Banner 3" },
    { id: 4, src: "/banner/ban4.jpg", alt: "Banner 4" },
  ];

  // Show notification for confirmed reservations
  useEffect(() => {
    if (!clientNotifications || hasShownReservationNotif || !isHydrated) return;

    const confirmedReservations = clientNotifications.filter(
      (notif) =>
        notif.type === "reservation" &&
        notif.message.toLowerCase().includes("confirmed") &&
        !notif.isRead,
    );

    if (confirmedReservations.length > 0) {
      setHasShownReservationNotif(true);
      const reservation = confirmedReservations[0];

      success(
        reservation.title,
        reservation.message + " - Check your reservations for pickup details.",
      );
    }
  }, [clientNotifications, hasShownReservationNotif, isHydrated, success]);

  // Redirect admins and super_admins to their respective dashboards
  useEffect(() => {
    if (isAuthenticated && user?.role === "admin") {
      setIsRedirecting(true);
      router.push("/admin/dashboard");
    } else if (isAuthenticated && user?.role === "super_admin") {
      setIsRedirecting(true);
      router.push("/admin/dashboard");
    }
  }, [isAuthenticated, user?.role, router]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [banners.length]);

  // Map real categories to featured ones with icons
  const featuredCategories = useMemo(() => {
    const iconMap: Record<string, LucideIcon> = {
      "tropical fish": Fish,
      freshwater: Droplet,
      tanks: Box,
      "aquarium tanks": Box,
      plants: Leaf,
      "live plants": Leaf,
      decorations: Leaf,
      lighting: Zap,
      filtration: RefreshCw,
      food: Package,
    };

    const allOption = {
      key: "all",
      name: "All Categories",
      icon: Package,
      category: null,
    };

    const categoryOptions = categoriesQuery.slice(0, 3).map((category) => ({
      key: category._id,
      name: category.name,
      icon: iconMap[category.name.toLowerCase()] || Package,
      category: category,
    }));

    return [allOption, ...categoryOptions];
  }, [categoriesQuery]);

  // Filter products based on selected category
  const filteredProducts = useMemo(() => {
    if (selectedCategory === "all") {
      return productsQuery;
    }
    return productsQuery.filter((product) => product.categoryId === selectedCategory);
  }, [productsQuery, selectedCategory]);

  // Lazy loaded product sections using useMemo for optimization
  const productSections = useMemo(() => {
    const shuffled = [...filteredProducts].sort(() => Math.random() - 0.5);

    const limitedStock = [...filteredProducts]
      .filter((product) => product.stock <= 10 && product.stock > 0)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 6);

    const newArrivals = [...filteredProducts]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 12);

    let topRated = topRatedProductsQuery;
    if (selectedCategory !== "all") {
      topRated = topRatedProductsQuery.filter(
        (product) => product.categoryId === selectedCategory,
      );
    }
    topRated = topRated.slice(0, 18);

    return {
      limitedStock: limitedStock.length > 0 ? limitedStock : shuffled.slice(0, 6),
      newArrivals,
      topRated,
      featured: shuffled.slice(18, 24),
    };
  }, [filteredProducts, topRatedProductsQuery, selectedCategory]);

  // Progressive loading function
  const loadSection = useCallback(
    async (sectionName: string) => {
      if (loadedSections[sectionName as keyof typeof loadedSections] || isLoadingSection) return;

      setIsLoadingSection(sectionName);
      await new Promise((resolve) => setTimeout(resolve, 800));

      setLoadedSections((prev) => ({
        ...prev,
        [sectionName]: true,
      }));

      setIsLoadingSection(null);
    },
    [loadedSections, isLoadingSection],
  );

  // Auto-load sections on scroll or after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loadedSections.newArrivals) {
        loadSection("newArrivals");
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [loadedSections.newArrivals, loadSection]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loadedSections.topRated && loadedSections.newArrivals) {
        loadSection("topRated");
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [loadedSections.topRated, loadedSections.newArrivals, loadSection]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loadedSections.featured && loadedSections.topRated) {
        loadSection("featured");
      }
    }, 6000);
    return () => clearTimeout(timer);
  }, [loadedSections.featured, loadedSections.topRated, loadSection]);

  const handleAddToCart = (product: Product) => {
    if (product.stock === 0) {
      error("Out of Stock", "This product is currently out of stock");
      return;
    }

    try {
      addItem(product, 1);
      success("Added to Cart", `${product.name} has been added to your cart`);
    } catch {
      error("Failed to Add", "Could not add item to cart. Please try again.");
    }
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

  const unreadNotificationCount = clientNotificationCounts?.unread || 0;

  // Notification mutations
  const markAsReadMutation = useMutation(api.services.notifications.markAsRead);
  const markAllAsReadMutation = useMutation(api.services.notifications.markAllAsRead);
  const deleteNotificationMutation = useMutation(api.services.notifications.deleteNotification);
  const clearAllNotificationsMutation = useMutation(api.services.notifications.clearAllNotifications);

  // Other screens link here with ?notifications=1 to open the notifications panel (it only lives on this screen).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("notifications")) setShowNotificationModal(true);
  }, []);

  // Notification handlers
  const handleNotificationClick = () => {
    setShowNotificationModal(true);
  };

  const handleCloseNotificationModal = () => {
    setShowNotificationModal(false);
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsReadMutation({ notificationId: id as Id<"notifications"> });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsReadMutation({ scope: "customer" });
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteNotificationMutation({ notificationId: id as Id<"notifications"> });
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllNotificationsMutation({ scope: "customer" });
    } catch (error) {
      console.error("Failed to clear all notifications:", error);
    }
  };

  // Show loading state while redirecting
  if (isRedirecting) {
    return (
      <div className="dk dk-member">
        <div className="dk-member-empty" role="status" style={{ margin: 24 }}>
          <p>Redirecting...</p>
        </div>
      </div>
    );
  }

  const categoryName = (id: string) => categoriesQuery.find((c) => c._id === id)?.name;

  const renderGrid = (products: typeof productsQuery) => (
    <div className="dk-pgrid cols-4">
      {products.map((product) => (
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
        />
      ))}
    </div>
  );

  const hasConfirmedReservation =
    isHydrated &&
    !!clientNotifications &&
    clientNotifications.some(
      (notif) =>
        notif.type === "reservation" &&
        notif.message.toLowerCase().includes("confirmed") &&
        !notif.isRead,
    );

  const iconBox: CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    border: "1.2px solid var(--dk-red)",
    color: "var(--dk-red)",
    flex: "none",
  };

  return (
    <div className="dk dk-member">
      <div className="dk-app">
        <MemberSidebar id="sidebar" active="home" open={sidebarOpen} onClose={closeSidebar} />

        <section className="dk-app-main">
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
              <div style={{ minWidth: 0 }}>
                <p className="dk-eyebrow">Welcome back!</p>
                <h1 style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</h1>
              </div>
            </div>
            <div className="dk-app-actions">
              <button
                type="button"
                className="dk-view-btn"
                onClick={handleNotificationClick}
                aria-label="Notifications"
                style={{ position: "relative", width: 40, height: 40, borderRadius: "50%" }}
              >
                <Bell size={18} aria-hidden="true" />
                {unreadNotificationCount > 0 && (
                  <span className="dk-count" style={{ fontFamily: "var(--dk-f-body)" }}>
                    {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search bar (opens the search screen) */}
          <button
            type="button"
            className="dk-search dk-app-search"
            onClick={() => router.push("/client/search")}
            style={{
              width: "100%",
              height: 48,
              padding: "0 22px 0 52px",
              borderRadius: "var(--dk-r-pill)",
              border: "1px solid var(--dk-n-300)",
              background: "var(--dk-white)",
              color: "var(--dk-n-500)",
              fontSize: 15,
              textAlign: "left",
            }}
          >
            <SearchIcon size={18} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Search for aquatic products...
            </span>
          </button>

          {/* Reservation Status Banner */}
          {hasConfirmedReservation && (
            <div className="dk-panel" style={{ marginTop: 24, display: "flex", gap: 16, alignItems: "flex-start" }}>
              <span style={iconBox} aria-hidden="true">
                <CalendarCheck size={18} />
              </span>
              <div style={{ minWidth: 0 }}>
                <h3 className="dk-h4">Reservation Confirmed!</h3>
                <p className="dk-muted" style={{ fontSize: 14, lineHeight: "22px", marginTop: 4 }}>
                  Your fish reservation has been confirmed and is ready for pickup. Visit our store to collect your order.
                </p>
                <div className="dk-actions" style={{ marginTop: 14 }}>
                  <button type="button" className="dk-btn dk-btn-red sm" onClick={() => router.push("/client/reservations")}>
                    View Details
                  </button>
                  <button type="button" className="dk-btn dk-btn-outline-dark sm" onClick={handleNotificationClick}>
                    <Bell size={16} aria-hidden="true" />
                    Notifications
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Hero Banner — the promo artwork carries its own headline, so it is shown whole (never cropped) in a plain
              frame; tapping it opens search as before. */}
          <div className="dk-dash-banner">
            <button
              type="button"
              className="dk-dash-banner-img"
              onClick={() => router.push("/client/search")}
              aria-label={`${banners[currentBannerIndex].alt} — open search`}
            >
              {/* Blurred copy of the art fills the wide strip; the artwork itself sits whole on top, never cropped. */}
              <span className="dk-dash-banner-bg" style={{ backgroundImage: `url(${banners[currentBannerIndex].src})` }} aria-hidden="true" />
              <Placeholder src={banners[currentBannerIndex].src} alt="" onDark contain />
            </button>

            {/* Banner indicators */}
            <div role="tablist" aria-label="Banner navigation" className="dk-dash-dots">
              {banners.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrentBannerIndex(index)}
                  role="tab"
                  aria-selected={index === currentBannerIndex}
                  aria-label={`Go to banner ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Service Features */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
              gap: 12,
              marginTop: 24,
            }}
          >
            {[
              { icon: CalendarCheck, text: "Easy Reservations" },
              { icon: MapPin, text: "In-Store Pickup" },
              { icon: Crown, text: "Premium Quality" },
            ].map((feature, index) => (
              <div
                key={index}
                className="dk-panel"
                style={{ padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}
              >
                <span style={iconBox} aria-hidden="true">
                  <feature.icon size={18} />
                </span>
                <p style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{feature.text}</p>
              </div>
            ))}
          </div>

          {/* Categories */}
          <SectionHead title="Categories" onSeeAll={() => router.push("/client/categories")} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: 12,
              marginTop: 16,
            }}
          >
            {featuredCategories.map((category) => (
              <button
                key={category.key}
                type="button"
                className="dk-chip"
                onClick={() => setSelectedCategory(category.key)}
                aria-label={`Filter by ${category.name}`}
                aria-pressed={selectedCategory === category.key}
                style={{
                  height: 56,
                  width: "100%",
                  borderRadius: "var(--dk-r-card)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "0 16px",
                  fontWeight: 700,
                  minWidth: 0,
                }}
              >
                <category.icon size={18} aria-hidden="true" style={{ flex: "none" }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{category.name}</span>
              </button>
            ))}
          </div>

          {/* Limited Stocks Section */}
          {productSections.limitedStock.length > 0 && (
            <>
              <SectionHead
                title="Limited Stocks"
                tag={<span className="dk-status red">Running Out</span>}
                onSeeAll={() => router.push("/client/search")}
              />
              {renderGrid(productSections.limitedStock)}
            </>
          )}

          {/* New Arrivals - Lazy loaded */}
          {loadedSections.newArrivals ? (
            productSections.newArrivals.length > 0 && (
              <>
                <SectionHead
                  title="New Arrivals"
                  tag={<span className="dk-status pale">Fresh Stock!</span>}
                  onSeeAll={() => router.push("/client/search?sort=newest")}
                />
                {renderGrid(productSections.newArrivals.slice(0, 4))}
              </>
            )
          ) : isLoadingSection === "newArrivals" ? (
            <SectionPrompt role="status">
              <p>Loading new arrivals...</p>
            </SectionPrompt>
          ) : (
            <SectionPrompt>
              <Eye size={24} aria-hidden="true" style={{ display: "block", color: "var(--dk-n-400)", margin: "0 auto 10px" }} />
              <p style={{ margin: "0 auto" }}>Discover fresh arrivals</p>
              <div className="dk-row">
                <button type="button" className="dk-btn dk-btn-outline-dark sm" onClick={() => loadSection("newArrivals")}>
                  <Zap size={16} aria-hidden="true" />
                  Load New Arrivals
                </button>
              </div>
            </SectionPrompt>
          )}

          {/* Top Rated - Lazy loaded */}
          {loadedSections.topRated ? (
            productSections.topRated.length > 0 && (
              <>
                <SectionHead
                  title="Top Rated"
                  tag={<span className="dk-status black">Most Reserved</span>}
                  onSeeAll={() => router.push("/client/search?sort=rating")}
                />
                {renderGrid(productSections.topRated.slice(0, 6))}
              </>
            )
          ) : isLoadingSection === "topRated" ? (
            <SectionPrompt role="status">
              <p>Loading top rated products...</p>
            </SectionPrompt>
          ) : (
            <SectionPrompt>
              <Star size={24} aria-hidden="true" style={{ display: "block", color: "var(--dk-n-400)", margin: "0 auto 10px" }} />
              <p style={{ margin: "0 auto" }}>Explore our best sellers</p>
              <div className="dk-row">
                <button type="button" className="dk-btn dk-btn-outline-dark sm" onClick={() => loadSection("topRated")}>
                  <Star size={16} aria-hidden="true" />
                  Load Top Rated
                </button>
              </div>
            </SectionPrompt>
          )}

          {/* Guest CTA */}
          {isGuest && (
            <div
              className="dk-panel dark"
              style={{ marginTop: 40, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}
            >
              <div style={{ minWidth: 0, flex: "1 1 260px" }}>
                <h3 className="dk-h4">Join Dragon Cave!</h3>
                <p style={{ fontSize: 14, lineHeight: "22px", color: "var(--dk-n-400)", marginTop: 4 }}>
                  Create an account to save favorites, track orders, and get exclusive deals!
                </p>
              </div>
              <button type="button" className="dk-btn dk-btn-red sm" onClick={() => router.push("/auth/register")}>
                Sign Up
              </button>
            </div>
          )}

          {/* Featured Section - Lazy loaded (if authenticated) */}
          {isAuthenticated &&
            (loadedSections.featured ? (
              productSections.featured.length > 0 && (
                <>
                  <SectionHead title="Recommended for You" onSeeAll={() => router.push("/client/search")} />
                  {renderGrid(productSections.featured.slice(0, 4))}
                </>
              )
            ) : isLoadingSection === "featured" ? (
              <SectionPrompt role="status">
                <p>Loading your recommendations...</p>
              </SectionPrompt>
            ) : (
              <SectionPrompt>
                <TrendingUp size={24} aria-hidden="true" style={{ display: "block", color: "var(--dk-n-400)", margin: "0 auto 10px" }} />
                <p style={{ margin: "0 auto" }}>Discover products picked just for you</p>
                <div className="dk-row">
                  <button type="button" className="dk-btn dk-btn-outline-dark sm" onClick={() => loadSection("featured")}>
                    <TrendingUp size={16} aria-hidden="true" />
                    Load Recommendations
                  </button>
                </div>
              </SectionPrompt>
            ))}
        </section>
      </div>

      {/* Client Notification Modal */}
      <ClientNotificationModal
        isOpen={showNotificationModal}
        onClose={handleCloseNotificationModal}
        notifications={clientNotifications}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        onDeleteNotification={handleDeleteNotification}
        onClearAll={handleClearAll}
      />
    </div>
  );
}

// Main Export with SafeAreaProvider
export default function ClientDashboard() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <ClientDashboardContent />
    </SafeAreaProvider>
  );
}

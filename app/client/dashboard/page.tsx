"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ShoppingCart,
  User,
  Search,
  Bell,
  Gift,
  Star,
  Zap,
  TrendingUp,
  Package,
  ChevronRight,
  Crown,
  Shield,
  MapPin,
  CalendarCheck,
  Fish,
  Droplet,
  Leaf,
  Box,
  Loader2,
  Eye,
  RefreshCw,
} from "lucide-react";
import { useAuthStore, useIsAuthenticated, useIsGuest } from "@/store/auth";
import { useCartItemCount, useCartStore } from "@/store/cart";
import { Product } from "@/types";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Button from "@/components/ui/Button";
import ProductCard from "@/components/ui/ProductCard";
import ClientNotificationModal from "@/components/modal/ClientNotifModal";
import ClientBottomNavbar from "@/components/client/ClientBottomNavbar";
import { useToastHelpers } from "@/components/ui/ToastManager";
import SafeAreaProvider from "@/components/provider/SafeAreaProvider";

function ClientDashboardContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addItem, getItemById, updateQuantity } = useCartStore();
  const isAuthenticated = useIsAuthenticated();
  const isGuest = useIsGuest();
  const cartItemCount = useCartItemCount();
  const { success, error } = useToastHelpers();
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasShownReservationNotif, setHasShownReservationNotif] = useState(false);

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
  const productsQuery = useQuery(api.services.products.getProducts, { isActive: true }) || [];
  const topRatedProductsQuery = useQuery(api.services.products.getTopRatedProducts, {
    limit: 18,
    minRating: 4.0,
  }) || [];
  const categoriesQuery = useQuery(api.services.categories.getCategories, { isActive: true }) || [];

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
        { duration: 8000 },
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

  // Show loading state while redirecting
  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 safe-area-container">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60 text-sm">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Map real categories to featured ones with icons
  const featuredCategories = useMemo(() => {
    const iconMap: Record<string, any> = {
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
    } catch (err) {
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

  // Notification handlers
  const handleNotificationClick = () => {
    setShowNotificationModal(true);
  };

  const handleCloseNotificationModal = () => {
    setShowNotificationModal(false);
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsReadMutation({ notificationId: id as any });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsReadMutation();
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteNotificationMutation({ notificationId: id as any });
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllNotificationsMutation();
    } catch (error) {
      console.error("Failed to clear all notifications:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Global styles for hiding scrollbar */}
      <style jsx global>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Enhanced Fixed Header with Safe Area */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-white/10 safe-area-top">
        <div className="mx-3 px-3 sm:px-4 py-2.5 sm:py-3 safe-area-horizontal">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-primary to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg">
                <span className="text-white font-bold text-xs sm:text-sm">CD</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-primary font-medium truncate">Welcome back!</p>
                <p className="text-xs sm:text-sm font-bold text-white truncate">{displayName}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <button
                onClick={handleNotificationClick}
                className="relative p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-secondary/60 border border-white/10 hover:bg-secondary/80 active:bg-secondary transition-colors"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-error text-white text-[10px] sm:text-xs rounded-full min-w-[16px] sm:min-w-[18px] h-4 sm:h-[18px] flex items-center justify-center font-bold shadow-lg">
                    {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-2 sm:mt-3 max-w-7xl mx-auto">
            <button
              onClick={() => router.push("/client/search")}
              className="w-full flex items-center px-3 sm:px-4 py-2 sm:py-2.5 bg-secondary/60 border border-white/10 rounded-lg sm:rounded-xl text-left transition-colors hover:bg-secondary/80 active:bg-secondary"
            >
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/50 mr-2 sm:mr-3 flex-shrink-0" />
              <span className="text-white/50 text-xs sm:text-sm truncate">Search for aquatic products...</span>
            </button>
          </div>
        </div>
      </div>

      <div className="pt-[110px] sm:pt-[120px] pb-20 sm:pb-24 safe-area-horizontal">
        {/* Reservation Status Banner */}
        {isHydrated &&
          clientNotifications &&
          clientNotifications.some(
            (notif) =>
              notif.type === "reservation" &&
              notif.message.toLowerCase().includes("confirmed") &&
              !notif.isRead,
          ) && (
            <div className="px-3 sm:px-4 mb-3 sm:mb-4">
              <div className="max-w-7xl mx-auto bg-gradient-to-r from-green-500/20 to-emerald-600/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-green-500/30">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <CalendarCheck className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-sm sm:text-base mb-0.5 sm:mb-1">
                      Reservation Confirmed!
                    </h3>
                    <p className="text-xs sm:text-sm text-white/80 mb-2 sm:mb-3 leading-relaxed">
                      Your fish reservation has been confirmed and is ready for pickup. Visit our store to collect your order.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => router.push("/client/reservations")}
                        size="sm"
                        className="bg-green-500 hover:bg-green-600 text-xs sm:text-sm h-8 sm:h-9"
                      >
                        View Details
                      </Button>
                      <Button
                        onClick={handleNotificationClick}
                        size="sm"
                        variant="outline"
                        className="border-green-500/30 text-green-400 hover:bg-green-500/10 text-xs sm:text-sm h-8 sm:h-9"
                      >
                        <Bell className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        Notifications
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Hero Banner */}
        <div className="px-3 sm:px-4 mb-3 sm:mb-4">
          <div className="relative h-28 sm:h-32 md:h-40 rounded-xl sm:rounded-2xl overflow-hidden max-w-7xl mx-auto shadow-xl">
            <Image
              src={banners[currentBannerIndex].src}
              alt={banners[currentBannerIndex].alt}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
            />
            <button
              aria-label="Open search"
              onClick={() => router.push("/client/search")}
              className="absolute inset-0"
            />

            {/* Banner indicators */}
            <div
              className="absolute bottom-2 sm:bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-1.5 sm:space-x-2"
              role="tablist"
              aria-label="Banner navigation"
            >
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentBannerIndex(index)}
                  className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-1 focus:ring-offset-transparent ${
                    index === currentBannerIndex ? "bg-white w-6 sm:w-8" : "bg-white/40"
                  }`}
                  role="tab"
                  aria-selected={index === currentBannerIndex}
                  aria-label={`Go to banner ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Service Features */}
        <div className="px-3 sm:px-4 mb-4 sm:mb-6">
          <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 max-w-7xl mx-auto">
            {[
              { icon: CalendarCheck, text: "Easy Reservations", color: "text-blue-400" },
              { icon: MapPin, text: "In-Store Pickup", color: "text-green-400" },
              { icon: Crown, text: "Premium Quality", color: "text-yellow-400" },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-secondary/40 backdrop-blur-sm rounded-lg sm:rounded-xl p-2.5 sm:p-3 md:p-4 text-center border border-white/5 hover:bg-secondary/60 transition-colors"
              >
                <feature.icon className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 mx-auto mb-1 sm:mb-1.5 ${feature.color}`} />
                <p className="text-[10px] sm:text-xs md:text-sm text-white/70 font-medium leading-tight">
                  {feature.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="px-3 sm:px-4 mb-4 sm:mb-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h3 className="font-bold text-white text-sm sm:text-base">Categories</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/client/categories")}
                className="text-primary text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
              >
                See All
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-0.5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-2.5 md:gap-3">
              {featuredCategories.map((category, index) => {
                const colorOptions = [
                  "from-amber-600 to-orange-700 shadow-amber-600/20",
                  "from-slate-600 to-slate-700 shadow-slate-600/20",
                  "from-stone-600 to-gray-700 shadow-stone-600/20",
                  "from-teal-700 to-green-800 shadow-teal-700/20",
                ];
                const colorClass = colorOptions[index % colorOptions.length];

                return (
                  <button
                    key={category.key}
                    onClick={() => setSelectedCategory(category.key)}
                    className={`group relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded-lg sm:rounded-xl ${
                      selectedCategory === category.key
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : ""
                    }`}
                    aria-label={`Filter by ${category.name}`}
                    aria-pressed={selectedCategory === category.key}
                  >
                    <div
                      className={`w-full h-14 sm:h-16 md:h-18 rounded-lg sm:rounded-xl bg-gradient-to-r ${colorClass} shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02] active:scale-[0.98]`}
                    >
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                      <div className="h-full flex items-center px-2.5 sm:px-3 md:px-4 space-x-2 sm:space-x-2.5 md:space-x-3 relative z-10">
                        <div className="p-1 sm:p-1.5 bg-white/15 rounded-md backdrop-blur-sm border border-white/10 flex-shrink-0">
                          <category.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/90" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <span className="text-xs sm:text-sm font-medium text-white/90 block leading-tight truncate">
                            {category.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Limited Stocks Section */}
        {productSections.limitedStock.length > 0 && (
          <div className="mb-4 sm:mb-6">
            <div className="px-3 sm:px-4 mb-2 sm:mb-3">
              <div className="flex items-center justify-between max-w-7xl mx-auto">
                <div className="flex items-center space-x-1.5 sm:space-x-2 flex-1 min-w-0">
                  <div className="flex items-center space-x-1 sm:space-x-1.5 flex-shrink-0">
                    <Package className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                    <h3 className="font-bold text-white text-sm sm:text-base">Limited Stocks</h3>
                  </div>
                  <div className="flex items-center space-x-1 bg-orange-500/20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full flex-shrink-0">
                    <span className="text-[10px] sm:text-xs text-orange-400 font-medium whitespace-nowrap">Running Out</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/client/search")}
                  className="text-primary text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3 flex-shrink-0"
                >
                  <span className="hidden sm:inline">See All</span>
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 sm:ml-0.5" />
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto hide-scrollbar">
              <div className="flex space-x-2 sm:space-x-3 px-3 sm:px-4">
                {productSections.limitedStock.map((product) => (
                  <div key={product._id} className="min-w-[140px] max-w-[140px] sm:min-w-[160px] sm:max-w-[160px]">
                    <ProductCard
                      product={product}
                      cartItem={getItemById(product._id)}
                      viewMode="grid"
                      onAddToCart={handleAddToCart}
                      onQuantityChange={handleQuantityChange}
                      onClick={handleProductClick}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* New Arrivals - Lazy loaded */}
        {loadedSections.newArrivals ? (
          productSections.newArrivals.length > 0 && (
            <div className="mb-4 sm:mb-6">
              <div className="px-3 sm:px-4 mb-2 sm:mb-3">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                  <div className="flex items-center space-x-1.5 sm:space-x-2 flex-1 min-w-0">
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
                    <h3 className="font-bold text-white text-sm sm:text-base truncate">New Arrivals</h3>
                    <div className="bg-blue-500/20 px-1.5 sm:px-2 py-0.5 rounded-full flex-shrink-0">
                      <span className="text-[10px] sm:text-xs text-blue-400 font-medium whitespace-nowrap">Fresh Stock!</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/client/search?sort=newest")}
                    className="text-primary text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3 flex-shrink-0"
                  >
                    <span className="hidden sm:inline">See All</span>
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 sm:ml-0.5" />
                  </Button>
                </div>
              </div>

              <div className="px-3 sm:px-4">
                <div className="grid grid-cols-2 gap-2 sm:gap-3 max-w-7xl mx-auto">
                  {productSections.newArrivals.slice(0, 4).map((product) => (
                    <ProductCard
                      key={product._id}
                      product={product}
                      cartItem={getItemById(product._id)}
                      viewMode="grid"
                      onAddToCart={handleAddToCart}
                      onQuantityChange={handleQuantityChange}
                      onClick={handleProductClick}
                    />
                  ))}
                </div>
              </div>
            </div>
          )
        ) : isLoadingSection === "newArrivals" ? (
          <div className="mb-4 sm:mb-6 px-3 sm:px-4">
            <div className="bg-secondary/30 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center max-w-7xl mx-auto">
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary mx-auto mb-2 sm:mb-3 animate-spin" />
              <p className="text-white/60 text-xs sm:text-sm">Loading new arrivals...</p>
            </div>
          </div>
        ) : (
          <div className="mb-4 sm:mb-6 px-3 sm:px-4">
            <div className="bg-secondary/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center max-w-7xl mx-auto">
              <Eye className="w-6 h-6 sm:w-8 sm:h-8 text-white/40 mx-auto mb-2 sm:mb-3" />
              <p className="text-white/60 text-xs sm:text-sm mb-2 sm:mb-3">Discover fresh arrivals</p>
              <Button
                onClick={() => loadSection("newArrivals")}
                size="sm"
                className="bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 text-xs sm:text-sm h-8 sm:h-9"
              >
                <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                Load New Arrivals
              </Button>
            </div>
          </div>
        )}

        {/* Top Rated - Lazy loaded */}
        {loadedSections.topRated ? (
          productSections.topRated.length > 0 && (
            <div className="mb-4 sm:mb-6">
              <div className="px-3 sm:px-4 mb-2 sm:mb-3">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                  <div className="flex items-center space-x-1.5 sm:space-x-2 flex-1 min-w-0">
                    <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 flex-shrink-0" />
                    <h3 className="font-bold text-white text-sm sm:text-base truncate">Top Rated</h3>
                    <div className="bg-yellow-500/20 px-1.5 sm:px-2 py-0.5 rounded-full flex-shrink-0">
                      <span className="text-[10px] sm:text-xs text-yellow-400 font-medium whitespace-nowrap">Most Reserved</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/client/search?sort=rating")}
                    className="text-primary text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3 flex-shrink-0"
                  >
                    <span className="hidden sm:inline">See All</span>
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 sm:ml-0.5" />
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto hide-scrollbar">
                <div className="flex space-x-2 sm:space-x-3 px-3 sm:px-4">
                  {productSections.topRated.slice(0, 6).map((product) => (
                    <div key={product._id} className="min-w-[140px] max-w-[140px] sm:min-w-[160px] sm:max-w-[160px]">
                      <ProductCard
                        product={product}
                        cartItem={getItemById(product._id)}
                        viewMode="grid"
                        onAddToCart={handleAddToCart}
                        onQuantityChange={handleQuantityChange}
                        onClick={handleProductClick}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        ) : isLoadingSection === "topRated" ? (
          <div className="mb-4 sm:mb-6 px-3 sm:px-4">
            <div className="bg-secondary/30 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center max-w-7xl mx-auto">
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary mx-auto mb-2 sm:mb-3 animate-spin" />
              <p className="text-white/60 text-xs sm:text-sm">Loading top rated products...</p>
            </div>
          </div>
        ) : (
          <div className="mb-4 sm:mb-6 px-3 sm:px-4">
            <div className="bg-secondary/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center max-w-7xl mx-auto">
              <Star className="w-6 h-6 sm:w-8 sm:h-8 text-white/40 mx-auto mb-2 sm:mb-3" />
              <p className="text-white/60 text-xs sm:text-sm mb-2 sm:mb-3">Explore our best sellers</p>
              <Button
                onClick={() => loadSection("topRated")}
                size="sm"
                className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 text-xs sm:text-sm h-8 sm:h-9"
              >
                <Star className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                Load Top Rated
              </Button>
            </div>
          </div>
        )}

        {/* Guest CTA */}
        {isGuest && (
          <div className="px-3 sm:px-4 mb-4 sm:mb-6">
            <div className="max-w-7xl mx-auto bg-gradient-to-r from-primary/20 to-orange-600/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-primary/20">
              <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-sm sm:text-base mb-0.5 sm:mb-1">Join Dragon Cave!</h3>
                  <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                    Create an account to save favorites, track orders, and get exclusive deals!
                  </p>
                </div>
                <Button
                  onClick={() => router.push("/auth/register")}
                  size="sm"
                  className="bg-primary/90 hover:bg-primary w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-9"
                >
                  Sign Up
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Featured Section - Lazy loaded (if authenticated) */}
        {isAuthenticated &&
          (loadedSections.featured ? (
            productSections.featured.length > 0 && (
              <div className="mb-4 sm:mb-6">
                <div className="px-3 sm:px-4 mb-2 sm:mb-3">
                  <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center space-x-1.5 sm:space-x-2 flex-1 min-w-0">
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                      <h3 className="font-bold text-white text-sm sm:text-base truncate">Recommended for You</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push("/client/search")}
                      className="text-primary text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3 flex-shrink-0"
                    >
                      <span className="hidden sm:inline">See All</span>
                      <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 sm:ml-0.5" />
                    </Button>
                  </div>
                </div>

                <div className="px-3 sm:px-4">
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 max-w-7xl mx-auto">
                    {productSections.featured.slice(0, 4).map((product) => (
                      <ProductCard
                        key={product._id}
                        product={product}
                        cartItem={getItemById(product._id)}
                        viewMode="grid"
                        onAddToCart={handleAddToCart}
                        onQuantityChange={handleQuantityChange}
                        onClick={handleProductClick}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )
          ) : isLoadingSection === "featured" ? (
            <div className="mb-4 sm:mb-6 px-3 sm:px-4">
              <div className="bg-secondary/30 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center max-w-7xl mx-auto">
                <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary mx-auto mb-2 sm:mb-3 animate-spin" />
                <p className="text-white/60 text-xs sm:text-sm">Loading your recommendations...</p>
              </div>
            </div>
          ) : (
            <div className="mb-4 sm:mb-6 px-3 sm:px-4">
              <div className="bg-secondary/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center max-w-7xl mx-auto">
                <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-white/40 mx-auto mb-2 sm:mb-3" />
                <p className="text-white/60 text-xs sm:text-sm mb-2 sm:mb-3">Discover products picked just for you</p>
                <Button
                  onClick={() => loadSection("featured")}
                  size="sm"
                  className="bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 text-xs sm:text-sm h-8 sm:h-9"
                >
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  Load Recommendations
                </Button>
              </div>
            </div>
          ))}
      </div>

      {/* Client Bottom Navigation */}
      <ClientBottomNavbar />

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
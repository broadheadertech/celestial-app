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
import { localNotificationService } from "@/lib/notifications/localNotifications";

export default function ClientDashboard() {
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
  const [hasShownReservationNotif, setHasShownReservationNotif] =
    useState(false);

  // Lazy loading states
  const [loadedSections, setLoadedSections] = useState({
    limited: true, // Always load first section
    newArrivals: false,
    topRated: false,
    featured: false,
  });
  const [isLoadingSection, setIsLoadingSection] = useState<string | null>(null);

  // Handle hydration to prevent SSR mismatch
  useEffect(() => {
    setIsHydrated(true);

    // Initialize local notifications
    localNotificationService.initialize();
  }, []);

  // Fetch data from Convex
  const productsQuery =
    useQuery(api.services.products.getProducts, { isActive: true }) || [];
  const topRatedProductsQuery =
    useQuery(api.services.products.getTopRatedProducts, {
      limit: 18,
      minRating: 4.0,
    }) || [];
  const categoriesQuery =
    useQuery(api.services.categories.getCategories, { isActive: true }) || [];

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

  const displayName =
    isAuthenticated && user ? user.firstName || "User" : "Guest";

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

      // Show toast notification
      success(
        reservation.title,
        reservation.message + " - Check your reservations for pickup details.",
        { duration: 8000 },
      );

      // Show native notification on mobile
      localNotificationService.showNotification({
        title: reservation.title,
        body: reservation.message,
        data: {
          type: "reservation",
          notificationId: reservation._id,
        },
      });
    }
  }, [clientNotifications, hasShownReservationNotif, isHydrated, success]);

  // Redirect admins and super_admins to their respective dashboards
  useEffect(() => {
    if (isAuthenticated && user?.role === "admin") {
      setIsRedirecting(true);
      router.push("/admin/dashboard");
    } else if (isAuthenticated && user?.role === "super_admin") {
      setIsRedirecting(true);
      router.push("/control_panel");
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">Redirecting...</p>
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

    // Add "All Categories" as first option
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

    return productsQuery.filter(
      (product) => product.categoryId === selectedCategory,
    );
  }, [productsQuery, selectedCategory]);

  // Lazy loaded product sections using useMemo for optimization
  const productSections = useMemo(() => {
    const shuffled = [...filteredProducts].sort(() => Math.random() - 0.5);

    // Sort products for different sections
    const limitedStock = [...filteredProducts]
      .filter((product) => product.stock <= 10 && product.stock > 0)
      .sort((a, b) => a.stock - b.stock) // Sort by lowest stock first
      .slice(0, 6);

    const newArrivals = [...filteredProducts]
      .sort((a, b) => b.createdAt - a.createdAt) // Sort by newest first
      .slice(0, 12);

    // Filter top rated products by category if a category is selected
    let topRated = topRatedProductsQuery;
    if (selectedCategory !== "all") {
      topRated = topRatedProductsQuery.filter(
        (product) => product.categoryId === selectedCategory,
      );
    }
    topRated = topRated.slice(0, 18);

    return {
      limitedStock:
        limitedStock.length > 0 ? limitedStock : shuffled.slice(0, 6),
      newArrivals,
      topRated,
      featured: shuffled.slice(18, 24),
    };
  }, [filteredProducts, topRatedProductsQuery, selectedCategory]);

  // Progressive loading function
  const loadSection = useCallback(
    async (sectionName: string) => {
      if (
        loadedSections[sectionName as keyof typeof loadedSections] ||
        isLoadingSection
      )
        return;

      setIsLoadingSection(sectionName);

      // Simulate loading delay for better UX
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
    const newQuantity = Math.max(
      0,
      Math.min(product.stock, currentQuantity + change),
    );
    if (newQuantity === 0) return;
    updateQuantity(product._id, newQuantity);
  };

  const handleProductClick = (product: Product) => {
    router.push(`/client/product-detail?id=${product._id}`);
  };

  // Get unread notification count
  const unreadNotificationCount = clientNotificationCounts?.unread || 0;

  // Notification mutations
  const markAsReadMutation = useMutation(api.services.notifications.markAsRead);
  const markAllAsReadMutation = useMutation(
    api.services.notifications.markAllAsRead,
  );
  const deleteNotificationMutation = useMutation(
    api.services.notifications.deleteNotification,
  );
  const clearAllNotificationsMutation = useMutation(
    api.services.notifications.clearAllNotifications,
  );

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
      {/* Add global styles for hiding scrollbar */}
      <style jsx global>{`
        .hide-scrollbar {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none; /* Chrome, Safari and Opera */
        }
      `}</style>

      {/* Enhanced Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-white/10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CD</span>
              </div>
              <div>
                <p className="text-xs text-primary font-medium">
                  Welcome back!
                </p>
                <p className="text-sm font-bold text-white">{displayName}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleNotificationClick}
                className="relative p-2 rounded-xl bg-secondary/60 border border-white/10 hover:bg-secondary/80 transition-colors"
              >
                <Bell className="w-5 h-5 text-white" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-error text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                    {unreadNotificationCount > 9
                      ? "9+"
                      : unreadNotificationCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => router.push("/client/cart")}
                className="relative p-2 rounded-xl bg-secondary/60 border border-white/10 hover:bg-secondary/80 transition-colors"
              >
                <ShoppingCart className="w-5 h-5 text-white" />
                {isHydrated && cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg">
                    {cartItemCount > 9 ? "9+" : cartItemCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-3 relative">
            <button
              onClick={() => router.push("/client/search")}
              className="w-full flex items-center px-4 py-2.5 bg-secondary/60 border border-white/10 rounded-xl text-left transition-colors hover:bg-secondary/80"
            >
              <Search className="w-4 h-4 text-white/50 mr-3" />
              <span className="text-white/50 text-sm">
                Search for aquatic products...
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="pb-20">
        {/* Reservation Status Banner */}
        {isHydrated &&
          clientNotifications &&
          clientNotifications.some(
            (notif) =>
              notif.type === "reservation" &&
              notif.message.toLowerCase().includes("confirmed") &&
              !notif.isRead,
          ) && (
            <div className="px-4 pt-4">
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-600/20 rounded-xl p-4 border border-green-500/30 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <CalendarCheck className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white mb-1">
                      Reservation Confirmed! 🎉
                    </h3>
                    <p className="text-sm text-white/80 mb-3">
                      Your fish reservation has been confirmed and is ready for
                      pickup. Visit our store to collect your order.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => router.push("/client/reservations")}
                        size="sm"
                        className="bg-green-500 hover:bg-green-600"
                      >
                        View Details
                      </Button>
                      <Button
                        onClick={handleNotificationClick}
                        size="sm"
                        variant="outline"
                        className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                      >
                        <Bell className="w-4 h-4 mr-1" />
                        Notifications
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Hero Banner */}
        <div className="px-4 pt-4 mb-4">
          <div className="relative h-32 rounded-xl overflow-hidden">
            <Image
              src={banners[currentBannerIndex].src}
              alt={banners[currentBannerIndex].alt}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
            />
            <button
              aria-label="Open search"
              onClick={() => router.push("/client/search")}
              className="absolute inset-0"
            />

            {/* Banner indicators */}
            <div
              className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-2"
              role="tablist"
              aria-label="Banner navigation"
            >
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentBannerIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-1 focus:ring-offset-transparent ${
                    index === currentBannerIndex ? "bg-white" : "bg-white/40"
                  }`}
                  role="tab"
                  aria-selected={index === currentBannerIndex}
                  aria-label={`Go to banner ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Service Features (Reservation-focused) */}
        <div className="px-4 mb-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                icon: CalendarCheck,
                text: "Easy Reservations",
                color: "text-blue-400",
              },
              {
                icon: MapPin,
                text: "In-Store Pickup",
                color: "text-green-400",
              },
              {
                icon: Crown,
                text: "Premium Quality",
                color: "text-yellow-400",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-secondary/40 backdrop-blur-sm rounded-lg p-3 text-center"
              >
                <feature.icon
                  className={`w-5 h-5 mx-auto mb-1 ${feature.color}`}
                />
                <p className="text-xs text-white/70 font-medium">
                  {feature.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-white">Categories</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/client/categories")}
              className="text-primary"
            >
              See All
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {featuredCategories.map((category, index) => {
              const colorOptions = [
                "from-amber-600 to-orange-700 shadow-amber-600/20",
                "from-slate-600 to-slate-700 shadow-slate-600/20",
                "from-stone-600 to-gray-700 shadow-stone-600/20",
                "from-teal-700 to-green-800 shadow-teal-700/20",
                "from-blue-600 to-blue-700 shadow-blue-600/20",
                "from-purple-600 to-purple-700 shadow-purple-600/20",
              ];
              const colorClass = colorOptions[index % colorOptions.length];

              return (
                <button
                  key={category.key}
                  onClick={() => setSelectedCategory(category.key)}
                  className={`group relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                    selectedCategory === category.key
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : ""
                  }`}
                  aria-label={`Filter by ${category.name}`}
                  aria-pressed={selectedCategory === category.key}
                >
                  <div
                    className={`w-full h-16 rounded-xl bg-gradient-to-r ${colorClass} shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105`}
                  >
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                    <div className="h-full flex items-center px-4 space-x-3 relative z-10">
                      <div className="p-1.5 bg-white/15 rounded-md backdrop-blur-sm border border-white/10">
                        <category.icon className="w-4 h-4 text-white/90" />
                      </div>
                      <div className="flex-1 text-left">
                        <span className="text-sm font-medium text-white/90 block leading-tight">
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

        {/* Limited Stocks Section - Always loaded first */}
        {productSections.limitedStock.length > 0 && (
          <div className="mb-6">
            <div className="px-4 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <Package className="w-5 h-5 text-orange-500" />
                    <h3 className="font-bold text-white">Limited Stocks</h3>
                  </div>
                  <div className="flex items-center space-x-1 bg-orange-500/20 px-2 py-1 rounded-full">
                    <span className="text-xs text-orange-400 font-medium">
                      🔥 Running Out
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/client/search")}
                  className="text-primary"
                >
                  See All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto hide-scrollbar">
              <div className="flex space-x-3 px-4">
                {productSections.limitedStock.map((product) => (
                  <div
                    key={product._id}
                    className="min-w-[160px] max-w-[160px]"
                  >
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
            <div className="mb-6">
              <div className="px-4 mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-blue-500" />
                    <h3 className="font-bold text-white">New Arrivals</h3>
                    <div className="bg-blue-500/20 px-2 py-0.5 rounded-full">
                      <span className="text-xs text-blue-400 font-medium">
                        Fresh Stock!
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/client/search?sort=newest")}
                    className="text-primary"
                  >
                    See All
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>

              <div className="px-4">
                <div className="grid grid-cols-2 gap-3">
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
          <div className="mb-6 px-4">
            <div className="bg-secondary/30 rounded-xl p-8 text-center">
              <Loader2 className="w-8 h-8 text-primary mx-auto mb-3 animate-spin" />
              <p className="text-white/60 text-sm">Loading new arrivals...</p>
            </div>
          </div>
        ) : (
          <div className="mb-6 px-4">
            <div className="bg-secondary/30 rounded-xl p-6 text-center">
              <Eye className="w-8 h-8 text-white/40 mx-auto mb-3" />
              <p className="text-white/60 text-sm mb-3">
                Discover fresh arrivals
              </p>
              <Button
                onClick={() => loadSection("newArrivals")}
                size="sm"
                className="bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30"
              >
                <Zap className="w-4 h-4 mr-2" />
                Load New Arrivals
              </Button>
            </div>
          </div>
        )}

        {/* Top Rated - Lazy loaded */}
        {loadedSections.topRated ? (
          productSections.topRated.length > 0 && (
            <div className="mb-6">
              <div className="px-4 mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <h3 className="font-bold text-white">Top Rated</h3>
                    <div className="bg-yellow-500/20 px-2 py-0.5 rounded-full">
                      <span className="text-xs text-yellow-400 font-medium">
                        🔥 Most Reserved
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/client/search?sort=rating")}
                    className="text-primary"
                  >
                    See All
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto hide-scrollbar">
                <div className="flex space-x-3 px-4">
                  {productSections.topRated.slice(0, 6).map((product) => (
                    <div
                      key={product._id}
                      className="min-w-[160px] max-w-[160px]"
                    >
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
          <div className="mb-6 px-4">
            <div className="bg-secondary/30 rounded-xl p-8 text-center">
              <Loader2 className="w-8 h-8 text-primary mx-auto mb-3 animate-spin" />
              <p className="text-white/60 text-sm">
                Loading top rated products...
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-6 px-4">
            <div className="bg-secondary/30 rounded-xl p-6 text-center">
              <Star className="w-8 h-8 text-white/40 mx-auto mb-3" />
              <p className="text-white/60 text-sm mb-3">
                Explore our best sellers
              </p>
              <Button
                onClick={() => loadSection("topRated")}
                size="sm"
                className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30"
              >
                <Star className="w-4 h-4 mr-2" />
                Load Top Rated
              </Button>
            </div>
          </div>
        )}

        {/* Guest CTA */}
        {isGuest && (
          <div className="px-4 mb-6">
            <div className="bg-gradient-to-r from-primary/20 to-orange-600/20 rounded-xl p-4 border border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white mb-1">
                    Join Celestial Drakon!
                  </h3>
                  <p className="text-sm text-white/70">
                    Create an account to save favorites, track orders, and get
                    exclusive deals!
                  </p>
                </div>
                <Button
                  onClick={() => router.push("/auth/register")}
                  size="sm"
                  className="bg-primary/90 hover:bg-primary"
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
              <div className="mb-6">
                <div className="px-4 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <h3 className="font-bold text-white">
                        Recommended for You
                      </h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push("/client/search")}
                      className="text-primary"
                    >
                      See All
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>

                <div className="px-4">
                  <div className="grid grid-cols-2 gap-3">
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
            <div className="mb-6 px-4">
              <div className="bg-secondary/30 rounded-xl p-8 text-center">
                <Loader2 className="w-8 h-8 text-primary mx-auto mb-3 animate-spin" />
                <p className="text-white/60 text-sm">
                  Loading your recommendations...
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-6 px-4">
              <div className="bg-secondary/30 rounded-xl p-6 text-center">
                <TrendingUp className="w-8 h-8 text-white/40 mx-auto mb-3" />
                <p className="text-white/60 text-sm mb-3">
                  Discover products picked just for you
                </p>
                <Button
                  onClick={() => loadSection("featured")}
                  size="sm"
                  className="bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Load Recommendations
                </Button>
              </div>
            </div>
          ))}

        {/* Recently Viewed (placeholder) */}
        {isAuthenticated && (
          <div className="px-4 mb-6">
            <h3 className="font-bold text-white mb-3">Recently Viewed</h3>
            <div className="bg-secondary/30 rounded-xl p-8 text-center">
              <Package className="w-12 h-12 text-white/40 mx-auto mb-3" />
              <p className="text-white/60 text-sm">
                Start browsing to see your recently viewed products
              </p>
            </div>
          </div>
        )}
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

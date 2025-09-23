'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  Filter,
  Eye,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  ChevronDown,
  Download,
  RefreshCw,
  Mail,
  Phone,
  AlertCircle
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import Button from '@/components/ui/Button';
import BottomNavbar from '@/components/common/BottomNavbar';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

type CombinedItem = {
  _id: string;
  type: 'order' | 'reservation';
  code: string;
  status: string;
  totalAmount?: number;
  createdAt: number;
  updatedAt: number;
  customer?: {
    name: string;
    email: string;
    phone?: string;
  };
  itemCount: number;
  userId?: string;
  guestId?: string;
  guestInfo?: {
    name: string;
    email: string;
    phone: string;
    completeAddress?: string;
    pickupSchedule?: {
      date: string;
      time: string;
    };
  };
  items?: Array<{
    productId: string;
    quantity: number;
    reservedPrice?: number;
    price?: number;
    product?: {
      _id: string;
      name: string;
      image?: string;
      category?: string;
      price?: number;
    } | null;
  }>;
  totalQuantity?: number;
  reservationCode?: string;
  expiryDate?: number;
  notes?: string;
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  paymentMethod?: string;
};

export default function AdminOrdersPage() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [mounted, setMounted] = useState(false);

  // Fetch real data from Convex
  const ordersQuery = useQuery(api.services.orders.getAllOrdersAdmin, {});
  const reservationsQuery = useQuery(api.services.reservations.getAllReservationsAdmin, {});

  // Mutations for updating status
  const updateOrderStatus = useMutation(api.services.orders.updateOrderStatus);
  const updateReservationStatus = useMutation(api.services.reservations.updateReservationStatus);
  const markReservationReadyForPickup = useMutation(api.services.reservations.markReservationReadyForPickup);

  // Loading state
  const isLoading = ordersQuery === undefined || reservationsQuery === undefined;

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update dropdown position on scroll or resize
  useEffect(() => {
    const updateDropdownPosition = () => {
      if (selectedItem) {
        const buttonElement = buttonRefs.current[selectedItem];
        if (buttonElement) {
          const rect = buttonElement.getBoundingClientRect();
          setDropdownPosition({
            top: rect.bottom + window.scrollY + 8,
            right: window.innerWidth - rect.right + 16
          });
        }
      }
    };

    if (selectedItem) {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition);
      window.addEventListener('resize', updateDropdownPosition);
      
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [selectedItem]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (selectedItem && !target.closest('.dropdown-menu') && !target.closest('.dropdown-trigger')) {
        setSelectedItem(null);
        setDropdownPosition(null);
      }
    };

    if (selectedItem) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [selectedItem]);

  // Combine and transform data for unified display
  const allItems = useMemo((): CombinedItem[] => {
    if (!ordersQuery || !reservationsQuery) return [];

    // Transform orders data (getAllOrdersAdmin already includes user data)
    const orders: CombinedItem[] = ordersQuery.map(order => ({
      ...order,
      type: 'order' as const,
      code: `ORD-${order._id.slice(-6).toUpperCase()}`,
      customer: order.user ? {
        name: `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim(),
        email: order.user.email || '',
        phone: order.user.phone
      } : undefined,
      itemCount: order.items?.length || 0,
    }));

    // Transform reservations data (getAllReservationsAdmin already includes user data)
    const reservations: CombinedItem[] = reservationsQuery.map(reservation => ({
      ...reservation,
      type: 'reservation' as const,
      code: reservation.reservationCode || `RES-${reservation._id.slice(-6).toUpperCase()}`,
      customer: reservation.guestInfo ? {
        name: reservation.guestInfo.name,
        email: reservation.guestInfo.email,
        phone: reservation.guestInfo.phone
      } : reservation.user ? {
        name: `${reservation.user.firstName || ''} ${reservation.user.lastName || ''}`.trim(),
        email: reservation.user.email || '',
        phone: reservation.user.phone
      } : undefined,
      itemCount: reservation.items?.length || reservation.totalQuantity || 0,
      items: reservation.items,
      totalQuantity: reservation.totalQuantity,
      reservationCode: reservation.reservationCode,
      expiryDate: reservation.expiryDate,
      notes: reservation.notes,
    }));

    return [...orders, ...reservations];
  }, [ordersQuery, reservationsQuery]);

  // Calculate stats
  const orderStats = useMemo(() => {
    const orders = allItems.filter(item => item.type === 'order');
    const reservations = allItems.filter(item => item.type === 'reservation');

    const pending = allItems.filter(item => item.status === 'pending').length;
    const confirmed = allItems.filter(item => item.status === 'confirmed').length;
    const completed = allItems.filter(item =>
      item.status === 'delivered' || item.status === 'completed'
    ).length;
    const cancelled = allItems.filter(item =>
      item.status === 'expired' || item.status === 'cancelled'
    ).length;

    return {
      total: allItems.length,
      orders: orders.length,
      reservations: reservations.length,
      pending,
      confirmed,
      completed,
      cancelled
    };
  }, [allItems]);

  // Filter items
  const filteredItems = useMemo(() => {
    let filtered = allItems;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.code.toLowerCase().includes(query) ||
        item.customer?.name.toLowerCase().includes(query) ||
        item.customer?.email.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(item => item.status === selectedStatus);
    }

    return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [searchQuery, selectedStatus, allItems]);

  const handleUpdateStatus = async (itemId: string, newStatus: string) => {
    try {
      const item = allItems.find(i => i._id === itemId);
      if (!item) return;

      if (item.type === 'order') {
        await updateOrderStatus({
          orderId: itemId as Id<'orders'>,
          status: newStatus as 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
        });
      } else {
        await updateReservationStatus({
          reservationId: itemId as Id<'reservations'>,
          status: newStatus as 'pending' | 'confirmed' | 'ready_for_pickup' | 'completed' | 'expired' | 'cancelled'
        });
      }

      setSelectedItem(null);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleMarkReadyForPickup = async (itemId: string) => {
    try {
      await markReservationReadyForPickup({
        reservationId: itemId as Id<'reservations'>,
        pickupLocation: "Main Store", // Default pickup location
        notes: "Your reservation is ready for pickup. Please visit us during business hours."
      });
      
      setSelectedItem(null);
      // You could add a success notification here
      alert("Reservation marked as ready for pickup! Customer has been notified.");
    } catch (error) {
      console.error('Failed to mark ready for pickup:', error);
      alert("Failed to mark reservation as ready for pickup. Please try again.");
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // The queries will automatically refetch
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleDropdownToggle = (itemId: string) => {
    if (selectedItem === itemId) {
      setSelectedItem(null);
      setDropdownPosition(null);
    } else {
      setSelectedItem(itemId);
      // Position will be calculated in useEffect
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'ready_for_pickup': return <Package className="w-4 h-4" />;
      case 'processing': return <Package className="w-4 h-4" />;
      case 'shipped': return <Package className="w-4 h-4" />;
      case 'delivered': return <CheckCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'expired': return <XCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-warning/20 text-warning border-warning/30',
      confirmed: 'bg-success/20 text-success border-success/30',
      ready_for_pickup: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      processing: 'bg-info/20 text-info border-info/30',
      shipped: 'bg-info/20 text-info border-info/30',
      delivered: 'bg-success/20 text-success border-success/30',
      completed: 'bg-success/20 text-success border-success/30',
      expired: 'bg-error/20 text-error border-error/30',
      cancelled: 'bg-error/20 text-error border-error/30',
    };

    return colors[status as keyof typeof colors] || 'bg-muted/20 text-muted border-muted/30';
  };

  // Skeleton component for loading state
  const SkeletonCard = () => (
    <div className="bg-secondary/40 backdrop-blur-sm border border-white/10 rounded-lg sm:rounded-xl animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Type icon skeleton */}
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white/10 shrink-0"></div>
          
          <div className="min-w-0 flex-1">
            {/* Code and status skeleton */}
            <div className="flex items-center gap-2 mb-1">
              <div className="h-4 bg-white/10 rounded w-20"></div>
              <div className="h-4 bg-white/10 rounded w-16"></div>
            </div>
            {/* Date and items skeleton */}
            <div className="flex items-center gap-2">
              <div className="h-3 bg-white/10 rounded w-24"></div>
              <div className="h-3 bg-white/10 rounded w-16"></div>
            </div>
          </div>
        </div>

        {/* Price and action skeleton */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="text-right">
            <div className="h-4 bg-white/10 rounded w-16 mb-1"></div>
            <div className="h-3 bg-white/10 rounded w-8"></div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-white/10"></div>
        </div>
      </div>

      {/* Customer info skeleton */}
      <div className="px-3 sm:px-4 pb-3 sm:pb-4">
        <div className="flex items-start gap-2 sm:gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white/10 rounded-full shrink-0"></div>
          <div className="flex-1 min-w-0">
            <div className="h-4 bg-white/10 rounded w-32 mb-1"></div>
            <div className="flex gap-4">
              <div className="h-3 bg-white/10 rounded w-24"></div>
              <div className="h-3 bg-white/10 rounded w-20"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Add global styles to hide scrollbars */}
      <style jsx global>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        .scrollbar-hidden::-webkit-scrollbar {
          display: none;
        }

        /* Hide scrollbar for IE, Edge and Firefox */
        .scrollbar-hidden {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }

        /* Apply to body as well */
        body::-webkit-scrollbar {
          display: none;
        }

        body {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* Apply to any scrollable container */
        .scroll-container::-webkit-scrollbar {
          display: none;
        }

        .scroll-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Main scrollable container with hidden scrollbar */}
      <div className="h-screen overflow-y-auto scrollbar-hidden">
        {/* Enhanced Header - Better responsive layout */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-white/10">
          <div className="px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
            {/* Improved top row with better mobile spacing */}
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <button
                  onClick={() => router.back()}
                  className="p-2 sm:p-2.5 rounded-xl bg-secondary/60 border border-white/10 hover:bg-secondary/80 transition-all shrink-0"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </button>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl font-bold text-white truncate">Management Center</h1>
                  <p className="text-xs sm:text-sm text-white/60">Orders & Reservations</p>
                </div>
              </div>

              {/* Improved action buttons with responsive design */}
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="border border-white/10 hover:border-primary/30 px-2 sm:px-3 text-xs sm:text-sm"
                >
                  <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin' : ''} ${
                    window.innerWidth < 640 ? '' : 'mr-2'
                  }`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="border border-white/10 hover:border-primary/30 px-2 sm:px-3 text-xs sm:text-sm"
                >
                  <Download className={`w-3 h-3 sm:w-4 sm:h-4 ${window.innerWidth < 640 ? '' : 'mr-2'}`} />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </div>
            </div>

            {/* Enhanced search and filter row - better mobile layout */}
            <div className="flex gap-2 sm:gap-3 mb-">
              <div className="flex-1 relative min-w-0">
                <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40 shrink-0" />
                <input
                  type="text"
                  placeholder={isLoading ? "Loading..." : "Search orders, customers..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={isLoading}
                  className={`w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 border rounded-lg sm:rounded-xl transition-all text-sm sm:text-base ${
                    isLoading 
                      ? 'bg-secondary/40 border-white/5 text-white/40 cursor-not-allowed' 
                      : 'bg-secondary/60 border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30'
                  }`}
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                disabled={isLoading}
                className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border transition-all flex items-center gap-1 sm:gap-2 shrink-0 ${
                  isLoading
                    ? 'bg-secondary/40 border-white/5 text-white/40 cursor-not-allowed'
                    : showFilters
                      ? 'bg-primary border-primary text-white'
                      : 'bg-secondary/60 border-white/10 text-white hover:bg-secondary/80'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden xs:inline text-sm sm:text-base">Filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Bar - Better responsive grid */}
        <div className="px-3 sm:px-6 lg:px-8 py-3 sm:py-4 border-b border-white/5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
            <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center">
              <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />
                <span className="text-lg sm:text-2xl font-bold text-yellow-400">{orderStats.pending}</span>
              </div>
              <p className="text-xs text-white/60 font-medium">Pending Review</p>
            </div>
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center">
              <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1">
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
                <span className="text-lg sm:text-2xl font-bold text-green-400">{orderStats.confirmed}</span>
              </div>
              <p className="text-xs text-white/60 font-medium">Confirmed</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center">
              <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1">
                <Package className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                <span className="text-lg sm:text-2xl font-bold text-blue-400">{orderStats.completed}</span>
              </div>
              <p className="text-xs text-white/60 font-medium">Completed</p>
            </div>
            <div className="bg-gradient-to-br from-red-500/10 to-pink-500/10 border border-red-500/20 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center">
              <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1">
                <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
                <span className="text-lg sm:text-2xl font-bold text-red-400">{orderStats.cancelled}</span>
              </div>
              <p className="text-xs text-white/60 font-medium">Cancelled</p>
            </div>
          </div>

          {/* Better responsive footer info */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-3 sm:mt-4 gap-2 sm:gap-0">
            <p className="text-sm text-white/60 order-2 sm:order-1">
              Showing <span className="text-white font-medium">{filteredItems.length}</span> of{' '}
              <span className="text-white font-medium">{allItems.length}</span> items
            </p>
            <div className="flex items-center gap-2 text-xs text-white/40 order-1 sm:order-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Live updates</span>
            </div>
          </div>
        </div>

        {/* Enhanced Filters - Better responsive layout */}
        {showFilters && (
          <div className="bg-secondary/40 backdrop-blur-sm border-b border-white/10 px-3 sm:px-6 lg:px-8 py-3 sm:py-4 animate-in slide-in-from-top duration-200">
            <div className="space-y-4 sm:space-y-6">
              {/* Status Filter */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-white mb-2 sm:mb-3">
                  <AlertCircle className="w-4 h-4 text-primary" />
                  Status Filter
                </label>
                <div className="flex flex-wrap gap-2 overflow-x-auto scrollbar-hidden">
                  {[
                    { value: 'all', label: 'All Status', color: 'text-white/70' },
                    { value: 'pending', label: 'Pending', color: 'text-yellow-400' },
                    { value: 'confirmed', label: 'Confirmed', color: 'text-green-400' },
                    { value: 'ready_for_pickup', label: 'Ready for Pickup', color: 'text-purple-400' },
                    { value: 'processing', label: 'Processing', color: 'text-blue-400' },
                    { value: 'completed', label: 'Completed', color: 'text-emerald-400' },
                    { value: 'cancelled', label: 'Cancelled', color: 'text-red-400' },
                  ].map((status) => (
                    <button
                      key={status.value}
                      onClick={() => setSelectedStatus(status.value)}
                      className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm border transition-all font-medium whitespace-nowrap ${
                        selectedStatus === status.value
                          ? 'bg-gradient-to-r from-primary to-primary/80 border-primary text-white shadow-lg scale-95'
                          : `border-white/10 ${status.color} hover:text-white hover:border-primary/30 hover:bg-primary/10`
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Orders List - Better responsive cards with hidden scrollbar */}
        <div className="px-3 sm:px-6 lg:px-8 py-3 sm:py-4 pb-20 overflow-y-auto scrollbar-hidden">
          {isLoading ? (
            <div className="space-y-2 sm:space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 sm:py-16">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-primary/20 to-info/20 rounded-full flex items-center justify-center">
                <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">No items found</h3>
              <p className="text-white/60 mb-4 sm:mb-6 max-w-sm mx-auto text-sm sm:text-base px-4">
                No orders or reservations match your current filters. Try adjusting your search criteria.
              </p>
              <Button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStatus('all');
                }}
                variant="outline"
                className="border-primary/30 text-primary hover:bg-primary/10"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {filteredItems.map((item) => (
                <div
                  key={item._id}
                  className="bg-secondary/40 backdrop-blur-sm border border-white/10 rounded-lg sm:rounded-xl hover:border-primary/30 transition-all duration-200"
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (selectedItem === item._id && !target.closest('.dropdown-menu') && !target.closest('.dropdown-trigger')) {
                      setSelectedItem(null);
                      setDropdownPosition(null);
                    }
                  }}
                >
                  {/* Enhanced compact header - Better mobile layout */}
                  <div className="flex items-center justify-between p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      {/* Type Icon - Better responsive sizing */}
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        item.type === 'order'
                          ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30'
                          : 'bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30'
                      }`}>
                        {item.type === 'order' ? (
                          <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                        ) : (
                          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-white text-sm sm:text-base truncate">{item.code}</h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border font-medium ${getStatusBadge(item.status)} shrink-0`}>
                            {getStatusIcon(item.status)}
                            <span className="capitalize hidden xs:inline">{item.status}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/60 flex-wrap">
                          <span className="whitespace-nowrap">{formatDateTime(item.createdAt)}</span>
                          <span className="hidden xs:inline">•</span>
                          <span className="whitespace-nowrap">
                            {item.type === 'reservation' && item.items && item.items.length > 0
                              ? item.items.length === 1
                                ? `${item.items[0].quantity}x ${item.items[0].product?.name || 'Product'}`
                                : `${item.items.length} items`
                              : `${item.itemCount} items`
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Price and action section - Better mobile layout */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-white text-sm sm:text-base">{formatCurrency(item.totalAmount || 0)}</p>
                        <p className="text-xs text-white/60 hidden sm:block">Total</p>
                      </div>

                      {/* Enhanced Action Dropdown - Better mobile positioning */}
                      <div className="relative">
                        <button
                          ref={(el) => { buttonRefs.current[item._id] = el; }}
                          onClick={() => handleDropdownToggle(item._id)}
                          className="dropdown-trigger w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/30 transition-all flex items-center justify-center shrink-0"
                        >
                          <ChevronDown className={`w-4 h-4 text-white/70 transition-transform ${selectedItem === item._id ? 'rotate-180' : ''}`} />
                        </button>

                      </div>
                    </div>
                  </div>

                  {/* Enhanced Customer Info - Better responsive layout */}
                  <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                    <div className="flex items-start gap-2 sm:gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
                        <User className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate mb-1">
                          {item.customer?.name || 'Guest Customer'}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-white/60">
                          {item.customer?.email && (
                            <div className="flex items-center gap-1 min-w-0">
                              <Mail className="w-3 h-3 shrink-0" />
                              <span className="truncate">{item.customer.email}</span>
                            </div>
                          )}
                          {item.customer?.phone && (
                            <div className="flex items-center gap-1 shrink-0">
                              <Phone className="w-3 h-3" />
                              <span>{item.customer.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Enhanced special info for reservations */}
                    {item.type === 'reservation' && item.guestInfo?.pickupSchedule && (
                      <div className="flex items-center gap-2 sm:gap-3 mt-2 p-2 sm:p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400 shrink-0" />
                        <span className="text-xs sm:text-sm text-white/80 truncate">
                          <span className="hidden sm:inline">Pickup: </span>
                          {item.guestInfo.pickupSchedule.date} at {item.guestInfo.pickupSchedule.time}
                        </span>
                      </div>
                    )}

                    {/* Enhanced notes section */}
                    {item.notes && (
                      <div className="mt-2 p-2 sm:p-3 bg-white/5 border border-white/5 rounded-lg">
                        <p className="text-xs text-white/60 mb-1">Notes:</p>
                        <p className="text-xs sm:text-sm text-white/80 line-clamp-2">{item.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavbar />

      {/* Portal-based Dropdown with hidden scrollbar */}
      {mounted && selectedItem && dropdownPosition && (() => {
        const item = filteredItems.find(i => i._id === selectedItem);
        if (!item) return null;

        return createPortal(
          <div
            className="dropdown-menu fixed w-48 sm:w-52 bg-secondary/95 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl overflow-hidden"
            style={{
              top: `${dropdownPosition.top}px`,
              right: `${dropdownPosition.right}px`,
              zIndex: 99999
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 max-h-96 overflow-y-auto scrollbar-hidden">
              <button
                onClick={() => {
                  router.push(`/admin/${item.type}s/${item._id}`);
                  setSelectedItem(null);
                  setDropdownPosition(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-white hover:bg-white/10 rounded-lg transition-colors text-sm"
              >
                <Eye className="w-4 h-4 text-blue-400" />
                <span>View Details</span>
              </button>

              {item.status === 'pending' && (
                <button
                  onClick={() => {
                    handleUpdateStatus(item._id, 'confirmed');
                    setSelectedItem(null);
                    setDropdownPosition(null);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-white hover:bg-green-500/10 rounded-lg transition-colors text-sm"
                >
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Confirm {item.type}</span>
                </button>
              )}

              {item.status === 'confirmed' && item.type === 'order' && (
                <button
                  onClick={() => {
                    handleUpdateStatus(item._id, 'processing');
                    setSelectedItem(null);
                    setDropdownPosition(null);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-white hover:bg-blue-500/10 rounded-lg transition-colors text-sm"
                >
                  <Package className="w-4 h-4 text-blue-400" />
                  <span>Start Processing</span>
                </button>
              )}

              {item.status === 'confirmed' && item.type === 'reservation' && (
                <button
                  onClick={() => {
                    handleMarkReadyForPickup(item._id);
                    setSelectedItem(null);
                    setDropdownPosition(null);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-white hover:bg-purple-500/10 rounded-lg transition-colors text-sm"
                >
                  <Package className="w-4 h-4 text-purple-400" />
                  <span>Mark Ready for Pickup</span>
                </button>
              )}

              {item.status === 'ready_for_pickup' && item.type === 'reservation' && (
                <button
                  onClick={() => {
                    handleUpdateStatus(item._id, 'completed');
                    setSelectedItem(null);
                    setDropdownPosition(null);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-white hover:bg-green-500/10 rounded-lg transition-colors text-sm"
                >
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Mark Picked Up</span>
                </button>
              )}

              {item.status === 'processing' && (
                <button
                  onClick={() => {
                    handleUpdateStatus(item._id, 'completed');
                    setSelectedItem(null);
                    setDropdownPosition(null);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-white hover:bg-green-500/10 rounded-lg transition-colors text-sm"
                >
                  <Package className="w-4 h-4 text-green-400" />
                  <span>Mark Delivered</span>
                </button>
              )}

              <div className="h-px bg-white/10 my-2" />

              {['pending', 'confirmed', 'ready_for_pickup'].includes(item.status) && (
                <button
                  onClick={() => {
                    handleUpdateStatus(item._id, 'cancelled');
                    setSelectedItem(null);
                    setDropdownPosition(null);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Cancel {item.type}</span>
                </button>
              )}
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
}
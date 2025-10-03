'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import useWindowSize from '@/hooks/useWindowSize';
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
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import Button from '@/components/ui/Button';
import BottomNavbar from '@/components/common/BottomNavbar';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

const ITEMS_PER_PAGE = 15;

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
  const { width } = useWindowSize();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
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
      if (typeof window !== 'undefined' && selectedItem) {
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

    if (typeof window !== 'undefined' && selectedItem) {
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

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.code.toLowerCase().includes(query) ||
        item.customer?.name.toLowerCase().includes(query) ||
        item.customer?.email.toLowerCase().includes(query)
      );
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(item => item.status === selectedStatus);
    }

    return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [searchQuery, selectedStatus, allItems]);

  // Pagination logic
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, currentPage]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatus]);

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
        pickupLocation: "Main Store",
        notes: "Your reservation is ready for pickup. Please visit us during business hours."
      });
      
      setSelectedItem(null);
      alert("Reservation marked as ready for pickup! Customer has been notified.");
    } catch (error) {
      console.error('Failed to mark ready for pickup:', error);
      alert("Failed to mark reservation as ready for pickup. Please try again.");
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleDropdownToggle = (itemId: string) => {
    if (selectedItem === itemId) {
      setSelectedItem(null);
      setDropdownPosition(null);
    } else {
      setSelectedItem(itemId);
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    setShowFilters(false);
    setCurrentPage(1);
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

  const SkeletonCard = () => (
    <div className="bg-secondary/40 backdrop-blur-sm border border-white/10 rounded-lg sm:rounded-xl animate-pulse">
      <div className="flex items-center justify-between p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white/10 shrink-0"></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-4 bg-white/10 rounded w-20"></div>
              <div className="h-4 bg-white/10 rounded w-16"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 bg-white/10 rounded w-24"></div>
              <div className="h-3 bg-white/10 rounded w-16"></div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="text-right">
            <div className="h-4 bg-white/10 rounded w-16 mb-1"></div>
            <div className="h-3 bg-white/10 rounded w-8"></div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-white/10"></div>
        </div>
      </div>
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
    <div className="min-h-screen bg-background text-foreground pb-20 sm:pb-6">
      {/* Header - Mobile Optimized */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
        <div className="px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 active:scale-95 transition-all flex-shrink-0 touch-manipulation"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold text-white truncate">Management Center</h1>
                <p className="text-xs sm:text-sm text-white/60 hidden xs:block truncate">Orders & Reservations</p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 sm:px-3 sm:py-2 rounded-lg bg-secondary/60 border border-white/10 hover:bg-secondary/80 active:scale-95 transition-all touch-manipulation"
              >
                <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/60 border border-white/10 hover:bg-secondary/80 active:scale-95 transition-all touch-manipulation"
              >
                <Download className="w-4 h-4 text-white" />
                <span className="text-sm text-white">Export</span>
              </button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/40 pointer-events-none" />
              <input
                type="text"
                placeholder="Search orders, customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isLoading}
                className="w-full pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 sm:py-3 bg-secondary/60 border border-white/10 rounded-lg text-sm sm:text-base text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 sm:right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-white/10 active:scale-95 transition-all touch-manipulation"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/60" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              disabled={isLoading}
              className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg border transition-all flex items-center gap-1.5 sm:gap-2 flex-shrink-0 active:scale-95 touch-manipulation ${
                showFilters || selectedStatus !== 'all'
                  ? 'bg-primary border-primary text-white'
                  : 'bg-secondary/60 border-white/10 text-white hover:bg-secondary/80'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-medium hidden xs:inline">Filters</span>
              {selectedStatus !== 'all' && (
                <span className="w-2 h-2 rounded-full bg-white flex-shrink-0" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stats - Mobile Optimized Grid */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-white/10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-2.5 sm:p-4">
            <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />
              <span className="text-lg sm:text-2xl font-bold text-yellow-400">{orderStats.pending}</span>
            </div>
            <p className="text-[10px] sm:text-xs text-white/60 font-medium text-center">Pending Review</p>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-2.5 sm:p-4">
            <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1">
              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
              <span className="text-lg sm:text-2xl font-bold text-green-400">{orderStats.confirmed}</span>
            </div>
            <p className="text-[10px] sm:text-xs text-white/60 font-medium text-center">Confirmed</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg p-2.5 sm:p-4">
            <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1">
              <Package className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
              <span className="text-lg sm:text-2xl font-bold text-blue-400">{orderStats.completed}</span>
            </div>
            <p className="text-[10px] sm:text-xs text-white/60 font-medium text-center">Completed</p>
          </div>
          <div className="bg-gradient-to-br from-red-500/10 to-pink-500/10 border border-red-500/20 rounded-lg p-2.5 sm:p-4">
            <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1">
              <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
              <span className="text-lg sm:text-2xl font-bold text-red-400">{orderStats.cancelled}</span>
            </div>
            <p className="text-[10px] sm:text-xs text-white/60 font-medium text-center">Cancelled</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 sm:mt-4">
          <p className="text-xs sm:text-sm text-white/60">
            Showing <span className="text-white font-medium">{paginatedItems.length}</span> of{' '}
            <span className="text-white font-medium">{filteredItems.length}</span> items
          </p>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="hidden xs:inline">Live updates</span>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-secondary/60 border-b border-white/10 px-3 sm:px-6 py-3 sm:py-4">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-medium text-white">Filters</h3>
              <div className="flex items-center gap-2">
                {selectedStatus !== 'all' && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-primary hover:text-primary/80 transition-colors touch-manipulation"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-1 rounded hover:bg-white/10 transition-colors sm:hidden touch-manipulation"
                >
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-medium text-white mb-2">Status</label>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {[
                  { value: 'all', label: 'All Status' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'confirmed', label: 'Confirmed' },
                  { value: 'ready_for_pickup', label: 'Ready for Pickup' },
                  { value: 'processing', label: 'Processing' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' },
                ].map((status) => (
                  <button
                    key={status.value}
                    onClick={() => setSelectedStatus(status.value)}
                    className={`flex-shrink-0 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm border transition-all active:scale-95 touch-manipulation whitespace-nowrap ${
                      selectedStatus === status.value
                        ? 'bg-primary border-primary text-white'
                        : 'bg-secondary/60 border-white/10 text-white/70 hover:text-white hover:border-primary/20'
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

      {/* Orders List */}
      <div className="px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-sm sm:text-lg font-bold text-white">
            Items <span className="text-white/60">({filteredItems.length})</span>
          </h2>
          {filteredItems.length === 0 && allItems.length > 0 && (
            <button
              onClick={clearFilters}
              className="px-2.5 sm:px-3 py-1 rounded-lg bg-primary/10 border border-primary text-primary text-[10px] sm:text-xs hover:bg-primary/20 active:scale-95 transition-all touch-manipulation"
            >
              Clear Filters
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2.5 sm:space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-white/20 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-xl font-bold text-white mb-1 sm:mb-2">No items found</h3>
            <p className="text-xs sm:text-sm text-white/60 mb-4 sm:mb-6 text-center px-4">
              {!allItems || allItems.length === 0
                ? 'No orders or reservations yet.'
                : 'Try adjusting your search terms or filters.'}
            </p>
            {allItems.length > 0 && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 active:scale-95 transition-all text-xs sm:text-sm touch-manipulation"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-2.5 sm:space-y-4">
              {paginatedItems.map((item) => (
                <div
                  key={item._id}
                  className="bg-secondary/40 backdrop-blur-sm border border-white/10 rounded-lg sm:rounded-xl transition-all duration-200 hover:border-primary/30"
                >
                  <div className="flex items-center justify-between p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
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
                            <span className="capitalize hidden xs:inline">{item.status.replace('_', ' ')}</span>
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

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-white text-sm sm:text-base">{formatCurrency(item.totalAmount || 0)}</p>
                        <p className="text-xs text-white/60 hidden sm:block">Total</p>
                      </div>

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

                    {item.type === 'reservation' && item.guestInfo?.pickupSchedule && (
                      <div className="flex items-center gap-2 sm:gap-3 mt-2 p-2 sm:p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400 shrink-0" />
                        <span className="text-xs sm:text-sm text-white/80 truncate">
                          <span className="hidden sm:inline">Pickup: </span>
                          {item.guestInfo.pickupSchedule.date} at {item.guestInfo.pickupSchedule.time}
                        </span>
                      </div>
                    )}

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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 sm:mt-8 flex items-center justify-center gap-3 sm:gap-4">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`p-2 sm:p-2.5 rounded-lg border transition-all touch-manipulation ${
                    currentPage === 1
                      ? 'bg-secondary/40 border-white/10 text-white/40 cursor-not-allowed'
                      : 'bg-secondary border-white/10 text-white hover:bg-white/10 active:scale-95'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                <div className="flex items-center">
                  <span className="text-xs sm:text-sm text-white/80 font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`p-2 sm:p-2.5 rounded-lg border transition-all touch-manipulation ${
                    currentPage === totalPages
                      ? 'bg-secondary/40 border-white/10 text-white/40 cursor-not-allowed'
                      : 'bg-secondary border-white/10 text-white hover:bg-white/10 active:scale-95'
                  }`}
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavbar />

      {/* Portal-based Dropdown */}
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
            <div className="p-2 max-h-96 overflow-y-auto scrollbar-hide">
              <button
                onClick={() => {
                  if (item.type === 'reservation') {
                    router.push(`/admin/reservation-detail?id=${item._id}`);
                  } else {
                    router.push(`/admin/orders/${item._id}`);
                  }
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

      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        @media (min-width: 480px) {
          .xs\\:inline {
            display: inline;
          }
          .xs\\:block {
            display: block;
          }
        }
      `}</style>
    </div>
  );
}
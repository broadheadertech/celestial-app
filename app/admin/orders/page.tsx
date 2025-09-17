'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  Filter,
  Eye,
  Package,
  ShoppingBag,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Calendar,
  User,
  Bell,
  ChevronDown,
  Settings,
  Download,
  RefreshCw,
  Mail,
  Phone,
  AlertCircle
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import Button from '@/components/ui/Button';
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
    product?: any; // Using any to avoid complex typing for now
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
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch real data from Convex
  const ordersQuery = useQuery(api.services.orders.getAllOrdersAdmin, {});
  const reservationsQuery = useQuery(api.services.reservations.getAllReservationsAdmin, {});

  // Mutations for updating status
  const updateOrderStatus = useMutation(api.services.orders.updateOrderStatus);
  const updateReservationStatus = useMutation(api.services.reservations.updateReservationStatus);

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
    const expired = allItems.filter(item =>
      item.status === 'expired' || item.status === 'cancelled'
    ).length;

    return {
      total: allItems.length,
      orders: orders.length,
      reservations: reservations.length,
      pending,
      confirmed,
      completed,
      expired
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

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(item => item.type === selectedType);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(item => item.status === selectedStatus);
    }

    return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [searchQuery, selectedType, selectedStatus, allItems]);

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
          status: newStatus as 'pending' | 'confirmed' | 'completed' | 'expired' | 'cancelled'
        });
      }

      setSelectedItem(null);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // The queries will automatically refetch
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'processing': return <Package className="w-4 h-4" />;
      case 'shipped': return <Truck className="w-4 h-4" />;
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
      processing: 'bg-info/20 text-info border-info/30',
      shipped: 'bg-info/20 text-info border-info/30',
      delivered: 'bg-success/20 text-success border-success/30',
      completed: 'bg-success/20 text-success border-success/30',
      expired: 'bg-error/20 text-error border-error/30',
      cancelled: 'bg-error/20 text-error border-error/30',
    };

    return colors[status as keyof typeof colors] || 'bg-muted/20 text-muted border-muted/30';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Modern Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-white/10">
        <div className="px-4 sm:px-6 py-4">
          {/* Top Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2.5 rounded-xl bg-secondary/60 border border-white/10 hover:bg-secondary/80 transition-all"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">Management Center</h1>
                <p className="text-sm text-white/60">Orders & Reservations</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="border border-white/10 hover:border-primary/30"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="border border-white/10 hover:border-primary/30"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Search and Filter Row */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search by order ID, customer name, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-secondary/60 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 transition-all"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 ${
                showFilters
                  ? 'bg-primary border-primary text-white'
                  : 'bg-secondary/60 border-white/10 text-white hover:bg-secondary/80'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modern Stats Bar */}
      <div className="px-4 sm:px-6 py-4 border-b border-white/5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span className="text-2xl font-bold text-yellow-400">{orderStats.pending}</span>
            </div>
            <p className="text-xs text-white/60 font-medium">Pending Review</p>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-2xl font-bold text-green-400">{orderStats.confirmed}</span>
            </div>
            <p className="text-xs text-white/60 font-medium">Confirmed</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Package className="w-4 h-4 text-blue-400" />
              <span className="text-2xl font-bold text-blue-400">{orderStats.completed}</span>
            </div>
            <p className="text-xs text-white/60 font-medium">Completed</p>
          </div>
          <div className="bg-gradient-to-br from-red-500/10 to-pink-500/10 border border-red-500/20 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-400" />
              <span className="text-2xl font-bold text-red-400">{orderStats.expired}</span>
            </div>
            <p className="text-xs text-white/60 font-medium">Issues</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-white/60">
            Showing <span className="text-white font-medium">{filteredItems.length}</span> of{' '}
            <span className="text-white font-medium">{allItems.length}</span> items
          </p>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Live updates</span>
          </div>
        </div>
      </div>

      {/* Modern Filters */}
      {showFilters && (
        <div className="bg-secondary/40 backdrop-blur-sm border-b border-white/10 px-4 sm:px-6 py-4 animate-in slide-in-from-top duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-white mb-3">
                <Package className="w-4 h-4 text-primary" />
                Type Filter
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'All Items', icon: Settings },
                  { value: 'order', label: 'Orders', icon: ShoppingBag },
                  { value: 'reservation', label: 'Reservations', icon: Calendar },
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm border transition-all font-medium ${
                      selectedType === type.value
                        ? 'bg-gradient-to-r from-primary to-primary/80 border-primary text-white shadow-lg scale-95'
                        : 'border-white/10 text-white/70 hover:text-white hover:border-primary/30 hover:bg-primary/10'
                    }`}
                  >
                    <type.icon className="w-4 h-4" />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-white mb-3">
                <AlertCircle className="w-4 h-4 text-primary" />
                Status Filter
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'All Status', color: 'text-white/70' },
                  { value: 'pending', label: 'Pending', color: 'text-yellow-400' },
                  { value: 'confirmed', label: 'Confirmed', color: 'text-green-400' },
                  { value: 'processing', label: 'Processing', color: 'text-blue-400' },
                  { value: 'completed', label: 'Completed', color: 'text-emerald-400' },
                  { value: 'expired', label: 'Issues', color: 'text-red-400' },
                ].map((status) => (
                  <button
                    key={status.value}
                    onClick={() => setSelectedStatus(status.value)}
                    className={`px-4 py-2.5 rounded-lg text-sm border transition-all font-medium ${
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

      {/* Modern Orders List */}
      <div className="px-4 sm:px-6 py-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-info/20 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No items found</h3>
            <p className="text-white/60 mb-6 max-w-sm mx-auto">
              No orders or reservations match your current filters. Try adjusting your search criteria.
            </p>
            <Button
              onClick={() => {
                setSearchQuery('');
                setSelectedStatus('all');
                setSelectedType('all');
              }}
              variant="outline"
              className="border-primary/30 text-primary hover:bg-primary/10"
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div
                key={item._id}
                className="bg-secondary/40 backdrop-blur-sm border border-white/10 rounded-xl hover:border-primary/30 transition-all duration-200 overflow-hidden"
              >
                {/* Compact Header */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    {/* Type Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      item.type === 'order'
                        ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30'
                        : 'bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30'
                    }`}>
                      {item.type === 'order' ? (
                        <ShoppingBag className="w-5 h-5 text-blue-400" />
                      ) : (
                        <Calendar className="w-5 h-5 text-purple-400" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white text-sm">{item.code}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border font-medium ${getStatusBadge(item.status)}`}>
                          {getStatusIcon(item.status)}
                          <span className="capitalize">{item.status}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/60">
                        <span>{formatDateTime(item.createdAt)}</span>
                        <span>•</span>
                        <span>
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

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-white">{formatCurrency(item.totalAmount || 0)}</p>
                      <p className="text-xs text-white/60">Total</p>
                    </div>

                    {/* Modern Action Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setSelectedItem(selectedItem === item._id ? null : item._id)}
                        className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/30 transition-all flex items-center justify-center"
                      >
                        <ChevronDown className={`w-4 h-4 text-white/70 transition-transform ${selectedItem === item._id ? 'rotate-180' : ''}`} />
                      </button>

                      {selectedItem === item._id && (
                        <div className="absolute right-0 top-10 w-52 bg-secondary/90 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl z-20 overflow-hidden">
                          <div className="p-2">
                            <button
                              onClick={() => router.push(`/admin/${item.type}s/${item._id}`)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4 text-blue-400" />
                              <span>View Details</span>
                            </button>

                            {item.status === 'pending' && (
                              <button
                                onClick={() => handleUpdateStatus(item._id, 'confirmed')}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-white hover:bg-green-500/10 rounded-lg transition-colors"
                              >
                                <CheckCircle className="w-4 h-4 text-green-400" />
                                <span>Confirm {item.type}</span>
                              </button>
                            )}

                            {item.status === 'confirmed' && item.type === 'order' && (
                              <button
                                onClick={() => handleUpdateStatus(item._id, 'processing')}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-white hover:bg-blue-500/10 rounded-lg transition-colors"
                              >
                                <Package className="w-4 h-4 text-blue-400" />
                                <span>Start Processing</span>
                              </button>
                            )}

                            {item.status === 'confirmed' && item.type === 'reservation' && (
                              <button
                                onClick={() => handleUpdateStatus(item._id, 'completed')}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-white hover:bg-green-500/10 rounded-lg transition-colors"
                              >
                                <CheckCircle className="w-4 h-4 text-green-400" />
                                <span>Mark Picked Up</span>
                              </button>
                            )}

                            {item.status === 'processing' && (
                              <button
                                onClick={() => handleUpdateStatus(item._id, 'completed')}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-white hover:bg-green-500/10 rounded-lg transition-colors"
                              >
                                <Truck className="w-4 h-4 text-green-400" />
                                <span>Mark Delivered</span>
                              </button>
                            )}

                            <div className="h-px bg-white/10 my-2" />

                            {['pending', 'confirmed'].includes(item.status) && (
                              <button
                                onClick={() => handleUpdateStatus(item._id, 'cancelled')}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                                <span>Cancel {item.type}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Customer Info - Compact */}
                <div className="px-4 pb-4">
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">
                        {item.customer?.name || 'Guest Customer'}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-white/60">
                        {item.customer?.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{item.customer.email}</span>
                          </div>
                        )}
                        {item.customer?.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <span>{item.customer.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Special info for reservations */}
                  {item.type === 'reservation' && item.guestInfo?.pickupSchedule && (
                    <div className="flex items-center gap-3 mt-2 p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                      <Calendar className="w-4 h-4 text-purple-400" />
                      <span className="text-xs text-white/80">
                        Pickup: {item.guestInfo.pickupSchedule.date} at {item.guestInfo.pickupSchedule.time}
                      </span>
                    </div>
                  )}

                  {/* Notes if present */}
                  {item.notes && (
                    <div className="mt-2 p-2 bg-white/5 border border-white/5 rounded-lg">
                      <p className="text-xs text-white/60 mb-1">Notes:</p>
                      <p className="text-xs text-white/80">{item.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-white/10">
        <div className="grid grid-cols-4 py-2">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
          >
            <BarChart3 className="w-5 h-5 mb-1" />
            <span className="text-xs">Dashboard</span>
          </button>
          <button
            onClick={() => router.push('/admin/products')}
            className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
          >
            <Package className="w-5 h-5 mb-1" />
            <span className="text-xs">Products</span>
          </button>
          <button className="flex flex-col items-center py-2 px-3 text-primary">
            <ShoppingBag className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Orders</span>
          </button>
          <button
            onClick={() => router.push('/admin/settings')}
            className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
          >
            <Bell className="w-5 h-5 mb-1" />
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </div>

      {/* Bottom padding */}
      <div className="h-16" />

      {/* Click outside to close menu */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
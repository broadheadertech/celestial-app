'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Package,
  ShoppingBag,
  Users,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Calendar,
  User,
  MapPin,
  Bell
} from 'lucide-react';
import { formatCurrency, formatDateTime, getRelativeTime, getOrderStatusColor } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Order, Reservation } from '@/types';

// Mock orders data
const mockOrders: Order[] = [
  {
    _id: '1',
    userId: 'user1',
    status: 'pending',
    items: [
      { productId: '1', quantity: 2, price: 250 },
      { productId: '2', quantity: 1, price: 480 },
    ],
    totalAmount: 980,
    shippingAddress: {
      street: '123 Main St',
      city: 'Manila',
      state: 'Metro Manila',
      zipCode: '1000',
      country: 'Philippines',
    },
    paymentMethod: 'Cash on Delivery',
    notes: 'Please call before delivery',
    createdAt: Date.now() - 3600000, // 1 hour ago
    updatedAt: Date.now() - 1800000, // 30 minutes ago
  },
  {
    _id: '2',
    userId: 'user2',
    status: 'confirmed',
    items: [
      { productId: '3', quantity: 1, price: 1200 },
    ],
    totalAmount: 1200,
    shippingAddress: {
      street: '456 Oak Ave',
      city: 'Quezon City',
      state: 'Metro Manila',
      zipCode: '1100',
      country: 'Philippines',
    },
    paymentMethod: 'GCash',
    createdAt: Date.now() - 7200000, // 2 hours ago
    updatedAt: Date.now() - 3600000, // 1 hour ago
  },
];

// Mock reservations data (treating as orders for admin view)
const mockReservations: Reservation[] = [
  {
    _id: '3',
    reservationCode: 'RES-ABC123',
    userId: 'user1',
    items: [
      { productId: '1', quantity: 2, reservedPrice: 250 },
    ],
    totalAmount: 500,
    totalQuantity: 2,
    reservationDate: Date.now() - 86400000, // 1 day ago
    expiryDate: Date.now() + 86400000, // 1 day from now
    status: 'confirmed',
    notes: 'Customer will pick up tomorrow',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 3600000,
  },
  {
    _id: '4',
    reservationCode: 'RES-DEF456',
    guestId: 'guest1',
    guestInfo: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+63 912 345 6789',
      completeAddress: '789 Pine St, Manila',
      pickupSchedule: {
        date: '2024-01-25',
        time: '14:00',
      },
    },
    items: [
      { productId: '2', quantity: 1, reservedPrice: 480 },
    ],
    totalAmount: 480,
    totalQuantity: 1,
    reservationDate: Date.now() - 172800000, // 2 days ago
    expiryDate: Date.now() - 86400000, // expired
    status: 'expired',
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 172800000,
  },
];

// Mock customer data
const mockCustomers: Record<string, { name: string; email: string; phone?: string }> = {
  'user1': { name: 'John Doe', email: 'john@example.com', phone: '+63 912 345 6789' },
  'user2': { name: 'Jane Smith', email: 'jane@example.com', phone: '+63 917 234 5678' },
};

export default function AdminOrdersPage() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all'); // all, orders, reservations
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // Combine and transform data for unified display
  const allItems = useMemo(() => {
    const orders = mockOrders.map(order => ({
      ...order,
      type: 'order' as const,
      code: `ORD-${order._id.padStart(6, '0').toUpperCase()}`,
      customer: mockCustomers[order.userId],
    }));

    const reservations = mockReservations.map(reservation => ({
      ...reservation,
      type: 'reservation' as const,
      code: reservation.reservationCode || `RES-${reservation._id}`,
      customer: reservation.guestInfo
        ? { name: reservation.guestInfo.name, email: reservation.guestInfo.email, phone: reservation.guestInfo.phone }
        : mockCustomers[reservation.userId!],
    }));

    return [...orders, ...reservations];
  }, []);

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

  const handleUpdateStatus = (itemId: string, newStatus: string) => {
    // TODO: Implement API call to update status
    console.log('Update status for item:', itemId, 'to', newStatus);
    setSelectedItem(null);
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
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-white">Orders & Reservations</h1>
              <p className="text-sm text-muted">{filteredItems.length} items</p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-secondary border border-white/10 rounded-xl text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 rounded-xl bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
            >
              <Filter className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-6 py-4 border-b border-white/10">
        <div className="grid grid-cols-4 gap-3">
          <Card padding="sm" className="text-center">
            <p className="text-lg font-bold text-warning">{orderStats.pending}</p>
            <p className="text-xs text-muted">Pending</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-lg font-bold text-success">{orderStats.confirmed}</p>
            <p className="text-xs text-muted">Confirmed</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-lg font-bold text-info">{orderStats.completed}</p>
            <p className="text-xs text-muted">Completed</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-lg font-bold text-error">{orderStats.expired}</p>
            <p className="text-xs text-muted">Expired</p>
          </Card>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-secondary border-b border-white/10 px-6 py-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Type</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'order', label: 'Orders' },
                  { value: 'reservation', label: 'Reservations' },
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      selectedType === type.value
                        ? 'bg-primary border-primary text-white'
                        : 'border-white/10 text-muted hover:text-white hover:border-white/20'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Status</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'confirmed', label: 'Confirmed' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'expired', label: 'Expired' },
                ].map((status) => (
                  <button
                    key={status.value}
                    onClick={() => setSelectedStatus(status.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      selectedStatus === status.value
                        ? 'bg-primary border-primary text-white'
                        : 'border-white/10 text-muted hover:text-white hover:border-white/20'
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
      <div className="px-6 py-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-16 h-16 text-muted mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No orders found</h3>
            <p className="text-muted mb-6">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <Card key={item._id} className="relative">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-white">{item.code}</h3>
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs border ${getStatusBadge(item.status)}`}>
                        {getStatusIcon(item.status)}
                        <span className="capitalize">{item.status}</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        item.type === 'order'
                          ? 'bg-primary/20 text-primary border border-primary/30'
                          : 'bg-info/20 text-info border border-info/30'
                      }`}>
                        {item.type}
                      </span>
                    </div>
                    <p className="text-sm text-muted">
                      {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="font-bold text-white">{formatCurrency(item.totalAmount!)}</p>
                      <p className="text-sm text-muted">
                        {item.type === 'order'
                          ? `${(item as any).items.length} items`
                          : `${item.totalQuantity} items`
                        }
                      </p>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setSelectedItem(selectedItem === item._id ? null : item._id)}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-muted" />
                      </button>

                      {selectedItem === item._id && (
                        <div className="absolute right-0 top-8 w-48 bg-secondary border border-white/10 rounded-lg shadow-xl z-10">
                          <div className="py-1">
                            <button
                              onClick={() => router.push(`/admin/${item.type}s/${item._id}`)}
                              className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                            >
                              <Eye className="w-4 h-4" />
                              <span>View Details</span>
                            </button>
                            {item.status === 'pending' && (
                              <button
                                onClick={() => handleUpdateStatus(item._id, 'confirmed')}
                                className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                              >
                                <CheckCircle className="w-4 h-4" />
                                <span>Confirm</span>
                              </button>
                            )}
                            {item.status === 'confirmed' && item.type === 'order' && (
                              <button
                                onClick={() => handleUpdateStatus(item._id, 'processing')}
                                className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                              >
                                <Package className="w-4 h-4" />
                                <span>Mark Processing</span>
                              </button>
                            )}
                            {(item.status === 'pending' || item.status === 'confirmed') && (
                              <button
                                onClick={() => handleUpdateStatus(item._id, 'cancelled')}
                                className="w-full px-4 py-2 text-left text-error hover:bg-error/10 flex items-center space-x-2"
                              >
                                <XCircle className="w-4 h-4" />
                                <span>Cancel</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-center space-x-3">
                    <User className="w-4 h-4 text-muted" />
                    <div>
                      <p className="text-white font-medium">{item.customer?.name || 'Unknown Customer'}</p>
                      <p className="text-sm text-muted">{item.customer?.email}</p>
                      {item.customer?.phone && (
                        <p className="text-sm text-muted">{item.customer.phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Address or Pickup Info */}
                  {item.type === 'order' && (item as any).shippingAddress && (
                    <div className="flex items-start space-x-3 mt-3">
                      <MapPin className="w-4 h-4 text-muted mt-0.5" />
                      <div>
                        <p className="text-sm text-white">
                          {(item as any).shippingAddress.street}, {(item as any).shippingAddress.city}
                        </p>
                        <p className="text-sm text-muted">
                          {(item as any).shippingAddress.state} {(item as any).shippingAddress.zipCode}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Reservation pickup info */}
                  {item.type === 'reservation' && (item as any).guestInfo?.pickupSchedule && (
                    <div className="flex items-center space-x-3 mt-3">
                      <Calendar className="w-4 h-4 text-muted" />
                      <div>
                        <p className="text-sm text-white">
                          Pickup: {(item as any).guestInfo.pickupSchedule.date} at {(item as any).guestInfo.pickupSchedule.time}
                        </p>
                        {(item as any).guestInfo.completeAddress && (
                          <p className="text-sm text-muted">{(item as any).guestInfo.completeAddress}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Items Preview */}
                <div className="p-4">
                  <p className="text-sm text-muted mb-2">
                    {item.type === 'order' ? 'Order Items' : 'Reserved Items'}
                  </p>
                  <div className="space-y-1">
                    {(item.type === 'order'
                      ? (item as any).items
                      : (item as any).items || [{ productId: (item as any).productId, quantity: (item as any).quantity, price: (item as any).totalAmount }]
                    ).slice(0, 2).map((orderItem: any, index: number) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-white">Product #{orderItem.productId}</span>
                        <span className="text-muted">
                          {orderItem.quantity}x {formatCurrency(orderItem.price || orderItem.reservedPrice)}
                        </span>
                      </div>
                    ))}
                    {((item.type === 'order' ? (item as any).items : (item as any).items) || []).length > 2 && (
                      <p className="text-sm text-muted">
                        +{((item.type === 'order' ? (item as any).items : (item as any).items) || []).length - 2} more items
                      </p>
                    )}
                  </div>

                  {/* Notes */}
                  {item.notes && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-sm text-muted mb-1">Notes:</p>
                      <p className="text-sm text-white">{item.notes}</p>
                    </div>
                  )}
                </div>
              </Card>
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
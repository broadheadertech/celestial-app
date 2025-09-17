'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  MapPin,
  User,
  Search,
  ShoppingCart,
  Filter,
  Eye,
  Phone,
  Mail,
  FileText,
  Hash,
  Truck
} from 'lucide-react';
import { useAuthStore, useIsAuthenticated, useIsGuest } from '@/store/auth';
import { formatCurrency, formatDateTime, getRelativeTime } from '@/lib/utils';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Reservation } from '@/types';

export default function ReservationsPage() {
  const router = useRouter();
  const { user, guestId } = useAuthStore();
  const isAuthenticated = useIsAuthenticated();
  const isGuest = useIsGuest();

  // Fetch real reservations data from Convex
  const reservationsQuery = useQuery(api.services.reservations.getReservations,
    isAuthenticated && user ? { userId: user._id } :
    isGuest && guestId ? { guestId: guestId } : "skip"
  ) || [];

  // Redirect admins to admin dashboard
  if (isAuthenticated && user?.role === 'admin') {
    router.push('/admin/dashboard');
    return null;
  }

  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Filter reservations based on user authentication and selected filter
  const filteredReservations = useMemo(() => {
    return reservationsQuery.filter(reservation => {
      // If user is authenticated, show their reservations
      if (isAuthenticated && user) {
        if (reservation.userId !== user._id) return false;
      } else if (isGuest && guestId) {
        // For guests, show reservations matching their guest ID
        if (reservation.guestId !== guestId) return false;
      } else {
        // If neither authenticated nor guest, don't show any reservations
        return false;
      }

      // Apply status filter
      if (selectedFilter !== 'all' && reservation.status !== selectedFilter) {
        return false;
      }

      return true;
    });
  }, [reservationsQuery, isAuthenticated, user, isGuest, guestId, selectedFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-warning';
      case 'confirmed': return 'text-success';
      case 'completed': return 'text-info';
      case 'expired': return 'text-error';
      case 'cancelled': return 'text-error';
      default: return 'text-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'completed': return <Package className="w-4 h-4" />;
      case 'expired': return <XCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-warning/20 text-warning border-warning/30',
      confirmed: 'bg-success/20 text-success border-success/30',
      completed: 'bg-info/20 text-info border-info/30',
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
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-white">My Reservations</h1>
              <p className="text-sm text-muted">
                {filteredReservations.length} reservations found
              </p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
            >
              <Filter className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-secondary border-b border-white/10 px-6 py-4">
          <div className="space-y-3">
            <p className="text-sm font-medium text-white">Filter by Status</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All' },
                { value: 'pending', label: 'Pending' },
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'completed', label: 'Completed' },
                { value: 'expired', label: 'Expired' },
                { value: 'cancelled', label: 'Cancelled' },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setSelectedFilter(filter.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    selectedFilter === filter.value
                      ? 'bg-primary border-primary text-white'
                      : 'border-white/10 text-muted hover:text-white hover:border-white/20'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-6 py-6">
        {!isAuthenticated && (
          <Card variant="glass" className="mb-6 bg-info/10 border-info/20">
            <div className="text-center">
              <h3 className="font-semibold text-white mb-2">Sign in to track all reservations</h3>
              <p className="text-sm text-muted mb-4">
                Create an account to easily manage and track all your reservations
              </p>
              <Button
                onClick={() => router.push('/auth/login')}
                size="sm"
              >
                Sign In
              </Button>
            </div>
          </Card>
        )}

        {filteredReservations.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-muted mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No reservations found</h3>
            <p className="text-muted mb-6">
              {selectedFilter === 'all'
                ? 'You haven\'t made any reservations yet'
                : `No ${selectedFilter} reservations found`
              }
            </p>
            <Button onClick={() => router.push('/client/search')}>
              Start Shopping
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredReservations.map((reservation) => (
              <Card key={reservation._id} className="overflow-hidden bg-secondary/30 border-white/5">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary/10 to-orange-500/10 p-4 border-b border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/20 rounded-lg">
                        <Hash className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg">{reservation.reservationCode}</h3>
                        <p className="text-sm text-white/70">
                          Reserved on {formatDateTime(reservation.createdAt)}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(reservation.status)}`}>
                      {getStatusIcon(reservation.status)}
                      <span className="capitalize">{reservation.status}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <p className="text-white/60 mb-1">Total Amount</p>
                      <p className="font-bold text-white text-lg">{formatCurrency(reservation.totalAmount!)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white/60 mb-1">Items</p>
                      <p className="font-bold text-white text-lg">{reservation.totalQuantity}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white/60 mb-1">Expires</p>
                      <p className={`font-medium text-sm ${reservation.expiryDate < Date.now() ? 'text-error' : 'text-success'}`}>
                        {getRelativeTime(reservation.expiryDate)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Customer Information */}
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-center space-x-2 mb-3">
                    <User className="w-4 h-4 text-primary" />
                    <h4 className="font-semibold text-white">Customer Information</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-white/60 mb-1">Name</p>
                      <p className="text-white font-medium">
                        {reservation.guestInfo?.name ||
                         (isAuthenticated && user ? `${user.firstName} ${user.lastName}` : 'Unknown')}
                      </p>
                    </div>
                    {reservation.guestInfo?.email && (
                      <div>
                        <p className="text-white/60 mb-1">Email</p>
                        <div className="flex items-center space-x-1">
                          <Mail className="w-3 h-3 text-white/60" />
                          <p className="text-white font-medium">{reservation.guestInfo.email}</p>
                        </div>
                      </div>
                    )}
                    {reservation.guestInfo?.phone && (
                      <div>
                        <p className="text-white/60 mb-1">Phone</p>
                        <div className="flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-white/60" />
                          <p className="text-white font-medium">{reservation.guestInfo.phone}</p>
                        </div>
                      </div>
                    )}
                    {reservation.guestInfo?.completeAddress && (
                      <div>
                        <p className="text-white/60 mb-1">Address</p>
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-white/60" />
                          <p className="text-white font-medium">{reservation.guestInfo.completeAddress}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {reservation.guestInfo?.pickupSchedule && (
                    <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
                      <div className="flex items-center space-x-2 mb-2">
                        <Truck className="w-4 h-4 text-primary" />
                        <h5 className="font-medium text-white">Pickup Schedule</h5>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-3 h-3 text-white/60" />
                          <span className="text-white">{reservation.guestInfo.pickupSchedule.date}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-3 h-3 text-white/60" />
                          <span className="text-white">{reservation.guestInfo.pickupSchedule.time}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Items List */}
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Package className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold text-white">Reserved Items</h4>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-primary hover:bg-primary/10"
                      onClick={() => {
                        // TODO: Show detailed items view
                      }}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View All ({reservation.items?.length || 0})
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {reservation.items?.slice(0, 3).map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm">
                            {item.product?.name || 'Unknown Product'}
                          </p>
                          <p className="text-white/60 text-xs">
                            Quantity: {item.quantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium text-sm">
                            {formatCurrency(item.reservedPrice)}
                          </p>
                          <p className="text-white/60 text-xs">
                            Total: {formatCurrency(item.reservedPrice * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}

                    {reservation.items && reservation.items.length > 3 && (
                      <div className="text-center p-2">
                        <p className="text-white/60 text-sm">
                          +{reservation.items.length - 3} more items
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {reservation.notes && (
                  <div className="p-4 border-b border-white/10">
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold text-white">Notes</h4>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-white/80 text-sm">{reservation.notes}</p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="flex items-center justify-center space-x-2"
                      onClick={() => {
                        // TODO: Show detailed reservation view
                      }}
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Details</span>
                    </Button>

                    {reservation.status === 'pending' && (
                      <Button
                        variant="outline"
                        className="flex items-center justify-center space-x-2 text-error border-error hover:bg-error/10"
                        onClick={() => {
                          // TODO: Implement cancel reservation
                        }}
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Cancel</span>
                      </Button>
                    )}

                    {reservation.status === 'confirmed' && (
                      <Button
                        className="flex items-center justify-center space-x-2 bg-success hover:bg-success/90"
                        onClick={() => {
                          // TODO: Navigate to store/pickup instructions
                        }}
                      >
                        <MapPin className="w-4 h-4" />
                        <span>Pickup Info</span>
                      </Button>
                    )}
                  </div>
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
            onClick={() => router.push('/client/dashboard')}
            className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
          >
            <div className="w-5 h-5 mb-1 bg-muted rounded"></div>
            <span className="text-xs">Home</span>
          </button>
          <button
            onClick={() => router.push('/client/search')}
            className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
          >
            <Search className="w-5 h-5 mb-1" />
            <span className="text-xs">Search</span>
          </button>
          <button
            onClick={() => router.push('/client/cart')}
            className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
          >
            <ShoppingCart className="w-5 h-5 mb-1" />
            <span className="text-xs">Cart</span>
          </button>
          <button
            onClick={() => router.push('/client/profile')}
            className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
          >
            <User className="w-5 h-5 mb-1" />
            <span className="text-xs">Profile</span>
          </button>
        </div>
      </div>

      {/* Bottom padding */}
      <div className="h-16" />
    </div>
  );
}
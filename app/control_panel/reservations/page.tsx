'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  ChevronLeft,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Phone,
  Mail,
  MapPin,
  Package,
  Eye,
  Edit,
  MoreVertical,
  Download,
  RefreshCw,
  Plus,
  CalendarDays,
  Timer,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import ControlPanelNav from '@/components/ControlPanelNav';
import Button from '@/components/ui/Button';

// Mock reservation data
const mockReservations = [
  {
    _id: '1',
    reservationCode: 'RES-001',
    customerName: 'John Smith',
    customerEmail: 'john.smith@email.com',
    customerPhone: '+63 912 345 6789',
    items: [
      { name: 'Premium Goldfish', quantity: 2, price: 250 },
      { name: '75L Glass Tank', quantity: 1, price: 1200 },
    ],
    totalAmount: 1700,
    status: 'pending',
    pickupDate: '2024-01-15',
    pickupTime: '14:00',
    createdAt: Date.now() - 86400000,
    notes: 'Customer prefers morning pickup if possible',
    address: '123 Main St, Quezon City, Metro Manila',
  },
  {
    _id: '2',
    reservationCode: 'RES-002',
    customerName: 'Maria Garcia',
    customerEmail: 'maria.garcia@email.com',
    customerPhone: '+63 917 234 5678',
    items: [
      { name: 'Betta Fish - Blue', quantity: 3, price: 180 },
      { name: 'LED Lighting Kit', quantity: 1, price: 250 },
    ],
    totalAmount: 790,
    status: 'confirmed',
    pickupDate: '2024-01-16',
    pickupTime: '10:00',
    createdAt: Date.now() - 172800000,
    notes: '',
    address: '456 Oak Ave, Makati City, Metro Manila',
  },
  {
    _id: '3',
    reservationCode: 'RES-003',
    customerName: 'Robert Johnson',
    customerEmail: 'robert.j@email.com',
    customerPhone: '+63 918 345 6789',
    items: [
      { name: 'Aquarium Filter System Pro', quantity: 1, price: 350 },
      { name: 'Premium Fish Food', quantity: 2, price: 45 },
    ],
    totalAmount: 440,
    status: 'completed',
    pickupDate: '2024-01-14',
    pickupTime: '16:00',
    createdAt: Date.now() - 259200000,
    notes: 'Customer was very satisfied with the service',
    address: '789 Pine St, Taguig City, Metro Manila',
  },
  {
    _id: '4',
    reservationCode: 'RES-004',
    customerName: 'Sarah Wilson',
    customerEmail: 'sarah.wilson@email.com',
    customerPhone: '+63 919 456 7890',
    items: [
      { name: 'Live Aquatic Plants', quantity: 5, price: 200 },
      { name: 'Ceramic Tank Decor', quantity: 3, price: 150 },
    ],
    totalAmount: 1450,
    status: 'cancelled',
    pickupDate: '2024-01-13',
    pickupTime: '11:00',
    createdAt: Date.now() - 345600000,
    notes: 'Customer cancelled due to change of plans',
    address: '321 Elm St, Pasig City, Metro Manila',
  },
  {
    _id: '5',
    reservationCode: 'RES-005',
    customerName: 'Michael Brown',
    customerEmail: 'michael.brown@email.com',
    customerPhone: '+63 920 567 8901',
    items: [
      { name: 'Neon Tetras (6-pack)', quantity: 2, price: 80 },
      { name: '75L Glass Tank', quantity: 1, price: 1200 },
      { name: 'LED Lighting Kit', quantity: 1, price: 250 },
    ],
    totalAmount: 1610,
    status: 'pending',
    pickupDate: '2024-01-17',
    pickupTime: '15:30',
    createdAt: Date.now() - 432000000,
    notes: 'First-time customer, needs guidance on setup',
    address: '654 Maple Dr, Mandaluyong City, Metro Manila',
  },
];

const getStatusInfo = (status: string) => {
  switch (status) {
    case 'pending':
      return {
        label: 'Pending',
        color: 'bg-warning/10 text-warning border-warning/30',
        icon: Clock,
      };
    case 'confirmed':
      return {
        label: 'Confirmed',
        color: 'bg-info/10 text-info border-info/30',
        icon: CheckCircle,
      };
    case 'completed':
      return {
        label: 'Completed',
        color: 'bg-success/10 text-success border-success/30',
        icon: CheckCircle2,
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        color: 'bg-error/10 text-error border-error/30',
        icon: XCircle,
      };
    default:
      return {
        label: 'Unknown',
        color: 'bg-white/10 text-white/60 border-white/20',
        icon: AlertTriangle,
      };
  }
};

const formatCurrency = (amount: number) => {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatTime = (timeString: string) => {
  return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export default function ReservationsPage() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDate, setSelectedDate] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<string | null>(null);
  const [updatingReservation, setUpdatingReservation] = useState<string | null>(null);

  // Filter reservations
  const filteredReservations = useMemo(() => {
    let filtered = reservationsData;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(reservation => 
        reservation.reservationCode.toLowerCase().includes(query) ||
        reservation.customerName.toLowerCase().includes(query) ||
        reservation.customerEmail.toLowerCase().includes(query) ||
        reservation.customerPhone.includes(query) ||
        reservation.items.some(item => item.name.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(reservation => reservation.status === selectedStatus);
    }

    // Apply date filter
    if (selectedDate !== 'all') {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      filtered = filtered.filter(reservation => {
        const pickupDate = new Date(reservation.pickupDate);
        switch (selectedDate) {
          case 'today':
            return pickupDate.toDateString() === today.toDateString();
          case 'tomorrow':
            return pickupDate.toDateString() === tomorrow.toDateString();
          case 'this_week':
            return pickupDate >= today && pickupDate <= nextWeek;
          case 'overdue':
            return pickupDate < today && reservation.status !== 'completed' && reservation.status !== 'cancelled';
          default:
            return true;
        }
      });
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [searchQuery, selectedStatus, selectedDate]);

  // Calculate reservation stats
  const reservationStats = useMemo(() => {
    const total = reservationsData.length;
    const pending = reservationsData.filter(r => r.status === 'pending').length;
    const confirmed = reservationsData.filter(r => r.status === 'confirmed').length;
    const completed = reservationsData.filter(r => r.status === 'completed').length;
    const cancelled = reservationsData.filter(r => r.status === 'cancelled').length;
    const totalRevenue = reservationsData
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    const pendingRevenue = reservationsData
      .filter(r => r.status === 'pending' || r.status === 'confirmed')
      .reduce((sum, r) => sum + (r.totalAmount || 0), 0);

    return {
      total,
      pending,
      confirmed,
      completed,
      cancelled,
      totalRevenue,
      pendingRevenue,
    };
  }, []);

  // Convex mutations
  const updateReservationStatus = useMutation(api.services.reservations.updateReservationStatus);

  // Fetch real reservation data (with fallback to mock data for development)
  const realReservations = useQuery(api.services.reservations.getReservationsForAdmin) || [];

  // Use real data if available, otherwise use mock data
  const reservationsData = realReservations.length > 0 ? realReservations : mockReservations;

  const handleReservationAction = async (reservationId: string, action: string) => {
    if (action === 'View') {
      router.push(`/control_panel/reservations/${reservationId}`);
    } else if (action === 'Edit') {
      router.push(`/control_panel/reservations/edit/${reservationId}`);
    } else if (action === 'Confirm') {
      setUpdatingReservation(reservationId);
      try {
        await updateReservationStatus({
          reservationId: reservationId as Id<'reservations'>,
          status: 'confirmed',
          adminNotes: 'Confirmed via Control Panel'
        });
        alert('Reservation confirmed successfully!');
      } catch (error) {
        console.error('Error confirming reservation:', error);
        alert('Error confirming reservation. Please try again.');
      } finally {
        setUpdatingReservation(null);
      }
    } else if (action === 'Complete') {
      setUpdatingReservation(reservationId);
      try {
        await updateReservationStatus({
          reservationId: reservationId as Id<'reservations'>,
          status: 'completed',
          adminNotes: 'Completed via Control Panel'
        });
        alert('Reservation marked as completed!');
      } catch (error) {
        console.error('Error completing reservation:', error);
        alert('Error completing reservation. Please try again.');
      } finally {
        setUpdatingReservation(null);
      }
    } else if (action === 'Cancel') {
      const confirmed = confirm('Are you sure you want to cancel this reservation? This action cannot be undone.');
      if (confirmed) {
        setUpdatingReservation(reservationId);
        try {
          await updateReservationStatus({
            reservationId: reservationId as Id<'reservations'>,
            status: 'cancelled',
            adminNotes: 'Cancelled via Control Panel'
          });
          alert('Reservation cancelled successfully!');
        } catch (error) {
          console.error('Error cancelling reservation:', error);
          alert('Error cancelling reservation. Please try again.');
        } finally {
          setUpdatingReservation(null);
        }
      }
    }
    setSelectedReservation(null);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Navigation Sidebar */}
      <ControlPanelNav />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-white">Reservation Management</h1>
                  <p className="text-sm text-white/60">Manage customer reservations and pickups</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/10 text-white hover:bg-white/10"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/10 text-white hover:bg-white/10"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Reservation
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-5 h-5 text-primary" />
                <span className="text-xs text-success">+5.2%</span>
              </div>
              <p className="text-2xl font-bold text-white">{reservationStats.total}</p>
              <p className="text-xs text-white/60">Total Reservations</p>
            </div>
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-warning" />
                <span className="text-xs text-warning">+2.1%</span>
              </div>
              <p className="text-2xl font-bold text-white">{reservationStats.pending}</p>
              <p className="text-xs text-white/60">Pending</p>
            </div>
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-info" />
                <span className="text-xs text-info">+1.8%</span>
              </div>
              <p className="text-2xl font-bold text-white">{reservationStats.confirmed}</p>
              <p className="text-xs text-white/60">Confirmed</p>
            </div>
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span className="text-xs text-success">+3.5%</span>
              </div>
              <p className="text-2xl font-bold text-white">{reservationStats.completed}</p>
              <p className="text-xs text-white/60">Completed</p>
            </div>
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <XCircle className="w-5 h-5 text-error" />
                <span className="text-xs text-error">+0.5%</span>
              </div>
              <p className="text-2xl font-bold text-white">{reservationStats.cancelled}</p>
              <p className="text-xs text-white/60">Cancelled</p>
            </div>
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <Package className="w-5 h-5 text-info" />
                <span className="text-xs text-success">+12.3%</span>
              </div>
              <p className="text-2xl font-bold text-white">{formatCurrency(reservationStats.totalRevenue)}</p>
              <p className="text-xs text-white/60">Completed Revenue</p>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search reservations, customers, items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-secondary/60 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-lg border transition-all flex items-center gap-2 ${
                showFilters
                  ? 'bg-primary border-primary text-white'
                  : 'bg-secondary/60 border-white/10 text-white hover:bg-secondary/80'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Status</label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {[
                    { key: 'all', label: 'All Status', count: reservationsData.length },
                    { key: 'pending', label: 'Pending', count: reservationStats.pending },
                    { key: 'confirmed', label: 'Confirmed', count: reservationStats.confirmed },
                    { key: 'completed', label: 'Completed', count: reservationStats.completed },
                    { key: 'cancelled', label: 'Cancelled', count: reservationStats.cancelled },
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setSelectedStatus(filter.key)}
                      className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm border flex items-center space-x-2 transition-colors ${
                        selectedStatus === filter.key
                          ? 'bg-info border-info text-white'
                          : 'bg-secondary/60 border-white/10 text-white/70 hover:text-white hover:border-primary/20'
                      }`}
                    >
                      <span>{filter.label}</span>
                      <div className={`px-1.5 py-0.5 rounded text-xs ${
                        selectedStatus === filter.key
                          ? 'bg-white/20 text-white'
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {filter.count}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">Date Range</label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {[
                    { key: 'all', label: 'All Dates' },
                    { key: 'today', label: 'Today' },
                    { key: 'tomorrow', label: 'Tomorrow' },
                    { key: 'this_week', label: 'This Week' },
                    { key: 'overdue', label: 'Overdue' },
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setSelectedDate(filter.key)}
                      className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm border transition-colors ${
                        selectedDate === filter.key
                          ? 'bg-primary border-primary text-white'
                          : 'bg-secondary/60 border-white/10 text-white/70 hover:text-white hover:border-primary/20'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Reservations List */}
        <div className="flex-1 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              Reservations ({filteredReservations.length})
            </h2>
            {filteredReservations.length === 0 && reservationsData.length > 0 && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStatus('all');
                  setSelectedDate('all');
                }}
                className="px-3 py-1 rounded-lg bg-primary/10 border border-primary text-primary text-xs hover:bg-primary/20 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
          
          {filteredReservations.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No reservations found</h3>
              <p className="text-white/60 mb-6 text-center">
                Try adjusting your search terms or filters.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReservations.map((reservation) => {
                const statusInfo = getStatusInfo(reservation.status);
                const StatusIcon = statusInfo.icon;
                const isOverdue = new Date(reservation.pickupDate) < new Date() && 
                  reservation.status !== 'completed' && reservation.status !== 'cancelled';
                
                return (
                  <div
                    key={reservation._id}
                    className={`bg-secondary/40 backdrop-blur-sm border rounded-xl p-4 transition-all duration-200 ${
                      isOverdue 
                        ? 'border-error/30 bg-error/5' 
                        : 'border-white/10 hover:border-primary/30'
                    }`}
                  >
                    <div className="flex space-x-4">
                      {/* Status Indicator */}
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-lg bg-secondary border border-white/10 flex items-center justify-center">
                          <StatusIcon className="w-6 h-6 text-white/60" />
                        </div>
                        {isOverdue && (
                          <div className="mt-1 text-center">
                            <span className="text-xs text-error font-medium">Overdue</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Reservation Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-bold text-white mb-1">
                              {reservation.reservationCode}
                            </h3>
                            <p className="text-sm text-white/60 mb-1">
                              {reservation.customerName}
                            </p>
                            <p className="text-xs text-white/40">
                              {reservation.items.length} item{reservation.items.length !== 1 ? 's' : ''} • 
                              Total: {formatCurrency(reservation.totalAmount)}
                            </p>
                          </div>
                          
                          {/* Actions Menu */}
                          <div className="relative">
                            <button
                              onClick={() => setSelectedReservation(selectedReservation === reservation._id ? null : reservation._id)}
                              className="p-1 rounded hover:bg-white/10 transition-colors"
                            >
                              <MoreVertical className="w-4 h-4 text-white/60" />
                            </button>

                            {selectedReservation === reservation._id && (
                              <div className="absolute right-0 top-8 w-48 bg-secondary border border-white/10 rounded-lg shadow-xl z-10">
                                <div className="py-1">
                                  <button
                                    onClick={() => handleReservationAction(reservation._id, 'View')}
                                    className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                                  >
                                    <Eye className="w-4 h-4" />
                                    <span>View Details</span>
                                  </button>
                                  <button
                                    onClick={() => handleReservationAction(reservation._id, 'Edit')}
                                    className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2"
                                  >
                                    <Edit className="w-4 h-4" />
                                    <span>Edit Reservation</span>
                                  </button>
                                  {reservation.status === 'pending' && (
                                    <button
                                      onClick={() => handleReservationAction(reservation._id, 'Confirm')}
                                      disabled={updatingReservation === reservation._id}
                                      className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {updatingReservation === reservation._id ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <CheckCircle className="w-4 h-4" />
                                      )}
                                      <span>{updatingReservation === reservation._id ? 'Confirming...' : 'Confirm'}</span>
                                    </button>
                                  )}
                                  {reservation.status === 'confirmed' && (
                                    <button
                                      onClick={() => handleReservationAction(reservation._id, 'Complete')}
                                      disabled={updatingReservation === reservation._id}
                                      className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {updatingReservation === reservation._id ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <CheckCircle2 className="w-4 h-4" />
                                      )}
                                      <span>{updatingReservation === reservation._id ? 'Completing...' : 'Mark Complete'}</span>
                                    </button>
                                  )}
                                  {['pending', 'confirmed'].includes(reservation.status) && (
                                    <button
                                      onClick={() => handleReservationAction(reservation._id, 'Cancel')}
                                      disabled={updatingReservation === reservation._id}
                                      className="w-full px-4 py-2 text-left text-error hover:bg-error/10 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {updatingReservation === reservation._id ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <XCircle className="w-4 h-4" />
                                      )}
                                      <span>{updatingReservation === reservation._id ? 'Cancelling...' : 'Cancel'}</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Status and Pickup Info */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`px-3 py-1 rounded-lg ${statusInfo.color} flex items-center space-x-1`}>
                              <StatusIcon className="w-3 h-3" />
                              <span className="text-xs font-medium">{statusInfo.label}</span>
                            </div>
                            
                            <div className="flex items-center space-x-1 text-xs text-white/60">
                              <CalendarDays className="w-3 h-3" />
                              <span>{formatDate(reservation.pickupDate)}</span>
                            </div>
                            
                            <div className="flex items-center space-x-1 text-xs text-white/60">
                              <Timer className="w-3 h-3" />
                              <span>{formatTime(reservation.pickupTime)}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-sm font-medium text-white">
                              {formatCurrency(reservation.totalAmount)}
                            </p>
                            <p className="text-xs text-white/60">
                              {reservation.items.length} item{reservation.items.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        
                        {/* Customer Contact Info */}
                        <div className="flex items-center justify-between pt-3 border-t border-white/10">
                          <div className="flex items-center space-x-4 text-xs text-white/60">
                            <div className="flex items-center space-x-1">
                              <Mail className="w-3 h-3" />
                              <span className="truncate max-w-32">{reservation.customerEmail}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Phone className="w-3 h-3" />
                              <span>{reservation.customerPhone}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate max-w-32">{reservation.address}</span>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-xs text-white/60">Created</p>
                            <p className="text-sm font-medium text-white">
                              {new Date(reservation.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {/* Items List */}
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <div className="space-y-1">
                            {reservation.items.map((item, index) => (
                              <div key={index} className="flex items-center justify-between text-xs">
                                <span className="text-white/80">
                                  {item.quantity}x {item.name}
                                </span>
                                <span className="text-white/60">
                                  {formatCurrency(item.price * item.quantity)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Notes */}
                        {reservation.notes && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <p className="text-xs text-white/60 mb-1">Notes:</p>
                            <p className="text-xs text-white/80">{reservation.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close menu */}
      {selectedReservation && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setSelectedReservation(null)}
        />
      )}
    </div>
  );
}

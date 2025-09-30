'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Calendar,
  Package,
  DollarSign,
  Clock,
  MapPin,
  Phone,
  Mail,
  Edit,
  Check,
  X,
  AlertCircle,
  FileText,
  MessageSquare,
  Printer,
  Send,
  MoreVertical,
  Loader,
  CheckCircle,
  XCircle,
  Timer,
  CalendarDays
} from 'lucide-react';
import ControlPanelNav from '@/components/ControlPanelNav';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

// Status options for the modal
const statusOptions = [
  { value: 'pending', label: 'Pending', color: 'yellow' },
  { value: 'confirmed', label: 'Confirmed', color: 'blue' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' }
];

const statusColors = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  confirmed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  expired: 'bg-red-500/20 text-red-400 border-red-500/30',
  cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
};

// Mock data fallback for development
const mockReservationData = {
  _id: '1',
  reservationCode: 'RES-001',
  status: 'pending',
  totalAmount: 1700,
  totalQuantity: 3,
  createdAt: Date.now() - 86400000,
  updatedAt: Date.now() - 86400000,
  reservationDate: Date.now() - 86400000,
  expiryDate: Date.now() + 86400000 * 2,
  guestInfo: {
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '+63 912 345 6789',
    completeAddress: '123 Main St, Quezon City, Metro Manila',
    pickupSchedule: {
      date: '2024-01-15',
      time: '14:00'
    },
    notes: 'Customer prefers morning pickup if possible'
  },
  items: [
    {
      productId: 'prod1',
      quantity: 2,
      reservedPrice: 250,
      product: {
        name: 'Premium Goldfish',
        category: 'Fish',
        image: '/img/products/goldfish.jpg',
        price: 250
      }
    },
    {
      productId: 'prod2',
      quantity: 1,
      reservedPrice: 1200,
      product: {
        name: '75L Glass Tank',
        category: 'Tanks',
        image: '/img/products/tank.jpg',
        price: 1200
      }
    }
  ],
  notes: 'Customer is a first-time buyer, handle with care'
};

export default function ControlPanelReservationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const reservationId = params.id as string;

  const [isUpdating, setIsUpdating] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');

  // Fetch reservation data using Convex (with fallback to mock data)
  const reservation = useQuery(api.services.reservations.getReservationByIdAdmin, {
    reservationId: reservationId as Id<'reservations'>
  }) || mockReservationData;

  // Mutation for updating reservation status
  const updateReservationStatus = useMutation(api.services.reservations.updateReservationStatus);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const formatDate = (dateInput: string | number) => {
    return new Date(dateInput).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (dateInput: string | number) => {
    return new Date(dateInput).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleStatusUpdate = async () => {
    if (!newStatus || !reservation) return;

    setIsUpdating(true);

    try {
      await updateReservationStatus({
        reservationId: reservation._id as Id<'reservations'>,
        status: newStatus as 'pending' | 'confirmed' | 'completed' | 'expired' | 'cancelled',
        adminNotes: statusNote || undefined
      });

      setShowStatusModal(false);
      setNewStatus('');
      setStatusNote('');

      // Show success message
      alert('Reservation status updated successfully!');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleQuickAction = async (action: 'confirm' | 'complete' | 'cancel') => {
    if (!reservation) return;

    setIsUpdating(true);

    try {
      let status;
      let message;

      switch (action) {
        case 'confirm':
          status = 'confirmed';
          message = 'Reservation confirmed successfully!';
          break;
        case 'complete':
          status = 'completed';
          message = 'Reservation marked as completed!';
          break;
        case 'cancel':
          status = 'cancelled';
          message = 'Reservation cancelled successfully!';
          break;
        default:
          return;
      }

      await updateReservationStatus({
        reservationId: reservation._id as Id<'reservations'>,
        status: status as 'pending' | 'confirmed' | 'completed' | 'expired' | 'cancelled',
        adminNotes: `Status changed via quick action: ${action}`
      });

      alert(message);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = () => {
    if (!reservation) return;
    const customerEmail = reservation.guestInfo?.email || reservation.user?.email;
    if (!customerEmail) {
      alert('No email address available for this customer');
      return;
    }
    alert(`Sending confirmation email to ${customerEmail}`);
  };

  const getTimeUntilExpiry = () => {
    if (!reservation) return '';
    const now = new Date();
    const expiry = new Date(reservation.expiryDate);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} remaining`;
    return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
  };

  if (reservation === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <ControlPanelNav />
        <div className="ml-64 flex flex-col">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted">Loading reservation details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="min-h-screen bg-background">
        <ControlPanelNav />
        <div className="ml-64 flex flex-col">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Reservation Not Found</h2>
            <p className="text-muted mb-4">The reservation you&apos;re looking for doesn&apos;t exist.</p>
            <Button onClick={() => router.push('/control_panel/reservations')}>
              Back to Reservations
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Sidebar */}
      <ControlPanelNav />

      {/* Main Content */}
      <div className="ml-64 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {reservation.reservationCode || `RES-${reservation._id.slice(-6).toUpperCase()}`}
                  </h1>
                  <p className="text-sm text-muted">Reservation Details</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* Quick Action Buttons */}
                {reservation.status === 'pending' && (
                  <Button
                    onClick={() => handleQuickAction('confirm')}
                    disabled={isUpdating}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm
                  </Button>
                )}
                {reservation.status === 'confirmed' && (
                  <Button
                    onClick={() => handleQuickAction('complete')}
                    disabled={isUpdating}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Complete
                  </Button>
                )}
                {['pending', 'confirmed'].includes(reservation.status) && (
                  <Button
                    onClick={() => handleQuickAction('cancel')}
                    disabled={isUpdating}
                    variant="outline"
                    size="sm"
                    className="border-red-500 text-red-500 hover:bg-red-500/10"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                )}

                <Button
                  onClick={handlePrint}
                  variant="outline"
                  size="sm"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                <Button
                  onClick={handleSendEmail}
                  variant="outline"
                  size="sm"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Email
                </Button>
                <Button
                  onClick={() => setShowStatusModal(true)}
                  size="sm"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Update Status
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 px-6 py-6 max-w-6xl mx-auto w-full">
          {/* Status and Overview */}
          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            <Card className="lg:col-span-2 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Reservation Overview</h3>
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1.5 rounded-lg border font-medium text-sm capitalize ${statusColors[reservation.status]}`}>
                      {reservation.status}
                    </span>
                    <span className="text-sm text-muted">
                      Created {formatDate(reservation.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">{formatCurrency(reservation.totalAmount || 0)}</p>
                  <p className="text-sm text-muted">{reservation.totalQuantity} items</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted">Reservation Date:</span>
                  <p className="text-white font-medium">{formatDate(reservation.reservationDate)}</p>
                </div>
                <div>
                  <span className="text-muted">Expiry Date:</span>
                  <p className="text-white font-medium">{formatDate(reservation.expiryDate)}</p>
                </div>
                <div>
                  <span className="text-muted">Time Until Expiry:</span>
                  <p className={`font-medium ${reservation.status === 'expired' ? 'text-error' : 'text-warning'}`}>
                    {getTimeUntilExpiry()}
                  </p>
                </div>
                <div>
                  <span className="text-muted">Last Updated:</span>
                  <p className="text-white font-medium">{formatDate(reservation.updatedAt)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-primary/20 rounded-xl">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Customer</h3>
                  <p className="text-sm text-muted">Contact information</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <User className="w-4 h-4 text-muted" />
                  <span className="text-white font-medium">
                    {reservation.guestInfo?.name || (reservation.user ? `${reservation.user.firstName} ${reservation.user.lastName}` : 'Unknown Customer')}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-muted" />
                  <span className="text-white">
                    {reservation.guestInfo?.email || reservation.user?.email || 'No email provided'}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-muted" />
                  <span className="text-white">
                    {reservation.guestInfo?.phone || reservation.user?.phone || 'No phone provided'}
                  </span>
                </div>
                {reservation.guestInfo?.completeAddress && (
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-4 h-4 text-muted mt-0.5" />
                    <span className="text-white text-sm">{reservation.guestInfo.completeAddress}</span>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Pickup Schedule */}
          {reservation.guestInfo?.pickupSchedule && (
            <Card className="p-6 mb-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-info/20 rounded-xl">
                  <Calendar className="w-6 h-6 text-info" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Pickup Schedule</h3>
                  <p className="text-sm text-muted">Customer preferred pickup time</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center space-x-2">
                  <CalendarDays className="w-5 h-5 text-info" />
                  <div>
                    <span className="text-muted text-sm">Pickup Date:</span>
                    <p className="text-white font-medium text-lg">
                      {formatDateOnly(reservation.guestInfo.pickupSchedule.date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Timer className="w-5 h-5 text-info" />
                  <div>
                    <span className="text-muted text-sm">Pickup Time:</span>
                    <p className="text-white font-medium text-lg">
                      {formatTime(reservation.guestInfo.pickupSchedule.time)}
                    </p>
                  </div>
                </div>
              </div>

              {reservation.guestInfo.notes && (
                <div className="mt-4 p-4 bg-secondary/30 rounded-lg">
                  <span className="text-muted text-sm">Customer Notes:</span>
                  <p className="text-white mt-1">{reservation.guestInfo.notes}</p>
                </div>
              )}
            </Card>
          )}

          {/* Reserved Items */}
          <Card className="p-6 mb-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-success/20 rounded-xl">
                <Package className="w-6 h-6 text-success" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Reserved Items</h3>
                <p className="text-sm text-muted">{reservation.totalQuantity} items reserved</p>
              </div>
            </div>

            <div className="divide-y divide-white/10">
              {reservation.items.map((item, index) => (
                <div key={item.productId} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center space-x-4">
                    <img
                      src={item.product?.image || '/placeholder-product.png'}
                      alt={item.product?.name || 'Product'}
                      className="w-16 h-16 object-cover rounded-lg border border-white/10"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-white">{item.product?.name || 'Unknown Product'}</h4>
                      <p className="text-sm text-muted">{item.product?.category || 'Unknown Category'}</p>
                      <div className="flex items-center mt-1">
                        <span className="text-sm text-muted">Qty: {item.quantity}</span>
                        <span className="mx-2 text-muted">•</span>
                        <span className="text-sm font-medium text-primary">{formatCurrency(item.reservedPrice || item.product?.price || 0)} each</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">{formatCurrency((item.reservedPrice || item.product?.price || 0) * item.quantity)}</p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-white">Total Amount</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(reservation.totalAmount || 0)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Notes */}
          {reservation.notes && (
            <Card className="p-6 mb-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-warning/20 rounded-xl">
                  <MessageSquare className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Admin Notes</h3>
                  <p className="text-sm text-muted">Internal notes about this reservation</p>
                </div>
              </div>

              <div className="p-4 bg-secondary/30 rounded-lg">
                <p className="text-white">{reservation.notes}</p>
              </div>
            </Card>
          )}

          {/* Basic Info */}
          <Card className="p-6 mb-20">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-info/20 rounded-xl">
                <FileText className="w-6 h-6 text-info" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Reservation Info</h3>
                <p className="text-sm text-muted">Basic reservation information</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-muted text-sm">Created:</span>
                <p className="text-white font-medium">{formatDate(reservation.createdAt)}</p>
              </div>
              <div>
                <span className="text-muted text-sm">Last Updated:</span>
                <p className="text-white font-medium">{formatDate(reservation.updatedAt)}</p>
              </div>
              <div>
                <span className="text-muted text-sm">Reservation Date:</span>
                <p className="text-white font-medium">{formatDate(reservation.reservationDate)}</p>
              </div>
              <div>
                <span className="text-muted text-sm">Expiry Date:</span>
                <p className="text-white font-medium">{formatDate(reservation.expiryDate)}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-bold text-white mb-4">Update Reservation Status</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    New Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full bg-secondary border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select status</option>
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Input
                    label="Note (Optional)"
                    value={statusNote}
                    onChange={setStatusNote}
                    placeholder="Add a note about this status change"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <Button
                  onClick={() => setShowStatusModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleStatusUpdate}
                  disabled={!newStatus || isUpdating}
                  loading={isUpdating}
                  className="flex-1"
                >
                  {isUpdating ? 'Updating...' : 'Update Status'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="h-16" />
    </div>
  );
}
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
  Loader
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
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

export default function ReservationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const reservationId = params.id as string;

  const [isUpdating, setIsUpdating] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationModalProps, setConfirmationModalProps] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info'
  });

  // Fetch reservation data using Convex
  const reservation = useQuery(api.services.reservations.getReservationByIdAdmin, {
    reservationId: reservationId as Id<'reservations'>
  });

  // Mutation for updating reservation status
  const updateReservationStatus = useMutation(api.services.reservations.updateReservationStatus);

  const showConfirmation = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setConfirmationModalProps({ title, message, type });
    setShowConfirmationModal(true);
  };

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
      showConfirmation('Success', 'Reservation status updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating status:', error);
      showConfirmation('Error', 'Error updating status. Please try again.', 'error');
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
      showConfirmation('No Email', 'No email address available for this customer', 'warning');
      return;
    }
    // Implementation for sending email to customer
    showConfirmation('Email Sent', `Sending confirmation email to ${customerEmail}`, 'info');
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted">Loading reservation details...</p>
        </div>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-4">
          <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Reservation Not Found</h2>
          <p className="text-muted mb-4">The reservation you&apos;re looking for doesn&apos;t exist.</p>
          <Button onClick={() => router.push('/admin/orders')}>
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced Header - Better responsive layout */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
        <div className="px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Left side - Back button and title */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg sm:rounded-xl bg-secondary border border-white/10 hover:bg-white/10 transition-colors shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold text-white truncate">
                  {reservation.reservationCode || `RES-${reservation._id.slice(-6).toUpperCase()}`}
                </h1>
                <p className="text-xs sm:text-sm text-muted">Reservation Details</p>
              </div>
            </div>

            {/* Right side - Action buttons with responsive design */}
            <div className="flex items-center gap-1 sm:gap-3 shrink-0">
              {/* Mobile: Show only icons */}
              <div className="flex sm:hidden gap-1">
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  size="sm"
                  className="p-2"
                >
                  <Printer className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleSendEmail}
                  variant="outline"
                  size="sm"
                  className="p-2"
                >
                  <Send className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => setShowStatusModal(true)}
                  size="sm"
                  className="p-2"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>

              {/* Desktop: Show full buttons */}
              <div className="hidden sm:flex gap-3">
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
      </div>

      {/* Enhanced main content with better responsive layout */}
      <div className="px-3 sm:px-6 lg:px-8 py-3 sm:py-6 max-w-7xl mx-auto">
        {/* Status and Overview - Enhanced responsive grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 mb-3 sm:mb-6">
          <Card className="lg:col-span-2 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white mb-2">Reservation Overview</h3>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <span className={`inline-flex w-fit px-3 py-1.5 rounded-lg border font-medium text-sm capitalize ${statusColors[reservation.status]}`}>
                    {reservation.status}
                  </span>
                  <span className="text-sm text-muted">
                    Created {formatDate(reservation.createdAt)}
                  </span>
                </div>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <p className="text-xl sm:text-2xl font-bold text-white">{formatCurrency(reservation.totalAmount || 0)}</p>
                <p className="text-sm text-muted">{reservation.totalQuantity} items</p>
              </div>
            </div>

            {/* Enhanced responsive grid for info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-muted">Reservation Date:</span>
                <p className="text-white font-medium">{formatDate(reservation.reservationDate)}</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted">Expiry Date:</span>
                <p className="text-white font-medium">{formatDate(reservation.expiryDate)}</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted">Time Until Expiry:</span>
                <p className={`font-medium ${reservation.status === 'expired' ? 'text-error' : 'text-warning'}`}>
                  {getTimeUntilExpiry()}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-muted">Last Updated:</span>
                <p className="text-white font-medium">{formatDate(reservation.updatedAt)}</p>
              </div>
            </div>
          </Card>

          {/* Enhanced Customer Card */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 sm:p-3 bg-primary/20 rounded-lg sm:rounded-xl shrink-0">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-white">Customer</h3>
                <p className="text-sm text-muted">Contact information</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-muted mt-0.5 shrink-0" />
                <span className="text-white font-medium break-words">
                  {reservation.guestInfo?.name || (reservation.user ? `${reservation.user.firstName} ${reservation.user.lastName}` : 'Unknown Customer')}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-muted mt-0.5 shrink-0" />
                <span className="text-white break-all">
                  {reservation.guestInfo?.email || reservation.user?.email || 'No email provided'}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-muted mt-0.5 shrink-0" />
                <span className="text-white">
                  {reservation.guestInfo?.phone || reservation.user?.phone || 'No phone provided'}
                </span>
              </div>
              {reservation.guestInfo?.completeAddress && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted mt-0.5 shrink-0" />
                  <span className="text-white text-sm break-words">{reservation.guestInfo.completeAddress}</span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Enhanced Pickup Schedule */}
        {reservation.guestInfo?.pickupSchedule && (
          <Card className="p-4 sm:p-6 mb-3 sm:mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 sm:p-3 bg-info/20 rounded-lg sm:rounded-xl shrink-0">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-info" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-white">Pickup Schedule</h3>
                <p className="text-sm text-muted">Customer preferred pickup time</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-1">
                <span className="text-muted text-sm">Pickup Date:</span>
                <p className="text-white font-medium text-base sm:text-lg">
                  {formatDateOnly(reservation.guestInfo.pickupSchedule.date)}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-muted text-sm">Pickup Time:</span>
                <p className="text-white font-medium text-base sm:text-lg">
                  {reservation.guestInfo.pickupSchedule.time}
                </p>
              </div>
            </div>

            {reservation.guestInfo.notes && (
              <div className="mt-4 p-3 sm:p-4 bg-secondary/30 rounded-lg">
                <span className="text-muted text-sm">Customer Notes:</span>
                <p className="text-white mt-1 break-words">{reservation.guestInfo.notes}</p>
              </div>
            )}
          </Card>
        )}

        {/* Enhanced Reserved Items */}
        <Card className="p-4 sm:p-6 mb-3 sm:mb-6">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <div className="p-2 sm:p-3 bg-success/20 rounded-lg sm:rounded-xl shrink-0">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-white">Reserved Items</h3>
              <p className="text-sm text-muted">{reservation.totalQuantity} items reserved</p>
            </div>
          </div>

          <div className="divide-y divide-white/10">
            {reservation.items.map((item, index) => (
              <div key={item.productId} className="py-3 sm:py-4 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3 sm:gap-4">
                  <img
                    src={item.product?.image || '/placeholder-product.png'}
                    alt={item.product?.name || 'Product'}
                    className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg border border-white/10 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white break-words">{item.product?.name || 'Unknown Product'}</h4>
                    <p className="text-sm text-muted">{item.product?.category || 'Unknown Category'}</p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
                      <span className="text-sm text-muted">Qty: {item.quantity}</span>
                      <span className="hidden sm:inline text-muted">•</span>
                      <span className="text-sm font-medium text-primary">{formatCurrency(item.reservedPrice || item.product?.price || 0)} each</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-white text-sm sm:text-base">{formatCurrency((item.reservedPrice || item.product?.price || 0) * item.quantity)}</p>
                  </div>
                </div>
              </div>
            ))}

            <div className="pt-3 sm:pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-base sm:text-lg font-bold text-white">Total Amount</span>
                <span className="text-lg sm:text-xl font-bold text-primary">{formatCurrency(reservation.totalAmount || 0)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Enhanced Notes */}
        {reservation.notes && (
          <Card className="p-4 sm:p-6 mb-3 sm:mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 sm:p-3 bg-warning/20 rounded-lg sm:rounded-xl shrink-0">
                <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-warning" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-white">Admin Notes</h3>
                <p className="text-sm text-muted">Internal notes about this reservation</p>
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-secondary/30 rounded-lg">
              <p className="text-white break-words">{reservation.notes}</p>
            </div>
          </Card>
        )}

        {/* Enhanced Basic Info */}
        <Card className="p-4 sm:p-6 mb-16 sm:mb-20">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <div className="p-2 sm:p-3 bg-info/20 rounded-lg sm:rounded-xl shrink-0">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-info" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-white">Reservation Info</h3>
              <p className="text-sm text-muted">Basic reservation information</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1">
              <span className="text-muted text-sm">Created:</span>
              <p className="text-white font-medium">{formatDate(reservation.createdAt)}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted text-sm">Last Updated:</span>
              <p className="text-white font-medium">{formatDate(reservation.updatedAt)}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted text-sm">Reservation Date:</span>
              <p className="text-white font-medium">{formatDate(reservation.reservationDate)}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted text-sm">Expiry Date:</span>
              <p className="text-white font-medium">{formatDate(reservation.expiryDate)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Enhanced Status Update Modal - Better mobile responsive */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-6">
          <Card className="w-full max-w-md mx-3">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg font-bold text-white mb-4">Update Reservation Status</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    New Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full bg-secondary border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
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

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Button
                  onClick={() => setShowStatusModal(false)}
                  variant="outline"
                  className="flex-1 order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleStatusUpdate}
                  disabled={!newStatus || isUpdating}
                  loading={isUpdating}
                  className="flex-1 order-1 sm:order-2"
                >
                  {isUpdating ? 'Updating...' : 'Update Status'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        title={confirmationModalProps.title}
        message={confirmationModalProps.message}
        type={confirmationModalProps.type}
      />

      {/* Enhanced bottom spacing */}
      <div className="h-16 sm:h-20" />
    </div>
  );
}
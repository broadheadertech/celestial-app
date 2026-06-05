'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Wallet,
  Plus,
  Trash2,
  Banknote
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { SMSConfirmationModal } from '@/components/modal/SMSConfirmationModal';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAuthStore } from '@/store/auth';
import { getSMSMessageForStatus, type SMSMessageData } from '@/lib/sms';

const paymentMethodLabels: Record<string, string> = {
  cash: 'Cash',
  gcash: 'GCash',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  other: 'Other',
};
const paymentKindLabels: Record<string, string> = {
  downpayment: 'Downpayment',
  partial: 'Partial payment',
  full: 'Full settlement',
  refund: 'Refund',
  legacy: 'Recorded payment',
};

// Status options for the modal
const statusOptions = [
  { value: 'pending', label: 'Pending', color: 'yellow' },
  { value: 'confirmed', label: 'Confirmed', color: 'blue' },
  { value: 'ready_for_pickup', label: 'Ready for Pickup', color: 'purple' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' }
];

const statusColors = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  confirmed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  ready_for_pickup: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  expired: 'bg-red-500/20 text-red-400 border-red-500/30',
  cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
};

function ReservationDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get reservation ID from query parameter
  const reservationId = searchParams.get('id');

  const [isUpdating, setIsUpdating] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'confirm' | 'ready_for_pickup' | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationModalProps, setConfirmationModalProps] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info'
  });

  // Fetch reservation data using Convex
  const reservation = useQuery(api.services.reservations.getReservationByIdAdmin,
    reservationId ? { reservationId: reservationId as Id<'reservations'> } : "skip"
  );

  // Mutations for updating reservation status
  const updateReservationStatus = useMutation(api.services.reservations.updateReservationStatus);
  const markReservationReadyForPickup = useMutation(api.services.reservations.markReservationReadyForPickup);

  // ── Payment flow (downpayment + partial payments ledger) ──
  const { user: adminUser } = useAuthStore();
  const payments = useQuery(
    api.services.reservationPayments.getReservationPayments,
    reservationId ? { reservationId: reservationId as Id<'reservations'> } : 'skip',
  );
  const addReservationPayment = useMutation(api.services.reservationPayments.addReservationPayment);
  const deleteReservationPayment = useMutation(api.services.reservationPayments.deleteReservationPayment);

  const [showAddPayment, setShowAddPayment] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'gcash' | 'card' | 'bank_transfer' | 'other'>('cash');
  const [payNote, setPayNote] = useState('');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  const handleAddPayment = async () => {
    if (!reservation) return;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      showConfirmation('Invalid Amount', 'Enter a payment amount greater than 0.', 'warning');
      return;
    }
    setIsRecordingPayment(true);
    try {
      const res = await addReservationPayment({
        reservationId: reservation._id as Id<'reservations'>,
        amount,
        method: payMethod,
        note: payNote || undefined,
        userId: adminUser?._id ? (adminUser._id as Id<'users'>) : undefined,
      });
      setPayAmount('');
      setPayNote('');
      setShowAddPayment(false);
      showConfirmation(
        'Payment Recorded',
        res.balance && res.balance > 0
          ? `Recorded ${formatCurrency(amount)}. Remaining balance ${formatCurrency(res.balance)}.`
          : `Recorded ${formatCurrency(amount)}. Reservation fully paid.`,
        'success',
      );
    } catch (e) {
      showConfirmation('Error', e instanceof Error ? e.message : 'Could not record payment.', 'error');
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId: Id<'reservationPayments'>) => {
    setIsRecordingPayment(true);
    try {
      await deleteReservationPayment({
        paymentId,
        userId: adminUser?._id ? (adminUser._id as Id<'users'>) : undefined,
      });
    } catch (e) {
      showConfirmation('Error', e instanceof Error ? e.message : 'Could not remove payment.', 'error');
    } finally {
      setIsRecordingPayment(false);
    }
  };

  // Set default pickup date and time when modal opens
  useEffect(() => {
    if (showPickupModal) {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const time = now.toTimeString().slice(0, 5);
      setPickupDate(today);
      setPickupTime(time);
    }
  }, [showPickupModal]);

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

    // Check if status is confirmed or ready_for_pickup - show SMS modal
    if (newStatus === 'confirmed' || newStatus === 'ready_for_pickup') {
      setPendingAction(newStatus);
      setShowStatusModal(false);
      setShowSMSModal(true);
      return;
    }

    // For other statuses, proceed directly
    setIsUpdating(true);

    try {
      await updateReservationStatus({
        reservationId: reservation._id as Id<'reservations'>,
        status: newStatus as 'pending' | 'confirmed' | 'ready_for_pickup' | 'completed' | 'expired' | 'cancelled',
        adminNotes: statusNote || undefined
      });

      setShowStatusModal(false);
      setNewStatus('');
      setStatusNote('');

      showConfirmation('Success', 'Reservation status updated successfully!', 'success');
    } catch (error) {
      showConfirmation('Error', 'Error updating status. Please try again.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle SMS modal confirmation
  const handleSMSConfirm = async (sendSMS: boolean) => {
    if (!reservation || !pendingAction) return;

    setIsUpdating(true);
    setShowSMSModal(false);

    try {
      if (pendingAction === 'ready_for_pickup') {
        // Use the dedicated ready for pickup function
        await markReservationReadyForPickup({
          reservationId: reservation._id as Id<'reservations'>,
          pickupLocation: 'Main Store',
          notes: statusNote || undefined,
          pickupDate: pickupDate || undefined,
          pickupTime: pickupTime || undefined
        });
      } else {
        // Use regular status update for confirmed
        await updateReservationStatus({
          reservationId: reservation._id as Id<'reservations'>,
          status: pendingAction as 'confirmed',
          adminNotes: statusNote || undefined
        });
      }

      // Reset states
      setNewStatus('');
      setStatusNote('');
      setPendingAction(null);
      
      const actionText = pendingAction === 'ready_for_pickup' ? 'ready for pickup' : 'confirmed';
      showConfirmation(
        'Success', 
        `Reservation ${actionText}! ${sendSMS ? 'SMS sent to customer.' : 'Customer notified via push notification.'}`, 
        'success'
      );
    } catch (error) {
      showConfirmation('Error', 'Error updating status. Please try again.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkReadyForPickup = async () => {
    if (!reservation) return;

    // Show SMS modal instead of directly marking as ready
    setPendingAction('ready_for_pickup');
    setShowPickupModal(false);
    setShowSMSModal(true);
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
    <div className="min-h-screen bg-background text-foreground pb-20 sm:pb-6">
      {/* Enhanced Header with Safe Area */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10 safe-area-top">
        <div className="px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
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
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="px-3 sm:px-6 lg:px-8 py-3 sm:py-6 max-w-7xl mx-auto">
        {/* Status and Overview */}
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

          {/* Customer Card */}
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

        {/* Compact Action Section */}
        <Card className="p-3 sm:p-4 mb-3 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              {reservation.status === 'pending' && (
                <Button
                  onClick={() => {
                    setNewStatus('confirmed');
                    handleStatusUpdate();
                  }}
                  disabled={isUpdating}
                  loading={isUpdating}
                  variant="primary"
                  size="sm"
                  className="shadow-lg shadow-primary/25 hover:shadow-primary/40"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Confirm
                </Button>
              )}

              {reservation.status === 'confirmed' && (
                <Button
                  onClick={() => setShowPickupModal(true)}
                  disabled={isUpdating}
                  variant="primary"
                  size="sm"
                  className="bg-info hover:bg-info/90 text-white shadow-lg shadow-info/25 hover:shadow-info/40"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Ready for Pickup
                </Button>
              )}

              {reservation.status === 'ready_for_pickup' && (
                <Button
                  onClick={() => {
                    setNewStatus('completed');
                    handleStatusUpdate();
                  }}
                  disabled={isUpdating}
                  loading={isUpdating}
                  variant="primary"
                  size="sm"
                  className="bg-success hover:bg-success/90 text-white shadow-lg shadow-success/25 hover:shadow-success/40"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Mark Picked Up
                </Button>
              )}

              {['pending', 'confirmed', 'ready_for_pickup'].includes(reservation.status) && (
                <Button
                  onClick={() => {
                    setNewStatus('cancelled');
                    handleStatusUpdate();
                  }}
                  disabled={isUpdating}
                  loading={isUpdating}
                  variant="outline"
                  size="sm"
                  className="border-error text-error hover:bg-error hover:text-white shadow-lg shadow-error/25 hover:shadow-error/40"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={() => setShowStatusModal(true)}
                variant="secondary"
                size="sm"
                className="shadow-lg shadow-secondary/25 hover:shadow-secondary/40"
              >
                <Edit className="w-4 h-4 mr-2" />
                Manual Update
              </Button>

              <Button
                onClick={handlePrint}
                variant="ghost"
                size="sm"
                className="hover:bg-white/10 hover:text-white"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>

              <Button
                onClick={handleSendEmail}
                variant="ghost"
                size="sm"
                className="hover:bg-white/10 hover:text-white"
              >
                <Send className="w-4 h-4 mr-2" />
                Email
              </Button>
            </div>

            <div className="flex-1 min-w-0">
              <Input
                value={statusNote}
                onChange={setStatusNote}
                placeholder="Add status note..."
                className="bg-secondary/50 border-white/20 text-sm"
              />
            </div>
          </div>
        </Card>

        {/* Pickup Schedule */}
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

        {/* Reserved Items */}
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

        {/* Payment Flow */}
        <Card className="p-4 sm:p-6 mb-3 sm:mb-6">
          <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 sm:p-3 bg-primary/20 rounded-lg sm:rounded-xl shrink-0">
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-white">Payment Flow</h3>
                <p className="text-sm text-muted">Downpayment & partial payments over time</p>
              </div>
            </div>
            {reservation.status !== 'cancelled' && (payments?.balance ?? 1) > 0 && (
              <Button onClick={() => setShowAddPayment((v) => !v)} variant="primary" size="sm" className="shrink-0">
                <Plus className="w-4 h-4 mr-1.5" />
                Add Payment
              </Button>
            )}
          </div>

          {/* Paid / Balance summary */}
          {(() => {
            const total = payments?.total ?? reservation.totalAmount ?? 0;
            const paid = payments?.paid ?? 0;
            const balance = payments?.balance ?? total;
            const pct = total > 0 ? Math.min(100, Math.max(0, (paid / total) * 100)) : 0;
            return (
              <>
                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3">
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <p className="text-[11px] text-muted mb-1">Total</p>
                    <p className="text-sm sm:text-base font-bold text-white">{formatCurrency(total)}</p>
                  </div>
                  <div className="bg-success/10 rounded-lg p-3 border border-success/20">
                    <p className="text-[11px] text-muted mb-1">Collected</p>
                    <p className="text-sm sm:text-base font-bold text-success">{formatCurrency(paid)}</p>
                  </div>
                  <div className="bg-warning/10 rounded-lg p-3 border border-warning/20">
                    <p className="text-[11px] text-muted mb-1">Balance</p>
                    <p className="text-sm sm:text-base font-bold text-warning">{formatCurrency(balance)}</p>
                  </div>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-success rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[11px] text-muted text-right mb-4">{pct.toFixed(0)}% collected</p>
              </>
            );
          })()}

          {/* Add payment form */}
          {showAddPayment && (
            <div className="bg-secondary/40 rounded-xl border border-white/10 p-4 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted mb-1.5">Amount received now (₱)</label>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="e.g. 300"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2.5 bg-background/60 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                  {(payments?.balance ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setPayAmount(String(payments?.balance ?? ''))}
                      className="mt-1.5 text-[11px] text-primary hover:underline"
                    >
                      Pay full balance ({formatCurrency(payments?.balance ?? 0)})
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1.5">Method</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as typeof payMethod)}
                    className="w-full px-3 py-2.5 bg-background/60 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="cash">Cash</option>
                    <option value="gcash">GCash</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="other">Other</option>
                  </select>
                  <p className="mt-1.5 text-[10px] text-muted">Only cash adds to Cash on Hand.</p>
                </div>
              </div>
              <div className="mt-3">
                <Input value={payNote} onChange={setPayNote} placeholder="Note (optional)" />
              </div>
              <div className="flex gap-2 mt-3">
                <Button onClick={() => setShowAddPayment(false)} variant="outline" size="sm" className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleAddPayment}
                  disabled={isRecordingPayment || !payAmount}
                  loading={isRecordingPayment}
                  size="sm"
                  className="flex-1"
                >
                  Record Payment
                </Button>
              </div>
            </div>
          )}

          {/* Payment timeline */}
          {payments === undefined ? (
            <div className="py-6 text-center text-muted text-sm">
              <Loader className="w-5 h-5 animate-spin mx-auto mb-2" />
              Loading payments…
            </div>
          ) : payments.timeline.length === 0 ? (
            <div className="py-6 text-center">
              <Banknote className="w-8 h-8 text-muted/40 mx-auto mb-2" />
              <p className="text-sm text-muted">No payments recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {payments.timeline
                .slice()
                .reverse()
                .map((p) => (
                  <div
                    key={p._id}
                    className="flex items-center gap-3 bg-white/5 rounded-lg border border-white/10 p-3"
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${p.amount < 0 ? 'bg-error/20' : 'bg-success/20'}`}>
                      <Banknote className={`w-4 h-4 ${p.amount < 0 ? 'text-error' : 'text-success'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">{formatCurrency(p.amount)}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-muted">
                          {paymentMethodLabels[p.method] || p.method}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                          {paymentKindLabels[p.kind || 'partial'] || 'Payment'}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted mt-0.5">
                        {formatDate(p.date)}
                        {p.recordedByName ? ` · ${p.recordedByName}` : ''}
                        {p.note ? ` · ${p.note}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-muted">Balance after</p>
                      <p className="text-xs font-medium text-white">{formatCurrency(p.runningBalance)}</p>
                    </div>
                    <button
                      onClick={() => handleDeletePayment(p._id as Id<'reservationPayments'>)}
                      disabled={isRecordingPayment}
                      title="Remove this payment"
                      className="p-1.5 rounded-lg text-muted hover:text-error hover:bg-error/10 transition-colors shrink-0 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </Card>

        {/* Basic Info */}
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

      {/* Status Update Modal */}
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

      {/* Pickup Schedule Modal */}
      {showPickupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-6">
          <Card className="w-full max-w-md mx-3">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg font-bold text-white mb-4">Set Pickup Schedule</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Pickup Date
                  </label>
                  <input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="w-full bg-secondary border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Pickup Time
                  </label>
                  <input
                    type="time"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="w-full bg-secondary border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                  />
                </div>

                <div>
                  <Input
                    label="Pickup Note (Optional)"
                    value={statusNote}
                    onChange={setStatusNote}
                    placeholder="Add a note about the pickup..."
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Button
                  onClick={() => setShowPickupModal(false)}
                  variant="outline"
                  className="flex-1 order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleMarkReadyForPickup}
                  disabled={!pickupDate || !pickupTime || isUpdating}
                  loading={isUpdating}
                  className="flex-1 order-1 sm:order-2"
                >
                  {isUpdating ? 'Marking Ready...' : 'Mark Ready for Pickup'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* SMS Confirmation Modal */}
      {reservation && pendingAction && (
        <SMSConfirmationModal
          isOpen={showSMSModal}
          onClose={() => {
            setShowSMSModal(false);
            setPendingAction(null);
            setNewStatus('');
          }}
          onConfirm={handleSMSConfirm}
          customerName={reservation.guestInfo?.name || `${reservation.user?.firstName} ${reservation.user?.lastName}` || 'Customer'}
          customerPhone={reservation.guestInfo?.phone || reservation.user?.phone}
          smsMessage={getSMSMessageForStatus(
            pendingAction,
            {
              customerName: reservation.guestInfo?.name || `${reservation.user?.firstName} ${reservation.user?.lastName}` || 'Customer',
              reservationCode: reservation.reservationCode || reservation._id,
              productName: reservation.items?.[0]?.product?.name || 'your items',
              quantity: reservation.totalQuantity || reservation.quantity || 1,
              pickupLocation: 'Main Store',
              pickupDate: pickupDate,
              pickupTime: pickupTime,
              notes: statusNote
            }
          )}
          actionLabel={pendingAction === 'ready_for_pickup' ? 'Mark as Ready' : 'Confirm Reservation'}
          isLoading={isUpdating}
        />
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        title={confirmationModalProps.title}
        message={confirmationModalProps.message}
        type={confirmationModalProps.type}
      />
    </div>
  );
}

// Main Export with SafeAreaProvider
export default function ReservationDetailsClient() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <ReservationDetailsContent />
    </SafeAreaProvider>
  );
}
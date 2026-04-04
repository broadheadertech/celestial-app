'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
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
  RefreshCw,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
  X,
  MoreVertical,
  Plus
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { SMSConfirmationModal } from '@/components/modal/SMSConfirmationModal';
import { getSMSMessageForStatus } from '@/lib/sms';
import OrderReceipt from '@/components/admin/OrderReceipt';
import DesktopDrawer from '@/components/admin/DesktopDrawer';
import CreateOrderForm from '@/components/admin/CreateOrderForm';

const ITEMS_PER_PAGE = 15;

type CombinedItem = {
  _id: string;
  type: 'order' | 'reservation';
  code: string;
  status: string;
  totalAmount?: number;
  createdAt: number;
  updatedAt: number;
  customer?: { name: string; email: string; phone?: string; };
  itemCount: number;
  guestInfo?: { name: string; email: string; phone: string; pickupSchedule?: { date: string; time: string; }; };
  items?: Array<{ productId: string; quantity: number; product?: { _id: string; name: string; } | null; }>;
  notes?: string;
};

interface ActionItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'success' | 'danger' | 'info' | 'warning';
  show: boolean;
}

// Bottom Sheet Modal Component (mobile only)
function BottomSheetModal({
  isOpen,
  onClose,
  title,
  actions
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  actions: ActionItem[];
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const getVariantClasses = (variant: string = 'default') => {
    const variants = {
      default: 'text-white hover:bg-white/10',
      success: 'text-green-400 hover:bg-green-500/10',
      danger: 'text-red-400 hover:bg-red-500/10',
      info: 'text-blue-400 hover:bg-blue-500/10',
      warning: 'text-purple-400 hover:bg-purple-500/10',
    };
    return variants[variant as keyof typeof variants] || variants.default;
  };

  const visibleActions = actions.filter(action => action.show);

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] animate-fadeIn"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-[9999] animate-slideUp">
        <div className="bg-secondary/98 backdrop-blur-md border-t border-white/20 rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col">
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-white/20 rounded-full" />
          </div>
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all touch-manipulation"
            >
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>
          <div className="overflow-y-auto overscroll-contain">
            <div className="p-4 space-y-2">
              {visibleActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    action.onClick();
                    onClose();
                  }}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all active:scale-[0.98] ${getVariantClasses(action.variant)}`}
                >
                  <div className="flex-shrink-0">{action.icon}</div>
                  <span className="text-base font-medium flex-1 text-left">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="h-safe-bottom" />
        </div>
      </div>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .h-safe-bottom {
          height: env(safe-area-inset-bottom, 16px);
        }
      `}</style>
    </>,
    document.body
  );
}

// Desktop Dropdown Menu Component
function DesktopDropdown({
  actions,
  onClose,
}: {
  actions: ActionItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const getVariantClasses = (variant: string = 'default') => {
    const variants: Record<string, string> = {
      default: 'text-white/80 hover:bg-white/10 hover:text-white',
      success: 'text-green-400 hover:bg-green-500/10',
      danger: 'text-red-400 hover:bg-red-500/10',
      info: 'text-blue-400 hover:bg-blue-500/10',
      warning: 'text-purple-400 hover:bg-purple-500/10',
    };
    return variants[variant] || variants.default;
  };

  const visibleActions = actions.filter(a => a.show);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 w-56 bg-secondary border border-white/15 rounded-xl shadow-2xl py-1.5 animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {visibleActions.map((action, index) => (
        <button
          key={index}
          onClick={() => {
            action.onClick();
            onClose();
          }}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm transition-colors ${getVariantClasses(action.variant)}`}
        >
          <div className="flex-shrink-0 [&>svg]:w-4 [&>svg]:h-4">{action.icon}</div>
          <span className="flex-1 text-left">{action.label}</span>
        </button>
      ))}
    </div>
  );
}

function AdminOrdersContent() {
  const router = useRouter();
  const { width } = useWindowSize();
  const isMobile = width < 640;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CombinedItem | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [mounted, setMounted] = useState(false);

  const [showSMSModal, setShowSMSModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    itemId: string;
    status: string;
    type: 'status' | 'ready_for_pickup';
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Desktop dropdown state - stores item _id
  const [dropdownItemId, setDropdownItemId] = useState<string | null>(null);

  const ordersQuery = useQuery(api.services.orders.getAllOrdersAdmin, {});
  const reservationsQuery = useQuery(api.services.reservations.getAllReservationsAdmin, {});
  const updateOrderStatus = useMutation(api.services.orders.updateOrderStatus);
  const updateReservationStatus = useMutation(api.services.reservations.updateReservationStatus);
  const markReservationReadyForPickup = useMutation(api.services.reservations.markReservationReadyForPickup);
  const acknowledgeOrder = useMutation(api.services.orders.acknowledgeOrder);
  const releaseOrder = useMutation(api.services.orders.releaseOrder);
  const acknowledgeReservation = useMutation(api.services.reservations.acknowledgeReservation);
  const releaseReservation = useMutation(api.services.reservations.releaseReservation);
  const assignOrderSA = useMutation(api.services.admin.assignOrderSalesAssociate);
  const assignReservationSA = useMutation(api.services.admin.assignReservationSalesAssociate);
  const staffUsers = useQuery(api.services.admin.getStaffUsers, {});

  const [receiptData, setReceiptData] = useState<any>(null);
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [showAssignSA, setShowAssignSA] = useState<CombinedItem | null>(null);
  const [selectedSAId, setSelectedSAId] = useState('');
  const [selectedSAName, setSelectedSAName] = useState('');
  const [confirmPrompt, setConfirmPrompt] = useState<{ message: string; action: () => Promise<void> } | null>(null);
  const [isConfirmProcessing, setIsConfirmProcessing] = useState(false);

  const isLoading = ordersQuery === undefined || reservationsQuery === undefined;

  useEffect(() => { setMounted(true); }, []);

  const allItems = useMemo((): CombinedItem[] => {
    if (!ordersQuery || !reservationsQuery) return [];
    const orders: CombinedItem[] = ordersQuery.map(order => ({
      ...order,
      type: 'order' as const,
      code: `ORD-${order._id.slice(-6).toUpperCase()}`,
      customer: order.user ? { name: `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim(), email: order.user.email || '', phone: order.user.phone } : undefined,
      itemCount: order.items?.length || 0,
    }));
    const reservations: CombinedItem[] = reservationsQuery.map(reservation => ({
      ...reservation,
      type: 'reservation' as const,
      code: reservation.reservationCode || `RES-${reservation._id.slice(-6).toUpperCase()}`,
      customer: reservation.guestInfo ? { name: reservation.guestInfo.name, email: reservation.guestInfo.email, phone: reservation.guestInfo.phone } : reservation.user ? { name: `${reservation.user.firstName || ''} ${reservation.user.lastName || ''}`.trim(), email: reservation.user.email || '', phone: reservation.user.phone } : undefined,
      itemCount: reservation.items?.length || reservation.totalQuantity || 0,
    }));
    return [...orders, ...reservations];
  }, [ordersQuery, reservationsQuery]);

  const orderStats = useMemo(() => {
    const pending = allItems.filter(item => item.status === 'pending').length;
    const confirmed = allItems.filter(item => item.status === 'confirmed').length;
    const completed = allItems.filter(item => item.status === 'delivered' || item.status === 'completed').length;
    const cancelled = allItems.filter(item => item.status === 'expired' || item.status === 'cancelled').length;
    return { pending, confirmed, completed, cancelled };
  }, [allItems]);

  const filteredItems = useMemo(() => {
    let filtered = allItems;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => item.code.toLowerCase().includes(query) || item.customer?.name.toLowerCase().includes(query) || item.customer?.email.toLowerCase().includes(query));
    }
    if (selectedStatus !== 'all') filtered = filtered.filter(item => item.status === selectedStatus);
    return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [searchQuery, selectedStatus, allItems]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  useMemo(() => { setCurrentPage(1); }, [searchQuery, selectedStatus]);

  const handleUpdateStatus = async (itemId: string, newStatus: string) => {
    try {
      const item = allItems.find(i => i._id === itemId);
      if (!item) return;

      if (item.type === 'reservation' && newStatus === 'confirmed') {
        setPendingAction({ itemId, status: newStatus, type: 'status' });
        setShowSMSModal(true);
        return;
      }

      if (item.type === 'order') {
        await updateOrderStatus({ orderId: itemId as Id<'orders'>, status: newStatus as any });
      } else {
        await updateReservationStatus({ reservationId: itemId as Id<'reservations'>, status: newStatus as any });
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const handleMarkReadyForPickup = async (itemId: string) => {
    try {
      const item = allItems.find(i => i._id === itemId);
      if (!item || item.type !== 'reservation') return;

      setPendingAction({ itemId, status: 'ready_for_pickup', type: 'ready_for_pickup' });
      setShowSMSModal(true);
    } catch (error) {
      console.error('Failed to prepare ready for pickup:', error);
      alert('Failed to prepare status update. Please try again.');
    }
  };

  const handleSMSConfirm = async (sendSMS: boolean) => {
    if (!pendingAction) return;

    setIsProcessing(true);
    try {
      const item = allItems.find(i => i._id === pendingAction.itemId);
      if (!item) return;

      if (pendingAction.type === 'ready_for_pickup') {
        await markReservationReadyForPickup({
          reservationId: pendingAction.itemId as Id<'reservations'>,
          pickupLocation: "Main Store",
          notes: "Your reservation is ready for pickup. Please visit us during business hours."
        });
      } else {
        await updateReservationStatus({
          reservationId: pendingAction.itemId as Id<'reservations'>,
          status: pendingAction.status as any
        });
      }

      setShowSMSModal(false);
      setPendingAction(null);
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcknowledge = (itemId: string, type: 'order' | 'reservation') => {
    setConfirmPrompt({
      message: `Acknowledge this ${type}? This will confirm it and generate a receipt.`,
      action: async () => {
        const receipt = type === 'order'
          ? await acknowledgeOrder({ orderId: itemId as Id<'orders'> })
          : await acknowledgeReservation({ reservationId: itemId as Id<'reservations'> });
        setReceiptData(receipt);
      },
    });
  };

  const handleRelease = (itemId: string, type: 'order' | 'reservation') => {
    setConfirmPrompt({
      message: `Release this ${type}? This will mark it as ${type === 'order' ? 'delivered' : 'completed'} and generate a receipt.`,
      action: async () => {
        const receipt = type === 'order'
          ? await releaseOrder({ orderId: itemId as Id<'orders'> })
          : await releaseReservation({ reservationId: itemId as Id<'reservations'> });
        setReceiptData(receipt);
      },
    });
  };

  const handleAssignSA = async () => {
    if (!showAssignSA) return;
    try {
      if (showAssignSA.type === 'order') {
        await assignOrderSA({
          orderId: showAssignSA._id as Id<'orders'>,
          salesAssociateId: selectedSAId ? selectedSAId as Id<'users'> : undefined,
          salesAssociateName: selectedSAName || undefined,
        });
      } else {
        await assignReservationSA({
          reservationId: showAssignSA._id as Id<'reservations'>,
          salesAssociateId: selectedSAId ? selectedSAId as Id<'users'> : undefined,
          salesAssociateName: selectedSAName || undefined,
        });
      }
      setShowAssignSA(null);
      setSelectedSAId('');
      setSelectedSAName('');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to assign');
    }
  };

  const getActionItems = (item: CombinedItem): ActionItem[] => {
    return [
      {
        icon: <Eye className="w-5 h-5" />,
        label: 'View Details',
        onClick: () => router.push(item.type === 'reservation' ? `/admin/reservation-detail?id=${item._id}` : `/admin/orders/detail?id=${item._id}`),
        variant: 'info',
        show: true,
      },
      {
        icon: <CheckCircle className="w-5 h-5" />,
        label: `Acknowledge ${item.type === 'order' ? 'Order' : 'Reservation'} (Receipt)`,
        onClick: () => handleAcknowledge(item._id, item.type),
        variant: 'success',
        show: item.status === 'pending',
      },
      {
        icon: <Package className="w-5 h-5" />,
        label: `Release ${item.type === 'order' ? 'Order' : 'Reservation'} (Receipt)`,
        onClick: () => handleRelease(item._id, item.type),
        variant: 'success',
        show: ['confirmed', 'processing', 'ready_for_pickup'].includes(item.status),
      },
      {
        icon: <Package className="w-5 h-5" />,
        label: 'Ready for Pickup',
        onClick: () => handleMarkReadyForPickup(item._id),
        variant: 'warning',
        show: item.status === 'confirmed' && item.type === 'reservation',
      },
      {
        icon: <CheckCircle className="w-5 h-5" />,
        label: 'Mark Picked Up',
        onClick: () => handleUpdateStatus(item._id, 'completed'),
        variant: 'success',
        show: item.status === 'ready_for_pickup' && item.type === 'reservation',
      },
      {
        icon: <Package className="w-5 h-5" />,
        label: 'Mark Delivered',
        onClick: () => handleUpdateStatus(item._id, 'completed'),
        variant: 'success',
        show: item.status === 'processing',
      },
      {
        icon: <User className="w-5 h-5" />,
        label: 'Assign Sales Associate',
        onClick: () => { setShowAssignSA(item); setSelectedSAId(''); setSelectedSAName(''); },
        variant: 'info',
        show: !['cancelled', 'expired'].includes(item.status),
      },
      {
        icon: <XCircle className="w-5 h-5" />,
        label: `Cancel ${item.type === 'order' ? 'Order' : 'Reservation'}`,
        onClick: () => {
          setConfirmPrompt({
            message: `Cancel this ${item.type}? Stock will be restored. This cannot be undone.`,
            action: async () => { await handleUpdateStatus(item._id, 'cancelled'); },
          });
        },
        variant: 'danger',
        show: ['pending', 'confirmed', 'ready_for_pickup'].includes(item.status),
      },
    ];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
      case 'confirmed': return <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
      case 'ready_for_pickup': return <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
      case 'processing': return <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
      case 'delivered': return <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
      case 'completed': return <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
      case 'expired': return <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
      case 'cancelled': return <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
      default: return <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-warning/20 text-warning border-warning/30',
      confirmed: 'bg-success/20 text-success border-success/30',
      ready_for_pickup: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      processing: 'bg-info/20 text-info border-info/30',
      delivered: 'bg-success/20 text-success border-success/30',
      completed: 'bg-success/20 text-success border-success/30',
      expired: 'bg-error/20 text-error border-error/30',
      cancelled: 'bg-error/20 text-error border-error/30',
    };
    return colors[status as keyof typeof colors] || 'bg-muted/20 text-muted border-muted/30';
  };

  const getTypeBadge = (type: 'order' | 'reservation') => {
    if (type === 'order') return 'bg-blue-500/15 text-blue-400 border-blue-500/25';
    return 'bg-purple-500/15 text-purple-400 border-purple-500/25';
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 sm:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10 safe-area-top">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <button onClick={() => router.back()} className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 active:scale-95 transition-all flex-shrink-0 touch-manipulation">
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold text-white truncate">Management Center</h1>
                <p className="text-xs sm:text-sm text-white/60 hidden xs:block truncate">Orders & Reservations</p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* Mobile: navigate to page */}
              <button
                onClick={() => router.push('/admin/orders/create')}
                className="sm:hidden px-3 py-2 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 active:scale-95 transition-all touch-manipulation flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              {/* Desktop: open drawer */}
              <button
                onClick={() => setShowCreateDrawer(true)}
                className="hidden sm:flex px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                New Order
              </button>
              <button onClick={() => { setIsRefreshing(true); setTimeout(() => setIsRefreshing(false), 1000); }} disabled={isRefreshing} className="p-2 sm:px-3 sm:py-2 rounded-lg bg-secondary/60 border border-white/10 hover:bg-secondary/80 active:scale-95 transition-all touch-manipulation">
                <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/40 pointer-events-none" />
              <input type="text" placeholder="Search orders, customers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} disabled={isLoading} className="w-full pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 sm:py-3 bg-secondary/60 border border-white/10 rounded-lg text-sm sm:text-base text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50" />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2.5 sm:right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-white/10 active:scale-95 transition-all touch-manipulation"><X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/60" /></button>}
            </div>
            <button onClick={() => setShowFilters(!showFilters)} disabled={isLoading} className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg border transition-all flex items-center gap-1.5 sm:gap-2 flex-shrink-0 active:scale-95 touch-manipulation ${showFilters || selectedStatus !== 'all' ? 'bg-primary border-primary text-white' : 'bg-secondary/60 border-white/10 text-white hover:bg-secondary/80'} disabled:opacity-50`}>
              <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-medium hidden xs:inline">Filters</span>
              {selectedStatus !== 'all' && <span className="w-2 h-2 rounded-full bg-white flex-shrink-0" />}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4 border-b border-white/10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[
            { Icon: Clock, count: orderStats.pending, label: 'Pending Review', color: 'yellow' },
            { Icon: CheckCircle, count: orderStats.confirmed, label: 'Confirmed', color: 'green' },
            { Icon: Package, count: orderStats.completed, label: 'Completed', color: 'blue' },
            { Icon: XCircle, count: orderStats.cancelled, label: 'Cancelled', color: 'red' },
          ].map(({ Icon, count, label, color }) => (
            <div key={label} className={`bg-gradient-to-br from-${color}-500/10 to-${color === 'yellow' ? 'orange' : color === 'green' ? 'emerald' : color === 'blue' ? 'cyan' : 'pink'}-500/10 border border-${color}-500/20 rounded-lg p-2.5 sm:p-4`}>
              <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1">
                <Icon className={`w-3 h-3 sm:w-4 sm:h-4 text-${color}-400`} />
                <span className={`text-lg sm:text-2xl font-bold text-${color}-400`}>{count}</span>
              </div>
              <p className="text-[10px] sm:text-xs text-white/60 font-medium text-center">{label}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-3 sm:mt-4">
          <p className="text-xs sm:text-sm text-white/60">Showing <span className="text-white font-medium">{paginatedItems.length}</span> of <span className="text-white font-medium">{filteredItems.length}</span> items</p>
          <div className="flex items-center gap-2 text-xs text-white/40"><div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div><span className="hidden xs:inline">Live updates</span></div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-secondary/60 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-medium text-white">Filters</h3>
                <div className="flex items-center gap-2">
                  {selectedStatus !== 'all' && <button onClick={() => { setSearchQuery(''); setSelectedStatus('all'); setShowFilters(false); setCurrentPage(1); }} className="text-xs text-primary hover:text-primary/80 transition-colors touch-manipulation">Clear All</button>}
                  <button onClick={() => setShowFilters(false)} className="p-1 rounded hover:bg-white/10 transition-colors sm:hidden touch-manipulation"><X className="w-4 h-4 text-white/60" /></button>
                </div>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-white mb-2">Status</label>
                <div className="flex gap-2 overflow-x-auto sm:flex-wrap scrollbar-hide pb-1">
                  {[{ value: 'all', label: 'All Status' }, { value: 'pending', label: 'Pending' }, { value: 'confirmed', label: 'Confirmed' }, { value: 'ready_for_pickup', label: 'Ready for Pickup' }, { value: 'processing', label: 'Processing' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }].map((status) => (
                    <button key={status.value} onClick={() => setSelectedStatus(status.value)} className={`flex-shrink-0 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm border transition-all active:scale-95 touch-manipulation whitespace-nowrap ${selectedStatus === status.value ? 'bg-primary border-primary text-white' : 'bg-secondary/60 border-white/10 text-white/70 hover:text-white hover:border-primary/20'}`}>{status.label}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-sm sm:text-lg font-bold text-white">Items <span className="text-white/60">({filteredItems.length})</span></h2>
          {filteredItems.length === 0 && allItems.length > 0 && <button onClick={() => { setSearchQuery(''); setSelectedStatus('all'); setShowFilters(false); setCurrentPage(1); }} className="px-2.5 sm:px-3 py-1 rounded-lg bg-primary/10 border border-primary text-primary text-[10px] sm:text-xs hover:bg-primary/20 active:scale-95 transition-all touch-manipulation">Clear Filters</button>}
        </div>

        {isLoading ? (
          <div className="space-y-2.5 sm:space-y-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-secondary/40 border border-white/10 rounded-lg sm:rounded-xl animate-pulse h-32"></div>)}</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-white/20 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-xl font-bold text-white mb-1 sm:mb-2">No items found</h3>
            <p className="text-xs sm:text-sm text-white/60 mb-4 sm:mb-6 text-center px-4">{!allItems || allItems.length === 0 ? 'No orders or reservations yet.' : 'Try adjusting your search terms or filters.'}</p>
          </div>
        ) : (
          <>
            {/* ============ DESKTOP TABLE (sm: and up) ============ */}
            <div className="hidden sm:block">
              <div className="bg-secondary/30 border border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-secondary/50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Code</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Type</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Customer</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Items</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Amount</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Date</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {paginatedItems.map((item) => (
                        <tr
                          key={item._id}
                          className="hover:bg-white/[0.03] transition-colors group"
                        >
                          {/* Code */}
                          <td className="px-4 py-3.5">
                            <span className="font-semibold text-white">{item.code}</span>
                          </td>

                          {/* Type */}
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border font-medium ${getTypeBadge(item.type)}`}>
                              {item.type === 'order' ? <Package className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                              <span className="capitalize">{item.type}</span>
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border font-medium ${getStatusBadge(item.status)}`}>
                              {getStatusIcon(item.status)}
                              <span className="capitalize">{item.status.replace('_', ' ')}</span>
                            </span>
                          </td>

                          {/* Customer */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
                                <User className="w-3.5 h-3.5 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-white font-medium text-sm truncate max-w-[180px]">{item.customer?.name || 'Guest Customer'}</p>
                                {item.customer?.phone && (
                                  <p className="text-xs text-white/50 truncate max-w-[180px]">{item.customer.phone}</p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Items */}
                          <td className="px-4 py-3.5 text-center">
                            <span className="text-white/80">{item.itemCount}</span>
                          </td>

                          {/* Amount */}
                          <td className="px-4 py-3.5 text-right">
                            <span className="font-semibold text-white">{formatCurrency(item.totalAmount || 0)}</span>
                          </td>

                          {/* Date */}
                          <td className="px-4 py-3.5">
                            <span className="text-white/60 text-xs whitespace-nowrap">{formatDateTime(item.createdAt)}</span>
                          </td>

                          {/* Actions Dropdown */}
                          <td className="px-4 py-3.5 text-right">
                            <div className="relative inline-block">
                              <button
                                onClick={() => setDropdownItemId(dropdownItemId === item._id ? null : item._id)}
                                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/30 transition-all flex items-center justify-center"
                              >
                                <MoreVertical className="w-4 h-4 text-white/70" />
                              </button>
                              {dropdownItemId === item._id && (
                                <DesktopDropdown
                                  actions={getActionItems(item)}
                                  onClose={() => setDropdownItemId(null)}
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ============ MOBILE CARDS (below sm:) ============ */}
            <div className="sm:hidden space-y-2.5">
              {paginatedItems.map((item) => (
                <div key={item._id} className="bg-secondary/40 backdrop-blur-sm border border-white/10 rounded-lg transition-all duration-200 hover:border-primary/30">
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.type === 'order' ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30' : 'bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30'}`}>
                        {item.type === 'order' ? <Package className="w-4 h-4 text-blue-400" /> : <Calendar className="w-4 h-4 text-purple-400" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-white text-sm truncate">{item.code}</h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border font-medium ${getStatusBadge(item.status)} shrink-0`}>
                            {getStatusIcon(item.status)}
                            <span className="capitalize hidden xs:inline">{item.status.replace('_', ' ')}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/60 flex-wrap">
                          <span className="whitespace-nowrap">{formatDateTime(item.createdAt)}</span>
                          <span className="hidden xs:inline">&bull;</span>
                          <span className="whitespace-nowrap">{item.itemCount} items</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right min-w-[70px]">
                        <p className="font-bold text-white text-sm">{formatCurrency(item.totalAmount || 0)}</p>
                      </div>
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/30 transition-all flex items-center justify-center shrink-0 touch-manipulation active:scale-95"
                      >
                        <MoreVertical className="w-4 h-4 text-white/70" />
                      </button>
                    </div>
                  </div>
                  <div className="px-3 pb-3">
                    <div className="flex items-start gap-2 p-3 bg-white/5 rounded-lg border border-white/5">
                      <div className="w-7 h-7 bg-primary/20 rounded-full flex items-center justify-center shrink-0"><User className="w-3 h-3 text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate mb-1">{item.customer?.name || 'Guest Customer'}</p>
                        <div className="flex flex-col gap-1 text-xs text-white/60">
                          {item.customer?.email && <div className="flex items-center gap-1 min-w-0"><Mail className="w-3 h-3 shrink-0" /><span className="truncate">{item.customer.email}</span></div>}
                          {item.customer?.phone && <div className="flex items-center gap-1 shrink-0"><Phone className="w-3 h-3" /><span>{item.customer.phone}</span></div>}
                        </div>
                      </div>
                    </div>
                    {item.type === 'reservation' && item.guestInfo?.pickupSchedule && (
                      <div className="flex items-center gap-2 mt-2 p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        <Calendar className="w-3 h-3 text-purple-400 shrink-0" />
                        <span className="text-xs text-white/80 truncate">{item.guestInfo.pickupSchedule.date} at {item.guestInfo.pickupSchedule.time}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 sm:mt-8 flex items-center justify-center gap-3 sm:gap-4">
                <button onClick={() => { setCurrentPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={currentPage === 1} className={`p-2 sm:p-2.5 rounded-lg border transition-all touch-manipulation ${currentPage === 1 ? 'bg-secondary/40 border-white/10 text-white/40 cursor-not-allowed' : 'bg-secondary border-white/10 text-white hover:bg-white/10 active:scale-95'}`}>
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <span className="text-xs sm:text-sm text-white/80 font-medium">Page {currentPage} of {totalPages}</span>
                <button onClick={() => { setCurrentPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={currentPage === totalPages} className={`p-2 sm:p-2.5 rounded-lg border transition-all touch-manipulation ${currentPage === totalPages ? 'bg-secondary/40 border-white/10 text-white/40 cursor-not-allowed' : 'bg-secondary border-white/10 text-white hover:bg-white/10 active:scale-95'}`}>
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNavbar />

      {/* Bottom Sheet Modal (mobile) */}
      {selectedItem && (
        <BottomSheetModal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          title={`${selectedItem.type === 'order' ? 'Order' : 'Reservation'} Actions`}
          actions={getActionItems(selectedItem)}
        />
      )}

      {/* SMS Confirmation Modal */}
      {pendingAction && (() => {
        const item = allItems.find(i => i._id === pendingAction.itemId);
        if (!item) return null;

        const customerName = item.customer?.name || 'Guest Customer';
        const customerPhone = item.customer?.phone;

        let smsMessage = '';
        if (pendingAction.type === 'ready_for_pickup') {
          const firstItem = item.items?.[0];
          const productName = firstItem?.product?.name || 'items';
          smsMessage = getSMSMessageForStatus('ready_for_pickup', {
            customerName,
            reservationCode: item.code,
            productName,
            quantity: item.itemCount,
            pickupLocation: "Main Store",
            pickupDate: new Date().toLocaleDateString(),
            pickupTime: "business hours",
            notes: "Please visit us during business hours."
          });
        } else {
          const firstItem = item.items?.[0];
          const productName = firstItem?.product?.name || 'items';
          smsMessage = getSMSMessageForStatus('confirmed', {
            customerName,
            reservationCode: item.code,
            productName,
            quantity: item.itemCount
          });
        }

        const actionLabel = pendingAction.type === 'ready_for_pickup'
          ? 'Mark as Ready for Pickup'
          : 'Confirm Reservation';

        return (
          <SMSConfirmationModal
            isOpen={showSMSModal}
            onClose={() => {
              setShowSMSModal(false);
              setPendingAction(null);
            }}
            onConfirm={handleSMSConfirm}
            customerName={customerName}
            customerPhone={customerPhone}
            smsMessage={smsMessage}
            actionLabel={actionLabel}
            isLoading={isProcessing}
          />
        );
      })()}

      {/* Confirmation Prompt */}
      {confirmPrompt && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" onClick={() => !isConfirmProcessing && setConfirmPrompt(null)} />
          <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
            <div className="bg-secondary border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold text-white mb-2">Confirm Action</h3>
              <p className="text-sm text-white/70 mb-6">{confirmPrompt.message}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmPrompt(null)}
                  disabled={isConfirmProcessing}
                  className="flex-1 px-4 py-3 bg-secondary border border-white/10 text-white rounded-xl font-medium hover:bg-white/10 active:scale-95 transition-all disabled:opacity-50"
                >
                  No
                </button>
                <button
                  onClick={async () => {
                    setIsConfirmProcessing(true);
                    try { await confirmPrompt.action(); }
                    catch (e) { alert(e instanceof Error ? e.message : 'Action failed'); }
                    finally { setIsConfirmProcessing(false); setConfirmPrompt(null); }
                  }}
                  disabled={isConfirmProcessing}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isConfirmProcessing ? 'Processing...' : 'Yes'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Assign Sales Associate Modal */}
      {showAssignSA && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" onClick={() => setShowAssignSA(null)} />
          <div className="fixed bottom-0 left-0 right-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-[9999]">
            <div className="bg-secondary/95 backdrop-blur-md border-t sm:border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 sm:w-full sm:max-w-sm sm:mx-4">
              <div className="flex justify-center pt-2 pb-3 sm:hidden">
                <div className="w-12 h-1.5 bg-white/20 rounded-full" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Assign Sales Associate</h3>
              <p className="text-xs text-white/60 mb-4">{showAssignSA.code}</p>
              <div className="relative mb-4">
                <select
                  value={selectedSAId}
                  onChange={(e) => {
                    setSelectedSAId(e.target.value);
                    const staff = staffUsers?.find((s: any) => s._id === e.target.value);
                    setSelectedSAName(staff ? `${staff.firstName} ${staff.lastName}` : '');
                  }}
                  className="w-full px-3 py-2.5 bg-background/60 border border-white/10 rounded-lg text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">None (remove associate)</option>
                  {staffUsers?.map((s: any) => (
                    <option key={s._id} value={s._id}>
                      {s.firstName} {s.lastName} {s.isSalesAssociate ? '⭐' : ''} ({s.role})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAssignSA(null)} className="flex-1 px-4 py-2.5 bg-secondary border border-white/10 text-white rounded-xl font-medium hover:bg-white/10 active:scale-95 transition-all text-sm">
                  Cancel
                </button>
                <button onClick={handleAssignSA} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 active:scale-95 transition-all text-sm">
                  Assign
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Create Order Drawer (Desktop) */}
      <DesktopDrawer
        isOpen={showCreateDrawer}
        onClose={() => setShowCreateDrawer(false)}
        title="Create Order"
        subtitle="Walk-in / In-store order"
        width="max-w-xl"
      >
        <CreateOrderForm onSuccess={() => setShowCreateDrawer(false)} />
      </DesktopDrawer>

      {/* Order Receipt Modal */}
      {receiptData && (
        <OrderReceipt
          data={receiptData}
          onClose={() => setReceiptData(null)}
        />
      )}

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

export default function AdminOrdersPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <AdminOrdersContent />
    </SafeAreaProvider>
  );
}

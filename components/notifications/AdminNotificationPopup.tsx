'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Bell,
  Package,
  ShoppingBag,
  Users,
  AlertTriangle,
  CheckCircle,
  Info,
  DollarSign,
  Clock,
  ChevronRight
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface NotificationPopupProps {
  userId?: string;
  userRole?: string;
}

interface ConvexNotification {
  _id: string;
  title: string;
  message: string;
  type: 'reservation' | 'order' | 'user' | 'product' | 'payment' | 'alert' | 'warning' | 'success' | 'system';
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  relatedId?: string;
  relatedType?: string;
  metadata?: {
    customerName?: string;
    customerEmail?: string;
    productName?: string;
    amount?: number;
    status?: string;
    orderId?: string;
    userId?: string;
  };
  createdAt: number;
  updatedAt: number;
}

export default function AdminNotificationPopup({ userId, userRole }: NotificationPopupProps) {
  const router = useRouter();
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  const [showPopup, setShowPopup] = useState(false);
  const [currentNotification, setCurrentNotification] = useState<ConvexNotification | null>(null);

  // Get the latest unread admin notifications
  const latestNotifications = useQuery(api.services.notifications.getAdminNotifications, {
    limit: 1,
    onlyUnread: true,
  });

  // Mutation to mark notification as read
  const markAsReadMutation = useMutation(api.services.notifications.markAsRead);

  // Get the latest notification that should be shown
  const latestUnreadNotification = latestNotifications?.[0];

  // Show popup for new notifications
  useEffect(() => {
    if (latestUnreadNotification && !dismissedNotifications.has(latestUnreadNotification._id)) {
      // Only show if it's a new notification (created within last 30 seconds)
      const isNewNotification = Date.now() - latestUnreadNotification.createdAt < 30000;

      if (isNewNotification) {
        setCurrentNotification(latestUnreadNotification);
        setShowPopup(true);

        // Auto-hide after 8 seconds for non-urgent notifications
        if (latestUnreadNotification.priority !== 'urgent') {
          const timer = setTimeout(() => {
            handleDismiss();
          }, 8000);

          return () => clearTimeout(timer);
        }
      }
    }
  }, [latestUnreadNotification, dismissedNotifications]);

  const handleDismiss = () => {
    if (currentNotification) {
      setDismissedNotifications(prev => new Set(prev).add(currentNotification._id));
    }
    setShowPopup(false);
    setCurrentNotification(null);
  };

  const handleNotificationClick = async () => {
    if (!currentNotification) return;

    try {
      // Mark as read
      await markAsReadMutation({ notificationId: currentNotification._id as any });

      // Navigate to relevant page based on notification type and metadata
      const route = getNotificationRoute(currentNotification);
      if (route) {
        router.push(route);
      }

      handleDismiss();
    } catch (error) {
      console.error('Failed to handle notification click:', error);
      handleDismiss();
    }
  };

  const getNotificationRoute = (notification: ConvexNotification): string | null => {
    switch (notification.type) {
      case 'order':
        if (notification.metadata?.orderId) {
          return `/admin/orders?highlight=${notification.metadata.orderId}`;
        }
        return '/admin/orders';

      case 'reservation':
        return '/admin/orders';

      case 'user':
        if (notification.metadata?.userId) {
          return `/admin/users?highlight=${notification.metadata.userId}`;
        }
        return '/admin/users';

      case 'product':
        return '/admin/products';

      case 'payment':
        return '/admin/orders?filter=payment-issues';

      case 'alert':
      case 'warning':
        return '/admin/dashboard';

      default:
        return '/admin/dashboard';
    }
  };

  const getNotificationIcon = (type: string, priority: string) => {
    const iconClass = `w-5 h-5 ${priority === 'urgent' ? 'text-red-400' :
      priority === 'high' ? 'text-orange-400' :
      priority === 'medium' ? 'text-blue-400' : 'text-gray-400'}`;

    switch (type) {
      case 'order':
        return <ShoppingBag className={iconClass} />;
      case 'reservation':
        return <Package className={iconClass} />;
      case 'user':
        return <Users className={iconClass} />;
      case 'payment':
        return <DollarSign className={iconClass} />;
      case 'alert':
      case 'warning':
        return <AlertTriangle className={iconClass} />;
      case 'success':
        return <CheckCircle className={iconClass} />;
      default:
        return <Bell className={iconClass} />;
    }
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-red-500/50 bg-red-950/80 shadow-red-500/20';
      case 'high':
        return 'border-orange-500/50 bg-orange-950/80 shadow-orange-500/20';
      case 'medium':
        return 'border-blue-500/50 bg-blue-950/80 shadow-blue-500/20';
      default:
        return 'border-gray-500/50 bg-gray-950/80 shadow-gray-500/20';
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (!showPopup || !currentNotification || userRole !== 'admin') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] max-w-sm">
      <div
        className={`
          relative bg-secondary/95 backdrop-blur-md border-2 rounded-xl p-4 shadow-2xl
          transform transition-all duration-500 ease-out
          animate-in slide-in-from-top-5 fade-in
          ${getPriorityStyles(currentNotification.priority)}
        `}
      >
        {/* Priority indicator */}
        {currentNotification.priority === 'urgent' && (
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            {getNotificationIcon(currentNotification.type, currentNotification.priority)}
            <div className="flex flex-col">
              <span className="text-xs font-medium text-white/80 uppercase tracking-wide">
                {currentNotification.priority} • {currentNotification.type}
              </span>
              <span className="text-xs text-white/60">
                {formatTimeAgo(currentNotification.createdAt)}
              </span>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-white/60 hover:text-white" />
          </button>
        </div>

        {/* Content */}
        <div
          onClick={handleNotificationClick}
          className="cursor-pointer group"
        >
          <h4 className="font-semibold text-white text-sm mb-1 group-hover:text-primary transition-colors">
            {currentNotification.title}
          </h4>
          <p className="text-white/70 text-sm leading-relaxed mb-3">
            {currentNotification.message}
          </p>

          {/* Metadata */}
          {currentNotification.metadata && (
            <div className="space-y-1 mb-3">
              {currentNotification.metadata.customerName && (
                <div className="flex items-center text-xs text-white/60">
                  <Users className="w-3 h-3 mr-1" />
                  {currentNotification.metadata.customerName}
                </div>
              )}
              {currentNotification.metadata.amount && (
                <div className="flex items-center text-xs text-white/60">
                  <DollarSign className="w-3 h-3 mr-1" />
                  ₱{currentNotification.metadata.amount.toLocaleString()}
                </div>
              )}
              {currentNotification.metadata.productName && (
                <div className="flex items-center text-xs text-white/60">
                  <Package className="w-3 h-3 mr-1" />
                  {currentNotification.metadata.productName}
                </div>
              )}
            </div>
          )}

          {/* Action hint */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Click to view details</span>
            <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-primary transition-colors" />
          </div>
        </div>

        {/* Progress bar for auto-dismiss */}
        {currentNotification.priority !== 'urgent' && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 rounded-b-xl overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-[8000ms] ease-linear"
              style={{ width: showPopup ? '0%' : '100%' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  Bell,
  X,
  AlertCircle,
  CheckCircle,
  Info,
  Clock,
  Package,
  ShoppingBag,
  Users,
  TrendingUp,
  Trash2,
  MoreVertical,
  RefreshCw,
  Calendar,
  CreditCard,
  AlertTriangle
} from 'lucide-react';

interface Notification {
  _id: Id<'notifications'>;
  title: string;
  message: string;
  type: 'reservation' | 'order' | 'user' | 'product' | 'payment' | 'alert' | 'warning' | 'success' | 'system';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  relatedId?: string;
  relatedType?: string;
  metadata?: {
    customerName?: string;
    customerEmail?: string;
    productName?: string;
    amount?: number;
    status?: string;
  };
  createdAt: number;
  updatedAt: number;
}

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatTimeAgo = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const getNotificationIcon = (type: string, priority: string) => {
  switch (type) {
    case 'reservation': return Calendar;
    case 'order': return ShoppingBag;
    case 'user': return Users;
    case 'product': return Package;
    case 'payment': return CreditCard;
    case 'alert': return priority === 'urgent' ? AlertTriangle : AlertCircle;
    case 'warning': return AlertCircle;
    case 'success': return CheckCircle;
    case 'system': return TrendingUp;
    default: return Info;
  }
};

const getNotificationColor = (type: string, priority: string) => {
  switch (type) {
    case 'reservation': return 'text-info';
    case 'order': return 'text-primary';
    case 'user': return 'text-success';
    case 'product': return 'text-warning';
    case 'payment': return 'text-success';
    case 'alert': return priority === 'urgent' ? 'text-error' : 'text-warning';
    case 'warning': return 'text-warning';
    case 'success': return 'text-success';
    case 'system': return 'text-info';
    default: return 'text-muted';
  }
};

const getNotificationBgColor = (type: string, priority: string) => {
  switch (type) {
    case 'reservation': return 'bg-info/10';
    case 'order': return 'bg-primary/10';
    case 'user': return 'bg-success/10';
    case 'product': return 'bg-warning/10';
    case 'payment': return 'bg-success/10';
    case 'alert': return priority === 'urgent' ? 'bg-error/10' : 'bg-warning/10';
    case 'warning': return 'bg-warning/10';
    case 'success': return 'bg-success/10';
    case 'system': return 'bg-info/10';
    default: return 'bg-muted/10';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'text-error';
    case 'high': return 'text-warning';
    case 'medium': return 'text-info';
    case 'low': return 'text-muted';
    default: return 'text-muted';
  }
};

export default function NotificationModal({
  isOpen,
  onClose
}: NotificationModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Fetch notifications and counts from Convex
  const notifications = useQuery(api.services.notifications.getAdminNotifications, { 
    limit: 50,
    onlyUnread: false 
  });
  const notificationCounts = useQuery(api.services.notifications.getNotificationCounts);

  // Mutations for notification management
  const markAsRead = useMutation(api.services.notifications.markAsRead);
  const markAllAsRead = useMutation(api.services.notifications.markAllAsRead);
  const deleteNotification = useMutation(api.services.notifications.deleteNotification);
  const clearAllNotifications = useMutation(api.services.notifications.clearAllNotifications);

  const unreadCount = notificationCounts?.unread || 0;
  
  const handleMarkAsRead = async (id: Id<'notifications'>) => {
    try {
      setIsLoading(true);
      await markAsRead({ notificationId: id });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleMarkAllAsRead = async () => {
    try {
      setIsLoading(true);
      await markAllAsRead({});
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteNotification = async (id: Id<'notifications'>, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsLoading(true);
      await deleteNotification({ notificationId: id });
    } catch (error) {
      console.error('Error deleting notification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAll = async () => {
    try {
      setIsLoading(true);
      await clearAllNotifications({});
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-start justify-center z-50 p-4 pt-20">
        <div className="bg-background border border-primary/20 rounded-xl shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Notifications</h2>
                {unreadCount > 0 && (
                  <p className="text-sm text-muted">{unreadCount} unread</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted" />
            </button>
          </div>

          {/* Actions */}
          {notifications && notifications.length > 0 && (
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-primary hover:text-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={unreadCount === 0 || isLoading}
                >
                  {isLoading ? 'Processing...' : 'Mark all as read'}
                </button>
                <button
                  onClick={handleClearAll}
                  className="text-sm text-error hover:text-error/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : 'Clear all'}
                </button>
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {!notifications ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <RefreshCw className="w-8 h-8 text-primary animate-spin mb-3" />
                <p className="text-foreground font-medium mb-1">Loading notifications...</p>
                <p className="text-sm text-muted">Please wait while we fetch your notifications.</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Bell className="w-12 h-12 text-muted/50 mb-3" />
                <p className="text-foreground font-medium mb-1">No notifications</p>
                <p className="text-sm text-muted">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {notifications.map((notification) => {
                  const IconComponent = getNotificationIcon(notification.type, notification.priority);
                  return (
                    <div
                      key={notification._id}
                      className={`group p-4 hover:bg-white/5 transition-colors cursor-pointer ${
                        !notification.isRead ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => !notification.isRead && handleMarkAsRead(notification._id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${getNotificationBgColor(notification.type, notification.priority)} flex-shrink-0`}>
                          <IconComponent className={`w-4 h-4 ${getNotificationColor(notification.type, notification.priority)}`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-foreground line-clamp-1">
                                {notification.title}
                              </p>
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getPriorityColor(notification.priority)} bg-current/10`}>
                                {notification.priority}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 ml-2">
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                              )}
                              <button
                                onClick={(e) => handleDeleteNotification(notification._id, e)}
                                className="p-1 hover:bg-white/10 rounded hover:opacity-100 opacity-60 transition-all"
                                title="Delete notification"
                                disabled={isLoading}
                              >
                                <Trash2 className="w-3 h-3 text-muted hover:text-error" />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-muted line-clamp-2 mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted">
                              {formatTimeAgo(notification.createdAt)}
                            </p>
                            {notification.metadata?.amount && (
                              <p className="text-xs font-medium text-success">
                                ₱{notification.metadata.amount.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
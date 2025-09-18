'use client';

import React, { useState } from 'react';
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
  MoreVertical
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionType?: 'order' | 'product' | 'user' | 'system';
}

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications?: Notification[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDeleteNotification?: (id: string) => void;
  onClearAll?: () => void;
}

// Mock notifications data
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'success',
    title: 'New Order Received',
    message: 'Order #ORD-001 from John Doe has been placed successfully.',
    timestamp: Date.now() - 300000, // 5 minutes ago
    read: false,
    actionType: 'order'
  },
  {
    id: '2',
    type: 'warning',
    title: 'Low Stock Alert',
    message: 'Premium Goldfish stock is running low (2 remaining).',
    timestamp: Date.now() - 1800000, // 30 minutes ago
    read: false,
    actionType: 'product'
  },
  {
    id: '3',
    type: 'info',
    title: 'New User Registration',
    message: 'Jane Smith has created a new account.',
    timestamp: Date.now() - 3600000, // 1 hour ago
    read: true,
    actionType: 'user'
  },
  {
    id: '4',
    type: 'success',
    title: 'Payment Processed',
    message: 'Payment of ₱2,500 from Order #ORD-002 has been confirmed.',
    timestamp: Date.now() - 7200000, // 2 hours ago
    read: true,
    actionType: 'order'
  },
  {
    id: '5',
    type: 'error',
    title: 'Product Out of Stock',
    message: 'Glass Aquarium Tank is now out of stock.',
    timestamp: Date.now() - 10800000, // 3 hours ago
    read: false,
    actionType: 'product'
  },
  {
    id: '6',
    type: 'info',
    title: 'Daily Sales Report',
    message: 'Your daily sales report is ready for review.',
    timestamp: Date.now() - 86400000, // 1 day ago
    read: true,
    actionType: 'system'
  }
];

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

const getNotificationIcon = (type: string, actionType?: string) => {
  if (actionType) {
    switch (actionType) {
      case 'order': return ShoppingBag;
      case 'product': return Package;
      case 'user': return Users;
      case 'system': return TrendingUp;
    }
  }
  
  switch (type) {
    case 'success': return CheckCircle;
    case 'warning': return AlertCircle;
    case 'error': return AlertCircle;
    case 'info': return Info;
    default: return Info;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'success': return 'text-success';
    case 'warning': return 'text-warning';
    case 'error': return 'text-error';
    case 'info': return 'text-info';
    default: return 'text-muted';
  }
};

const getNotificationBgColor = (type: string) => {
  switch (type) {
    case 'success': return 'bg-success/10';
    case 'warning': return 'bg-warning/10';
    case 'error': return 'bg-error/10';
    case 'info': return 'bg-info/10';
    default: return 'bg-muted/10';
  }
};

export default function NotificationModal({
  isOpen,
  onClose,
  notifications = mockNotifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onClearAll
}: NotificationModalProps) {
  const unreadCount = notifications.filter(n => !n.read).length;
  
  const handleMarkAsRead = (id: string) => {
    if (onMarkAsRead) {
      onMarkAsRead(id);
    }
  };
  
  const handleMarkAllAsRead = () => {
    if (onMarkAllAsRead) {
      onMarkAllAsRead();
    }
  };
  
  const handleDeleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteNotification) {
      onDeleteNotification(id);
    }
  };

  const handleClearAll = () => {
    if (onClearAll) {
      onClearAll();
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
          {notifications.length > 0 && (
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                  disabled={unreadCount === 0}
                >
                  Mark all as read
                </button>
                <button
                  onClick={handleClearAll}
                  className="text-sm text-error hover:text-error/80 transition-colors"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Bell className="w-12 h-12 text-muted/50 mb-3" />
                <p className="text-foreground font-medium mb-1">No notifications</p>
                <p className="text-sm text-muted">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {notifications.map((notification) => {
                  const IconComponent = getNotificationIcon(notification.type, notification.actionType);
                  return (
                    <div
                      key={notification.id}
                      className={`group p-4 hover:bg-white/5 transition-colors cursor-pointer ${
                        !notification.read ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${getNotificationBgColor(notification.type)} flex-shrink-0`}>
                          <IconComponent className={`w-4 h-4 ${getNotificationColor(notification.type)}`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <p className="text-sm font-medium text-foreground line-clamp-1">
                              {notification.title}
                            </p>
                            <div className="flex items-center space-x-2 ml-2">
                              {!notification.read && (
                                <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                              )}
                              <button
                                onClick={(e) => handleDeleteNotification(notification.id, e)}
                                className="p-1 hover:bg-white/10 rounded hover:opacity-100 opacity-60 transition-all"
                                title="Delete notification"
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
                              {formatTimeAgo(notification.timestamp)}
                            </p>
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
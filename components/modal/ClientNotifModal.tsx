'use client';

import React, { useState } from 'react';
import {
  Bell,
  X,
  Gift,
  CheckCircle,
  Info,
  Clock,
  Calendar,
  ShoppingBag,
  Tag,
  Sparkles,
  Trash2,
  Fish,
  Percent,
  CalendarCheck
} from 'lucide-react';

// Real Convex notification type
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
    promoCode?: string;
    discount?: number;
    expiryDate?: number;
  };
  createdAt: number;
  updatedAt: number;
}


interface ClientNotifModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications?: ConvexNotification[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDeleteNotification?: (id: string) => void;
  onClearAll?: () => void;
  onPromoClick?: (promoCode: string) => void;
  onReservationClick?: (reservationId: string) => void;
}

// No mock data - will use real notifications from Convex

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

// Convert Convex notification type to client display type
const getClientNotificationType = (notification: ConvexNotification): 'promotion' | 'reservation' | 'order' | 'info' => {
  if (notification.type === 'system' && notification.relatedType === 'promotion') return 'promotion';
  if (notification.type === 'reservation') return 'reservation';
  if (notification.type === 'order') return 'order';
  return 'info';
};

// Get action type for client notifications
const getClientActionType = (notification: ConvexNotification): string | undefined => {
  if (notification.type === 'system' && notification.relatedType === 'promotion') {
    return notification.metadata?.promoCode ? 'promo' : 'special_offer';
  }
  if (notification.type === 'reservation') {
    if (notification.metadata?.status === 'confirmed') return 'reservation_confirmed';
    return 'reservation_reminder';
  }
  if (notification.type === 'order') {
    return 'order_update';
  }
  return undefined;
};

const getNotificationIcon = (type: string, actionType?: string) => {
  if (actionType) {
    switch (actionType) {
      case 'promo': return Tag;
      case 'special_offer': return Sparkles;
      case 'reservation_confirmed': return CalendarCheck;
      case 'reservation_reminder': return Calendar;
      case 'order_update': return ShoppingBag;
    }
  }
  
  switch (type) {
    case 'promotion': return Gift;
    case 'reservation': return Calendar;
    case 'order': return ShoppingBag;
    case 'info': return Info;
    default: return Info;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'promotion': return 'text-amber-500';
    case 'reservation': return 'text-success';
    case 'order': return 'text-info';
    case 'info': return 'text-muted';
    default: return 'text-muted';
  }
};

const getNotificationBgColor = (type: string) => {
  switch (type) {
    case 'promotion': return 'bg-amber-500/10';
    case 'reservation': return 'bg-success/10';
    case 'order': return 'bg-info/10';
    case 'info': return 'bg-muted/10';
    default: return 'bg-muted/10';
  }
};

export default function ClientNotifModal({
  isOpen,
  onClose,
  notifications = [],
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onClearAll,
  onPromoClick,
  onReservationClick
}: ClientNotifModalProps) {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'promotions' | 'reservations'>('all');

  // Use only real notifications from Convex
  const displayNotifications = notifications || [];

  const filteredNotifications = displayNotifications.filter(n => {
    const clientType = getClientNotificationType(n);
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'promotions') return clientType === 'promotion';
    if (selectedFilter === 'reservations') return clientType === 'reservation';
    return true;
  });

  const unreadCount = filteredNotifications.filter(n => !n.isRead).length;
  const promoCount = displayNotifications.filter(n => getClientNotificationType(n) === 'promotion' && !n.isRead).length;
  const reservationCount = displayNotifications.filter(n => getClientNotificationType(n) === 'reservation' && !n.isRead).length;
  
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

  const handleNotificationClick = (notification: ConvexNotification) => {
    handleMarkAsRead(notification._id);

    if (notification.metadata?.promoCode && onPromoClick) {
      onPromoClick(notification.metadata.promoCode);
    } else if (notification.relatedId && notification.relatedType === 'reservation' && onReservationClick) {
      onReservationClick(notification.relatedId);
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

          {/* Filter Tabs */}
          <div className="flex items-center p-4 space-x-2 border-b border-white/10">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedFilter === 'all' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted hover:text-foreground hover:bg-white/10'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedFilter('promotions')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 ${
                selectedFilter === 'promotions' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted hover:text-foreground hover:bg-white/10'
              }`}
            >
              <Gift className="w-4 h-4" />
              <span>Promotions</span>
              {promoCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-500 text-white rounded-full">
                  {promoCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setSelectedFilter('reservations')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 ${
                selectedFilter === 'reservations' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted hover:text-foreground hover:bg-white/10'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Reservations</span>
              {reservationCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-success text-white rounded-full">
                  {reservationCount}
                </span>
              )}
            </button>
          </div>

          {/* Actions */}
          {filteredNotifications.length > 0 && (
            <div className="px-4 py-2 border-b border-white/10">
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
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Fish className="w-12 h-12 text-muted/50 mb-3" />
                <p className="text-foreground font-medium mb-1">No notifications</p>
                <p className="text-sm text-muted">
                  {selectedFilter === 'promotions' 
                    ? "No promotions at the moment" 
                    : selectedFilter === 'reservations'
                    ? "No reservation updates"
                    : "You're all caught up!"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {filteredNotifications.map((notification) => {
                  const clientType = getClientNotificationType(notification);
                  const actionType = getClientActionType(notification);
                  const IconComponent = getNotificationIcon(clientType, actionType);
                  return (
                    <div
                      key={notification._id}
                      className={`group p-4 hover:bg-white/5 transition-colors cursor-pointer ${
                        !notification.isRead ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${getNotificationBgColor(clientType)} flex-shrink-0`}>
                          <IconComponent className={`w-4 h-4 ${getNotificationColor(clientType)}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <p className="text-sm font-medium text-foreground line-clamp-1">
                              {notification.title}
                            </p>
                            <div className="flex items-center space-x-2 ml-2">
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                              )}
                              <button
                                onClick={(e) => handleDeleteNotification(notification._id, e)}
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

                          {/* Action buttons for promotions and reservations */}
                          {notification.metadata && (
                            <div className="flex items-center justify-between mb-2">
                              {notification.metadata.promoCode && (
                                <div className="flex items-center space-x-2">
                                  <span className="px-2 py-1 bg-amber-500/20 text-amber-500 text-xs font-semibold rounded">
                                    CODE: {notification.metadata.promoCode}
                                  </span>
                                  {notification.metadata.discount && (
                                    <span className="flex items-center text-xs text-amber-500">
                                      <Percent className="w-3 h-3 mr-1" />
                                      {notification.metadata.discount}% OFF
                                    </span>
                                  )}
                                </div>
                              )}
                              {notification.relatedId && notification.relatedType === 'reservation' && (
                                <span className="px-2 py-1 bg-success/20 text-success text-xs font-semibold rounded">
                                  {notification.relatedId}
                                </span>
                              )}
                              {notification.relatedId && notification.relatedType === 'order' && (
                                <span className="px-2 py-1 bg-info/20 text-info text-xs font-semibold rounded">
                                  {notification.relatedId}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted">
                              {formatTimeAgo(notification.createdAt)}
                            </p>
                            {notification.metadata?.expiryDate && (
                              <p className="text-xs text-warning flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                Expires {formatTimeAgo(notification.metadata.expiryDate).replace('ago', 'left')}
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
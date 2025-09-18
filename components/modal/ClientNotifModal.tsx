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

interface ClientNotification {
  id: string;
  type: 'promotion' | 'reservation' | 'order' | 'info';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionType?: 'promo' | 'reservation_confirmed' | 'reservation_reminder' | 'order_update' | 'special_offer';
  actionData?: {
    promoCode?: string;
    discount?: number;
    reservationId?: string;
    orderId?: string;
    expiryDate?: number;
  };
}

interface ClientNotifModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications?: ClientNotification[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDeleteNotification?: (id: string) => void;
  onClearAll?: () => void;
  onPromoClick?: (promoCode: string) => void;
  onReservationClick?: (reservationId: string) => void;
}

// Mock notifications data for client
const mockClientNotifications: ClientNotification[] = [
  {
    id: '1',
    type: 'promotion',
    title: '🎉 Flash Sale Alert!',
    message: '30% off on all Premium Goldfish! Use code GOLD30 at checkout. Valid for 24 hours only!',
    timestamp: Date.now() - 300000, // 5 minutes ago
    read: false,
    actionType: 'promo',
    actionData: {
      promoCode: 'GOLD30',
      discount: 30,
      expiryDate: Date.now() + 86400000 // 24 hours from now
    }
  },
  {
    id: '2',
    type: 'reservation',
    title: 'Reservation Confirmed',
    message: 'Your reservation for Betta Fish (2 items) has been confirmed. Please pick up within 48 hours.',
    timestamp: Date.now() - 1800000, // 30 minutes ago
    read: false,
    actionType: 'reservation_confirmed',
    actionData: {
      reservationId: 'RES-001',
      expiryDate: Date.now() + 172800000 // 48 hours from now
    }
  },
  {
    id: '3',
    type: 'promotion',
    title: 'Weekend Special',
    message: 'Buy 1 Get 1 Free on selected aquarium accessories this weekend only!',
    timestamp: Date.now() - 3600000, // 1 hour ago
    read: false,
    actionType: 'special_offer'
  },
  {
    id: '4',
    type: 'reservation',
    title: 'Reservation Reminder',
    message: 'Your reservation for Glass Aquarium Tank expires tomorrow. Don\'t forget to pick it up!',
    timestamp: Date.now() - 7200000, // 2 hours ago
    read: true,
    actionType: 'reservation_reminder',
    actionData: {
      reservationId: 'RES-002',
      expiryDate: Date.now() + 86400000 // 24 hours from now
    }
  },
  {
    id: '5',
    type: 'order',
    title: 'Order Ready for Pickup',
    message: 'Your order #ORD-123 is ready for pickup at our store.',
    timestamp: Date.now() - 10800000, // 3 hours ago
    read: false,
    actionType: 'order_update',
    actionData: {
      orderId: 'ORD-123'
    }
  },
  {
    id: '6',
    type: 'promotion',
    title: 'New Arrivals!',
    message: 'Check out our latest collection of exotic fish. Limited stock available!',
    timestamp: Date.now() - 86400000, // 1 day ago
    read: true,
    actionType: 'special_offer'
  },
  {
    id: '7',
    type: 'info',
    title: 'Store Holiday Schedule',
    message: 'We\'ll be closed on December 25 & January 1. Happy Holidays!',
    timestamp: Date.now() - 172800000, // 2 days ago
    read: true,
    actionType: undefined
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
  notifications = mockClientNotifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onClearAll,
  onPromoClick,
  onReservationClick
}: ClientNotifModalProps) {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'promotions' | 'reservations'>('all');
  
  const filteredNotifications = notifications.filter(n => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'promotions') return n.type === 'promotion';
    if (selectedFilter === 'reservations') return n.type === 'reservation';
    return true;
  });
  
  const unreadCount = filteredNotifications.filter(n => !n.read).length;
  const promoCount = notifications.filter(n => n.type === 'promotion' && !n.read).length;
  const reservationCount = notifications.filter(n => n.type === 'reservation' && !n.read).length;
  
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

  const handleNotificationClick = (notification: ClientNotification) => {
    handleMarkAsRead(notification.id);
    
    if (notification.actionData?.promoCode && onPromoClick) {
      onPromoClick(notification.actionData.promoCode);
    } else if (notification.actionData?.reservationId && onReservationClick) {
      onReservationClick(notification.actionData.reservationId);
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
                  const IconComponent = getNotificationIcon(notification.type, notification.actionType);
                  return (
                    <div
                      key={notification.id}
                      className={`group p-4 hover:bg-white/5 transition-colors cursor-pointer ${
                        !notification.read ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
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
                          
                          {/* Action buttons for promotions and reservations */}
                          {notification.actionData && (
                            <div className="flex items-center justify-between mb-2">
                              {notification.actionData.promoCode && (
                                <div className="flex items-center space-x-2">
                                  <span className="px-2 py-1 bg-amber-500/20 text-amber-500 text-xs font-semibold rounded">
                                    CODE: {notification.actionData.promoCode}
                                  </span>
                                  {notification.actionData.discount && (
                                    <span className="flex items-center text-xs text-amber-500">
                                      <Percent className="w-3 h-3 mr-1" />
                                      {notification.actionData.discount}% OFF
                                    </span>
                                  )}
                                </div>
                              )}
                              {notification.actionData.reservationId && (
                                <span className="px-2 py-1 bg-success/20 text-success text-xs font-semibold rounded">
                                  {notification.actionData.reservationId}
                                </span>
                              )}
                              {notification.actionData.orderId && (
                                <span className="px-2 py-1 bg-info/20 text-info text-xs font-semibold rounded">
                                  {notification.actionData.orderId}
                                </span>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted">
                              {formatTimeAgo(notification.timestamp)}
                            </p>
                            {notification.actionData?.expiryDate && (
                              <p className="text-xs text-warning flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                Expires {formatTimeAgo(notification.actionData.expiryDate).replace('ago', 'left')}
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
'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  X,
  Gift,
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
import EmptyState from '@/components/dc/kit/EmptyState';

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

/**
 * Member notifications, shown as a right-hand drawer in the Dragon's Cave kit (same pattern as the cart drawer).
 * Unread items are marked by a red icon tile + dot; everything else stays black / grey so the list reads calmly.
 */
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
  const closeRef = useRef<HTMLButtonElement>(null);
  // Parents may pass a new onClose each render; read it through a ref so the effect below only runs on open.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Escape closes; focus starts on the close button so keyboard users land inside the panel.
  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

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

  const tabs: { key: 'all' | 'promotions' | 'reservations'; label: string; icon?: typeof Gift; count?: number }[] = [
    { key: 'all', label: 'All' },
    { key: 'promotions', label: 'Promotions', icon: Gift, count: promoCount },
    { key: 'reservations', label: 'Reservations', icon: Calendar, count: reservationCount },
  ];

  return (
    <div className="dk">
      {/* Backdrop */}
      <button type="button" className="dk-scrim" onClick={onClose} aria-label="Close notifications" tabIndex={-1} />

      {/* Panel */}
      <aside className="dk-drawer dk-notif" role="dialog" aria-modal="true" aria-labelledby="notif-title">
        {/* Header */}
        <div className="dk-drawer-head">
          <div className="dk-row" style={{ gap: 12, minWidth: 0 }}>
            <span className="dk-notif-bell" aria-hidden="true"><Bell size={18} /></span>
            <div style={{ minWidth: 0 }}>
              <h2 id="notif-title" className="dk-h4" style={{ fontSize: 20 }}>Notifications</h2>
              {unreadCount > 0 && <p className="dk-small dk-muted">{unreadCount} unread</p>}
            </div>
          </div>
          <button ref={closeRef} type="button" className="dk-notif-close" onClick={onClose} aria-label="Close notifications">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="dk-notif-tabs" role="tablist" aria-label="Filter notifications">
          {tabs.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selectedFilter === key}
              className="dk-chip"
              onClick={() => setSelectedFilter(key)}
            >
              {Icon && <Icon size={15} aria-hidden="true" />}
              {label}
              {count ? <span className="dk-notif-count">{count}</span> : null}
            </button>
          ))}
        </div>

        {/* Actions */}
        {filteredNotifications.length > 0 && (
          <div className="dk-notif-actions">
            <button type="button" className="dk-btn dk-btn-text" onClick={handleMarkAllAsRead} disabled={unreadCount === 0}>
              Mark all as read
            </button>
            <button type="button" className="dk-btn dk-btn-text dk-notif-clear" onClick={handleClearAll}>
              Clear all
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="dk-drawer-body" style={{ padding: 0 }}>
          {filteredNotifications.length === 0 ? (
            <EmptyState icon={<Fish size={26} />} title="No notifications">
              {selectedFilter === 'promotions'
                ? 'No promotions at the moment'
                : selectedFilter === 'reservations'
                ? 'No reservation updates'
                : "You're all caught up!"}
            </EmptyState>
          ) : (
            <ul className="dk-notif-list">
              {filteredNotifications.map((notification) => {
                const clientType = getClientNotificationType(notification);
                const actionType = getClientActionType(notification);
                const IconComponent = getNotificationIcon(clientType, actionType);
                return (
                  <li key={notification._id}>
                    <div
                      className={`dk-notif-item${notification.isRead ? '' : ' unread'}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleNotificationClick(notification)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleNotificationClick(notification);
                        }
                      }}
                      aria-label={`${notification.isRead ? '' : 'Unread: '}${notification.title}`}
                    >
                      <span className="dk-notif-icon" aria-hidden="true">
                        <IconComponent size={17} />
                      </span>

                      <div className="dk-notif-text">
                        <div className="dk-notif-top">
                          <p className="dk-notif-title">{notification.title}</p>
                          {!notification.isRead && <span className="dk-notif-dot" aria-hidden="true" />}
                        </div>
                        <p className="dk-notif-msg">{notification.message}</p>

                        {/* Promo code, discount and related reference */}
                        {notification.metadata && (notification.metadata.promoCode || notification.relatedId) && (
                          <div className="dk-row wrap" style={{ gap: 6, marginTop: 8 }}>
                            {notification.metadata.promoCode && (
                              <span className="dk-status pale">CODE: {notification.metadata.promoCode}</span>
                            )}
                            {notification.metadata.promoCode && notification.metadata.discount && (
                              <span className="dk-status">
                                <Percent size={12} aria-hidden="true" />
                                {notification.metadata.discount}% OFF
                              </span>
                            )}
                            {notification.relatedId && (notification.relatedType === 'reservation' || notification.relatedType === 'order') && (
                              <span className="dk-status">{notification.relatedId}</span>
                            )}
                          </div>
                        )}

                        <div className="dk-notif-meta">
                          <span>{formatTimeAgo(notification.createdAt)}</span>
                          {notification.metadata?.expiryDate && (
                            <span className="dk-notif-expiry">
                              <Clock size={12} aria-hidden="true" />
                              Expires {formatTimeAgo(notification.metadata.expiryDate).replace('ago', 'left')}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="dk-notif-del"
                        onClick={(e) => handleDeleteNotification(notification._id, e)}
                        aria-label="Delete notification"
                        title="Delete notification"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

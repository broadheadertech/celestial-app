'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAuthStore } from '@/store/auth';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationService } from '@/lib/notifications';
import { Bell, X, Clock, Check, AlertTriangle } from 'lucide-react';

interface NotificationManagerProps {
  className?: string;
}

export const NotificationManager = ({ className }: NotificationManagerProps) => {
  const { user } = useAuthStore();
  const { sendLowStockAlert, sendNewArrival } = useNotifications();

  // Admin notifications
  const adminNotifications = useQuery(api.notifications.getAdminNotifications, { limit: 10 });
  const clientNotifications = useQuery(api.notifications.getClientNotifications, {
    userId: user?._id,
    userEmail: user?.email,
    limit: 10
  });

  const pendingPushNotifications = useQuery(api.notifications.getPendingPushNotifications);

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'admin' | 'client'>('admin');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if we're on mobile
    setIsMobile(Capacitor.isNativePlatform());
  }, []);

  // Auto-process pending push notifications for mobile
  useEffect(() => {
    if (isMobile && pendingPushNotifications && pendingPushNotifications.length > 0) {
      const processNotifications = async () => {
        for (const notification of pendingPushNotifications) {
          try {
            await NotificationService.scheduleFromNotification(notification);
          } catch (error) {
            console.error('Failed to schedule push notification:', error);
          }
        }
      };

      processNotifications();
    }
  }, [pendingPushNotifications, isMobile]);

  const notifications = activeTab === 'admin' ? adminNotifications : clientNotifications;
  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  const handleMarkAsRead = async (notificationId: string) => {
    // This would call a mutation to mark as read
    console.log('Marking notification as read:', notificationId);
  };

  const handleMarkAllAsRead = async () => {
    // This would call a mutation to mark all as read
    console.log('Marking all notifications as read');
  };

  const handleDeleteNotification = async (notificationId: string) => {
    // This would call a mutation to delete the notification
    console.log('Deleting notification:', notificationId);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <Clock className="w-4 h-4 text-blue-400" />;
      case 'reservation':
        return <Bell className="w-4 h-4 text-green-400" />;
      case 'alert':
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'success':
        return <Check className="w-4 h-4 text-green-400" />;
      default:
        return <Bell className="w-4 h-4 text-gray-400" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'order':
        return 'bg-blue-500/10 border-blue-500/20';
      case 'reservation':
        return 'bg-green-500/10 border-green-500/20';
      case 'alert':
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/20';
      case 'success':
        return 'bg-green-500/10 border-green-500/20';
      default:
        return 'bg-gray-500/10 border-gray-500/20';
    }
  };

  // Demo functions for testing
  const handleSendTestAlert = async () => {
    await sendLowStockAlert('test-product-123', 'Test Fish Product', 2);
  };

  const handleSendTestArrival = async () => {
    await sendNewArrival('test-product-456', 'New Test Fish');
  };

  if (!user) return null;

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
      >
        <Bell className="w-5 h-5 text-white" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-96 max-h-96 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">Notifications</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'admin'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => setActiveTab('client')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'client'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Client
            </button>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto max-h-64">
            {notifications?.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No notifications</p>
              </div>
            ) : (
              notifications?.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-4 border-b border-gray-700 ${getNotificationColor(notification.type)} ${
                    !notification.isRead ? 'bg-blue-500/5' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-white truncate">
                          {notification.title}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-400">
                            {new Date(notification.createdAt).toLocaleDateString()}
                          </span>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-300 mt-1">
                        {notification.message}
                      </p>
                      {notification.priority === 'urgent' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 mt-2">
                          Urgent
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer with Actions */}
          <div className="p-4 border-t border-gray-700 space-y-2">
            {isMobile && pendingPushNotifications && pendingPushNotifications.length > 0 && (
              <div className="text-xs text-gray-400">
                {pendingPushNotifications.length} pending push notifications
              </div>
            )}

            {/* Demo Buttons (for testing) */}
            <div className="flex space-x-2">
              <button
                onClick={handleSendTestAlert}
                className="flex-1 px-3 py-1.5 text-xs bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors"
              >
                Test Alert
              </button>
              <button
                onClick={handleSendTestArrival}
                className="flex-1 px-3 py-1.5 text-xs bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
              >
                Test Arrival
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationManager;
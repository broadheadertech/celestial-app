import { useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { NotificationService } from '@/lib/notifications';
import { WebPushService } from '@/lib/webPush';
import { RealtimeService } from '@/lib/realtime';
import { useAuthStore } from '@/store/auth';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

export const useNotifications = () => {
  const { user } = useAuthStore();
  const createNotificationWithPush = useMutation(api.notifications.createNotificationWithPush);
  const schedulePushNotification = useMutation(api.notifications.schedulePushNotification);
  const markPushNotificationSent = useMutation(api.notifications.markPushNotificationSent);
  const cancelPushNotifications = useMutation(api.notifications.cancelPushNotifications);

  useEffect(() => {
    const initializeNotifications = async () => {
      if (Capacitor.isNativePlatform()) {
        // Mobile app - use local notifications
        await NotificationService.initialize();
      } else {
        // Web app - use web push notifications
        await WebPushService.initialize();

        // Also connect to real-time updates
        if (user) {
          RealtimeService.connect(user._id);
        }
      }
    };

    initializeNotifications();

    // Cleanup
    return () => {
      if (!Capacitor.isNativePlatform()) {
        RealtimeService.disconnect();
      }
    };
  }, [user]);

  // Create a notification with push notification support
  const createNotification = useCallback(async (notificationData: {
    title: string;
    message: string;
    type: "reservation" | "order" | "user" | "product" | "payment" | "alert" | "warning" | "success" | "system";
    priority?: "low" | "medium" | "high" | "urgent";
    relatedId?: string;
    relatedType?: string;
    targetUserId?: string;
    targetUserEmail?: string;
    scheduledPushTime?: number;
    pushAction?: string;
    pushData?: {
      reservationId?: string;
      orderId?: string;
      productId?: string;
    };
    metadata?: {
      customerName?: string;
      customerEmail?: string;
      productName?: string;
      amount?: number;
      status?: string;
    };
  }) => {
    const notificationId = await createNotificationWithPush(notificationData);

    // Schedule push notification if we're on mobile
    if (Capacitor.isNativePlatform()) {
      const localNotificationId = await NotificationService.scheduleFromNotification({
        _id: notificationId,
        ...notificationData,
        scheduledPushTime: notificationData.scheduledPushTime || Date.now() + 1000
      });

      // Mark as sent in Convex
      if (localNotificationId) {
        await markPushNotificationSent({ notificationId, localNotificationId });
      }
    }

    return notificationId;
  }, [createNotificationWithPush, markPushNotificationSent]);

  // Schedule reservation reminders (multiple notifications)
  const scheduleReservationReminder = useCallback(async (reservationId: string, pickupDate: Date, customerName: string) => {
    if (Capacitor.isNativePlatform()) {
      const scheduledIds = await NotificationService.scheduleReservationReminder(reservationId, pickupDate, customerName);

      // Create a notification record for each scheduled push notification
      const pickupTime = pickupDate.getTime();
      const reminderTimes = [
        { hours: 48, message: 'in 2 days' },
        { hours: 24, message: 'tomorrow' },
        { hours: 2, message: 'in 2 hours' }
      ];

      for (let i = 0; i < scheduledIds.length; i++) {
        const reminder = reminderTimes[i];
        if (reminder) {
          const scheduledTime = pickupTime - (reminder.hours * 60 * 60 * 1000);
          await createNotification({
            title: '🐠 Reservation Reminder',
            message: `Hi ${customerName}! Your aquarium items are ready for pickup ${reminder.message}.`,
            type: 'reservation',
            priority: 'medium',
            relatedId: reservationId,
            relatedType: 'reservation',
            scheduledPushTime: scheduledTime,
            pushAction: 'view_reservation',
            pushData: { reservationId },
            metadata: { customerName }
          });
        }
      }

      return scheduledIds;
    }
    return [];
  }, [createNotification]);

  // Send order update notification
  const notifyOrderUpdate = useCallback(async (orderId: string, status: string, customerName: string) => {
    if (Capacitor.isNativePlatform()) {
      await NotificationService.scheduleOrderUpdate(orderId, status, customerName);
    } else {
      await WebPushService.showNotification('Order Update', {
        body: `Your order ${orderId} status: ${status}`,
        data: { orderId }
      });
    }

    // Create notification record
    await createNotification({
      title: `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Your order status has been updated to ${status}.`,
      type: 'order',
      priority: status === 'ready' ? 'high' : 'medium',
      relatedId: orderId,
      relatedType: 'order',
      pushAction: 'view_order',
      pushData: { orderId },
      metadata: { customerName, status }
    });
  }, [createNotification]);

  // Schedule daily deals notification
  const scheduleDailyDeals = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      await NotificationService.scheduleDailyDeals();
    }

    // Create a recurring notification record
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    await createNotification({
      title: '🌟 Daily Aquarium Deals',
      message: 'Check out today\'s special offers on fish, tanks, and accessories!',
      type: 'system',
      priority: 'medium',
      relatedType: 'promotion',
      scheduledPushTime: tomorrow.getTime(),
      pushAction: 'view_deals',
      metadata: { status: 'promotion' }
    });
  }, [createNotification]);

  // Cancel all notifications for a specific entity
  const cancelNotifications = useCallback(async (type: string, id: string) => {
    // Cancel in Convex
    await cancelPushNotifications({ relatedType: type, relatedId: id });

    // Cancel local notifications if on mobile
    if (Capacitor.isNativePlatform()) {
      if (type === 'reservation') {
        await NotificationService.cancelReservationNotifications(id);
      } else if (type === 'order') {
        await NotificationService.cancelOrderNotifications(id);
      }
    }
  }, [cancelPushNotifications]);

  // Send immediate notification
  const sendImmediateNotification = useCallback(async (title: string, message: string, type: string, data?: any) => {
    if (Capacitor.isNativePlatform()) {
      await NotificationService.showImmediateNotification(title, message, type, data);
    } else {
      await WebPushService.showNotification(title, {
        body: message,
        data
      });
    }
  }, []);

  // Send low stock alert (for admins)
  const sendLowStockAlert = useCallback(async (productId: string, productName: string, currentStock: number) => {
    if (Capacitor.isNativePlatform()) {
      await NotificationService.scheduleLowStockAlert(productId, productName, currentStock);
    }

    // Create notification record
    await createNotification({
      title: '⚠️ Low Stock Alert',
      message: `${productName} is running low! Only ${currentStock} left.`,
      type: 'alert',
      priority: currentStock <= 1 ? 'urgent' : 'high',
      relatedId: productId,
      relatedType: 'product',
      pushAction: 'view_product',
      pushData: { productId },
      metadata: { productName }
    });
  }, [createNotification]);

  // Send new arrival notification
  const sendNewArrival = useCallback(async (productId: string, productName: string) => {
    if (Capacitor.isNativePlatform()) {
      await NotificationService.scheduleNewArrival(productId, productName);
    }

    // Create notification record
    await createNotification({
      title: '🆕 New Arrival!',
      message: `Check out our latest addition: ${productName}`,
      type: 'product',
      priority: 'medium',
      relatedId: productId,
      relatedType: 'product',
      pushAction: 'view_product',
      pushData: { productId },
      metadata: { productName }
    });
  }, [createNotification]);

  return {
    createNotification,
    scheduleReservationReminder,
    notifyOrderUpdate,
    scheduleDailyDeals,
    cancelNotifications,
    sendImmediateNotification,
    sendLowStockAlert,
    sendNewArrival,
  };
};
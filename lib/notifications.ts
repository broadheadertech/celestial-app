import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

interface PushNotificationData {
  notificationId: string;
  type: string;
  relatedId?: string;
  relatedType?: string;
  action?: string;
  reservationId?: string;
  orderId?: string;
  productId?: string;
}

export class NotificationService {
  private static initialized = false;

  static async initialize() {
    if (!Capacitor.isNativePlatform() || this.initialized) return;

    // Request permission
    const permission = await LocalNotifications.requestPermissions();

    if (permission.display !== 'granted') {
      console.warn('Notification permission denied');
      return false;
    }

    // Listen for notification actions
    LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
      this.handleNotificationAction(notification);
    });

    // Listen for notification received
    LocalNotifications.addListener('localNotificationReceived', (notification) => {
      console.log('Notification received:', notification);
    });

    this.initialized = true;
    return true;
  }

  private static handleNotificationAction(notification: any) {
    console.log('Notification action performed:', notification);

    const { extra } = notification.notification;

    // Handle deep linking based on notification type
    if (extra?.type === 'reservation' && extra?.reservationId) {
      window.location.href = `/client/reservations`;
    } else if (extra?.type === 'order' && extra?.orderId) {
      window.location.href = `/client/orders/${extra.orderId}`;
    } else if (extra?.type === 'product' && extra?.productId) {
      window.location.href = `/client/product-detail?id=${extra.productId}`;
    } else if (extra?.pushAction) {
      // Handle custom push actions
      this.handleCustomAction(extra.pushAction, extra);
    }
  }

  private static handleCustomAction(action: string, data: any) {
    switch (action) {
      case 'view_reservation':
        window.location.href = `/client/reservations`;
        break;
      case 'view_order':
        window.location.href = `/client/orders`;
        break;
      case 'view_deals':
        window.location.href = `/client/categories/deals`;
        break;
      default:
        console.log('Unknown action:', action);
    }
  }

  static async scheduleReservationReminder(reservationId: string, pickupDate: Date, customerName: string) {
    if (!Capacitor.isNativePlatform()) return;

    // Schedule multiple reminders for better user experience
    const reminders = [
      { hours: 48, message: 'in 2 days' },
      { hours: 24, message: 'tomorrow' },
      { hours: 2, message: 'in 2 hours' }
    ];

    const scheduledIds: number[] = [];

    for (const reminder of reminders) {
      const reminderTime = new Date(pickupDate.getTime() - (reminder.hours * 60 * 60 * 1000));

      if (reminderTime <= new Date()) continue; // Skip past notifications

      const uniqueId = parseInt(`${reservationId.slice(-6)}${reminder.hours}`, 16);

      const notification: ScheduleOptions = {
        notifications: [{
          id: uniqueId,
          title: '🐠 Reservation Reminder',
          body: `Hi ${customerName}! Your aquarium items are ready for pickup ${reminder.message}.`,
          schedule: { at: reminderTime },
          actionTypeId: 'reservation',
          extra: {
            reservationId,
            type: 'pickup_reminder',
            pushAction: 'view_reservation',
            scheduledPushTime: reminderTime.getTime()
          }
        }]
      };

      await LocalNotifications.schedule(notification);
      scheduledIds.push(uniqueId);
    }

    return scheduledIds;
  }

  static async scheduleOrderUpdate(orderId: string, status: string, customerName: string) {
    if (!Capacitor.isNativePlatform()) return;

    const statusMessages = {
      'confirmed': '✅ Your order has been confirmed and is being prepared!',
      'processing': '🔄 Your order is being processed and will ship soon!',
      'shipped': '🚚 Your order has shipped and is on the way!',
      'delivered': '📦 Your order has been delivered! Enjoy your aquatic treasures!',
      'ready': '🎉 Your order is ready for pickup!',
      'cancelled': '❌ Your order has been cancelled.'
    };

    const notification: ScheduleOptions = {
      notifications: [{
        id: parseInt(orderId.slice(-6), 16),
        title: 'Order Update',
        body: statusMessages[status as keyof typeof statusMessages] || 'Your order status has been updated.',
        schedule: { at: new Date(Date.now() + 1000) }, // Immediate
        actionTypeId: 'order',
        extra: {
          orderId,
          status,
          type: 'order_update',
          pushAction: 'view_order',
          scheduledPushTime: Date.now() + 1000
        }
      }]
    };

    await LocalNotifications.schedule(notification);
  }

  static async scheduleDailyDeals() {
    if (!Capacitor.isNativePlatform()) return;

    // Schedule daily at 9 AM
    const notification: ScheduleOptions = {
      notifications: [{
        id: 999999,
        title: '🌟 Daily Aquarium Deals',
        body: 'Check out today\'s special offers on fish, tanks, and accessories!',
        schedule: {
          on: {
            hour: 9,
            minute: 0
          },
          every: 'day'
        },
        actionTypeId: 'deals',
        extra: {
          type: 'daily_deals',
          pushAction: 'view_deals'
        }
      }]
    };

    await LocalNotifications.schedule(notification);
  }

  // Schedule notification from Convex notification data
  static async scheduleFromNotification(notification: any) {
    if (!Capacitor.isNativePlatform()) return;

    const { _id, title, message, type, priority, relatedId, relatedType, metadata } = notification;

    // Generate unique ID for this notification
    const notificationId = parseInt(_id.slice(-6), 16) || Date.now();

    const scheduleTime = metadata?.pushScheduledAt ? new Date(metadata.pushScheduledAt) : new Date(Date.now() + 1000);

    const notificationOptions: ScheduleOptions = {
      notifications: [{
        id: notificationId,
        title,
        body: message,
        schedule: { at: scheduleTime },
        actionTypeId: type,
        extra: {
          notificationId: _id,
          type,
          relatedId,
          relatedType,
          pushAction: metadata?.pushAction,
          scheduledPushTime: scheduleTime.getTime(),
          ...metadata?.pushData
        }
      }]
    };

    await LocalNotifications.schedule(notificationOptions);

    // Update the notification in Convex to mark as scheduled
    return notificationId;
  }

  // Cancel specific notification
  static async cancelNotificationByType(type: string, relatedId?: string) {
    if (!Capacitor.isNativePlatform()) return;

    const pending = await this.getPendingNotifications();

    for (const notification of pending) {
      if (notification.extra?.type === type &&
          (!relatedId || notification.extra?.relatedId === relatedId)) {
        await this.cancelNotification(notification.id);
      }
    }
  }

  // Cancel all reservation notifications for a specific reservation
  static async cancelReservationNotifications(reservationId: string) {
    await this.cancelNotificationByType('reservation', reservationId);
  }

  // Cancel all order notifications for a specific order
  static async cancelOrderNotifications(orderId: string) {
    await this.cancelNotificationByType('order', orderId);
  }

  // Show immediate notification (not scheduled)
  static async showImmediateNotification(title: string, message: string, type: string, data?: any) {
    if (!Capacitor.isNativePlatform()) return;

    const notificationId = Date.now();

    const notification: ScheduleOptions = {
      notifications: [{
        id: notificationId,
        title,
        body: message,
        schedule: { at: new Date(Date.now() + 1000) },
        actionTypeId: type,
        extra: {
          type,
          scheduledPushTime: Date.now() + 1000,
          ...data
        }
      }]
    };

    await LocalNotifications.schedule(notification);
    return notificationId;
  }

  // Schedule low stock alert for admins
  static async scheduleLowStockAlert(productId: string, productName: string, currentStock: number) {
    if (!Capacitor.isNativePlatform()) return;

    const notificationId = parseInt(`stock${productId.slice(-6)}`, 16);

    const notification: ScheduleOptions = {
      notifications: [{
        id: notificationId,
        title: '⚠️ Low Stock Alert',
        body: `${productName} is running low! Only ${currentStock} left.`,
        schedule: { at: new Date(Date.now() + 1000) },
        actionTypeId: 'alert',
        extra: {
          type: 'low_stock',
          productId,
          pushAction: 'view_product'
        }
      }]
    };

    await LocalNotifications.schedule(notification);
    return notificationId;
  }

  // Schedule new arrival notification
  static async scheduleNewArrival(productId: string, productName: string) {
    if (!Capacitor.isNativePlatform()) return;

    const notificationId = parseInt(`new${productId.slice(-6)}`, 16);

    const notification: ScheduleOptions = {
      notifications: [{
        id: notificationId,
        title: '🆕 New Arrival!',
        body: `Check out our latest addition: ${productName}`,
        schedule: { at: new Date(Date.now() + 1000) },
        actionTypeId: 'product',
        extra: {
          type: 'new_arrival',
          productId,
          pushAction: 'view_product'
        }
      }]
    };

    await LocalNotifications.schedule(notification);
    return notificationId;
  }

  static async cancelNotification(id: number) {
    if (!Capacitor.isNativePlatform()) return;

    await LocalNotifications.cancel({
      notifications: [{ id }]
    });
  }

  static async cancelAllNotifications() {
    if (!Capacitor.isNativePlatform()) return;

    await LocalNotifications.cancelAll();
  }

  static async getPendingNotifications() {
    if (!Capacitor.isNativePlatform()) return [];

    const pending = await LocalNotifications.getPending();
    return pending.notifications;
  }
}
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export interface NotificationOptions {
  title: string;
  body: string;
  id?: number;
  data?: any;
}

class LocalNotificationService {
  private isNative = Capacitor.isNativePlatform();
  private hasPermission = false;
  private notificationId = 1;

  async initialize() {
    if (!this.isNative) return;

    try {
      const permission = await LocalNotifications.checkPermissions();

      if (permission.display === 'granted') {
        this.hasPermission = true;
      } else if (permission.display === 'prompt') {
        const result = await LocalNotifications.requestPermissions();
        this.hasPermission = result.display === 'granted';
      }
    } catch (error) {
      console.warn('Error checking notification permissions:', error);
    }
  }

  async showNotification({ title, body, id, data }: NotificationOptions) {
    if (!this.isNative || !this.hasPermission) {
      return;
    }

    try {
      const notificationId = id || this.notificationId++;

      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: notificationId,
            schedule: { at: new Date(Date.now() + 1000) }, // Show after 1 second
            sound: undefined,
            attachments: undefined,
            actionTypeId: '',
            extra: data || {},
          },
        ],
      });
    } catch (error) {
      console.warn('Error showing notification:', error);
    }
  }

  async cancelAll() {
    if (!this.isNative) return;

    try {
      await LocalNotifications.cancel({ notifications: [] });
    } catch (error) {
      console.warn('Error canceling notifications:', error);
    }
  }

  getNotificationId() {
    return this.notificationId++;
  }

  isAvailable() {
    return this.isNative && this.hasPermission;
  }
}

export const localNotificationService = new LocalNotificationService();

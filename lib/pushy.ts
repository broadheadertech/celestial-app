/**
 * Pushy Push Notification Service
 * 
 * This module handles device registration and push notification
 * setup for the mobile app using Pushy.me service.
 * 
 * Note: This only works on native devices (Android/iOS), not in web browsers.
 */

import { Capacitor } from '@capacitor/core';

declare const Pushy: any;

export interface PushyConfig {
  apiKey: string;
}

export interface NotificationData {
  title: string;
  message: string;
  type?: string;
  reservationId?: string;
  orderId?: string;
  productId?: string;
  [key: string]: any;
}

class PushyService {
  private static instance: PushyService;
  private deviceToken: string | null = null;
  private isRegistered: boolean = false;
  private config: PushyConfig;

  private constructor() {
    // Pushy Configuration
    // App ID: 68e49c28b7e2f9df7184b4c8 (configured in AndroidManifest.xml)
    // API Key: Used for backend push sending in Convex
    this.config = {
      apiKey: 'f4a6c89a619917af76528e00923ab5c8943791d16cf3c387d97137147e4727b9',
    };
  }

  public static getInstance(): PushyService {
    if (!PushyService.instance) {
      PushyService.instance = new PushyService();
    }
    return PushyService.instance;
  }

  /**
   * Check if we're running on a native platform (Android/iOS)
   */
  private isPlatformAvailable(): boolean {
    const platform = Capacitor.getPlatform();
    const isNative = platform === 'android' || platform === 'ios';
    
    if (!isNative) {
      console.log('Platform:', platform, '- Push notifications only available on Android/iOS');
      return false;
    }

    if (typeof Pushy === 'undefined') {
      console.warn('Pushy SDK not loaded on native platform');
      return false;
    }

    return true;
  }

  /**
   * Initialize Pushy and start listening for notifications
   */
  public async initialize(): Promise<void> {
    if (!this.isPlatformAvailable()) {
      console.log('Push notifications not available on this platform');
      return;
    }

    try {
      console.log('Initializing Pushy on native device...');
      
      // Start listening for push notifications
      Pushy.listen();

      // Set custom notification icon for Android
      try {
        Pushy.setNotificationIcon('ic_notification');
        console.log('Notification icon set successfully');
      } catch (iconError) {
        console.warn('Could not set notification icon:', iconError);
      }

      // Enable in-app notification banners (iOS 10+)
      Pushy.toggleInAppBanner(true);

      console.log('✅ Pushy initialized successfully');
    } catch (error) {
      console.error('Error initializing Pushy:', error);
    }
  }

  /**
   * Register device for push notifications
   */
  public async register(): Promise<string | null> {
    if (!this.isPlatformAvailable()) {
      console.log('Cannot register: platform not available');
      return null;
    }

    return new Promise((resolve, reject) => {
      try {
        console.log('Registering device with Pushy...');
        Pushy.register((err: any, deviceToken: string) => {
          if (err) {
            console.error('❌ Pushy registration error:', err);
            reject(err);
            return;
          }

          this.deviceToken = deviceToken;
          this.isRegistered = true;
          console.log('✅ Pushy device token:', deviceToken);
          resolve(deviceToken);
        });
      } catch (error) {
        console.error('Error registering device:', error);
        reject(error);
      }
    });
  }

  /**
   * Get the current device token
   */
  public getDeviceToken(): string | null {
    return this.deviceToken;
  }

  /**
   * Check if device is registered
   */
  public checkRegistrationStatus(): Promise<boolean> {
    if (!this.isPlatformAvailable()) {
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      Pushy.isRegistered((isRegistered: boolean) => {
        this.isRegistered = isRegistered;
        console.log('Device registration status:', isRegistered);
        resolve(isRegistered);
      });
    });
  }

  /**
   * Set notification listener for foreground notifications
   */
  public setNotificationListener(callback: (data: NotificationData) => void): void {
    if (!this.isPlatformAvailable()) {
      return;
    }

    Pushy.setNotificationListener((data: NotificationData) => {
      console.log('📱 Received notification:', data);
      callback(data);

      // Clear iOS app badge
      try {
        Pushy.clearBadge();
      } catch (e) {
        // Ignore badge errors on Android
      }
    });
  }

  /**
   * Set notification click listener
   */
  public setNotificationClickListener(callback: (data: NotificationData) => void): void {
    if (!this.isPlatformAvailable()) {
      return;
    }

    Pushy.setNotificationClickListener((data: NotificationData) => {
      console.log('👆 Notification clicked:', data);
      callback(data);
    });
  }

  /**
   * Subscribe to a topic
   */
  public async subscribeToTopic(topic: string): Promise<void> {
    if (!this.isPlatformAvailable()) {
      console.log(`Cannot subscribe to topic ${topic}: platform not available`);
      return;
    }

    const isRegistered = await this.checkRegistrationStatus();
    if (!isRegistered) {
      console.warn('Device not registered, cannot subscribe to topic');
      return;
    }

    return new Promise((resolve, reject) => {
      Pushy.subscribe(topic, (err: any) => {
        if (err) {
          console.error(`❌ Error subscribing to topic ${topic}:`, err);
          reject(err);
          return;
        }
        console.log(`✅ Subscribed to topic: ${topic}`);
        resolve();
      });
    });
  }

  /**
   * Unsubscribe from a topic
   */
  public async unsubscribeFromTopic(topic: string): Promise<void> {
    if (!this.isPlatformAvailable()) {
      return;
    }

    return new Promise((resolve, reject) => {
      Pushy.unsubscribe(topic, (err: any) => {
        if (err) {
          console.error(`Error unsubscribing from topic ${topic}:`, err);
          reject(err);
          return;
        }
        console.log(`Unsubscribed from topic: ${topic}`);
        resolve();
      });
    });
  }

  /**
   * Clear app badge (iOS)
   */
  public clearBadge(): void {
    if (typeof Pushy === 'undefined') {
      return;
    }

    Pushy.clearBadge();
  }
}

// Export singleton instance
export const pushyService = PushyService.getInstance();

// Helper function to send push notification via backend API
export async function sendPushNotification(
  deviceToken: string,
  data: NotificationData
): Promise<void> {
  try {
    const response = await fetch('https://api.pushy.me/push?api_key=f4a6c89a619917af76528e00923ab5c8943791d16cf3c387d97137147e4727b9', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: deviceToken,
        data: data,
        notification: {
          badge: 1,
          sound: 'default',
          body: data.message,
          title: data.title,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send push notification: ${response.statusText}`);
    }

    console.log('Push notification sent successfully');
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}

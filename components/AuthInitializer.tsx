"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { pushyService } from "@/lib/pushy";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";

export function AuthInitializer() {
  const { initializeGuestSession, user } = useAuthStore();
  const [pushInitialized, setPushInitialized] = useState(false);
  const savePushToken = useMutation(api.services.pushNotifications.savePushToken);
  const router = useRouter();

  // Initialize guest session if no user is logged in
  useEffect(() => {
    if (!user) {
      initializeGuestSession();
    }
  }, [user, initializeGuestSession]);

  // Initialize push notifications
  useEffect(() => {
    if (pushInitialized) return;

    const initializePush = async () => {
      try {
        // Check if we're on a native platform
        const platform = Capacitor.getPlatform();
        const isNative = platform === 'android' || platform === 'ios';
        
        if (!isNative) {
          console.log(`Platform: ${platform} - Push notifications only available on native devices`);
          setPushInitialized(true);
          return;
        }

        console.log(`✅ Platform: ${platform} detected - Initializing push notifications`);

        // Wait a bit for Pushy SDK to load
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Initialize Pushy
        await pushyService.initialize();

        // Always try to register (Pushy handles already-registered case internally)
        console.log("📱 Registering device for push notifications...");
        const deviceToken = await pushyService.register();
        
        if (!deviceToken) {
          console.warn("❌ Failed to register device - no token received");
          console.warn("   Make sure AndroidManifest.xml has all Pushy configurations");
          setPushInitialized(true);
          return;
        }

        console.log("✅ Device registered successfully");
        console.log(`   Token: ${deviceToken.substring(0, 20)}...`);

        // Save token to Convex if user is logged in
        if (user && deviceToken) {
          console.log(`💾 Saving push token for user: ${user.email}`);
          await savePushToken({
            userId: user._id,
            pushToken: deviceToken,
          });
          console.log("✅ Push token saved to database");
        } else if (!user && deviceToken) {
          console.log("ℹ️  Push token generated but user not logged in yet");
          console.log("   Token will be saved when user logs in");
        }

        // Subscribe to topic based on user role
        if (user) {
          if (user.role === "admin" || user.role === "super_admin") {
            await pushyService.subscribeToTopic("admins");
          } else {
            await pushyService.subscribeToTopic("clients");
          }
        }

        // Set up notification listeners
        pushyService.setNotificationListener((data) => {
          console.log("📱 Foreground notification received");
          // Handle foreground notification
          // You can show a toast or custom UI here
        });

        pushyService.setNotificationClickListener((data) => {
          console.log("👆 Notification tapped - handling navigation");
          // Handle notification tap
          if (data.action === "view_reservation" && data.reservationId) {
            if (user?.role === "admin" || user?.role === "super_admin") {
              router.push(`/admin/reservation-detail?id=${data.reservationId}`);
            } else {
              router.push(`/client/reservations`);
            }
          }
        });

        console.log("✅ Push notification setup complete");
        setPushInitialized(true);
      } catch (error) {
        console.error("❌ Error initializing push notifications:", error);
        // Don't block app if push fails
        setPushInitialized(true);
      }
    };

    initializePush();
  }, [user, pushInitialized, savePushToken, router]);

  // Update push token when user logs in
  useEffect(() => {
    if (!user) {
      console.log("👤 No user logged in, skipping push token update");
      return;
    }

    console.log("=== PUSH TOKEN UPDATE TRIGGERED ===");
    console.log(`👤 User: ${user.email} (ID: ${user._id})`);
    console.log(`📱 Platform: ${Capacitor.getPlatform()}`);

    const updatePushToken = async () => {
      try {
        // Wait for push token to be available (with retries)
        let token = pushyService.getDeviceToken();
        let retries = 0;
        const maxRetries = 10;

        console.log(`🔍 Initial token check: ${token ? token.substring(0, 20) + '...' : 'null'}`);

        // If token not available yet, wait and retry
        while (!token && retries < maxRetries) {
          console.log(`⏳ Waiting for push token... (attempt ${retries + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 500));
          token = pushyService.getDeviceToken();
          retries++;
        }

        if (!token) {
          console.warn("❌ Push token not available after login. Will retry on next app launch.");
          console.warn("   Check if Pushy SDK is properly initialized");
          return;
        }

        console.log(`✅ Token available: ${token.substring(0, 20)}...`);
        console.log(`💾 Calling savePushToken mutation...`);
        console.log(`   userId: ${user._id}`);
        console.log(`   pushToken: ${token.substring(0, 20)}...`);
        
        const result = await savePushToken({
          userId: user._id,
          pushToken: token,
        });
        
        console.log("✅ savePushToken mutation completed:", result);
        console.log("✅ Push token saved to database");

        // Subscribe to appropriate topic
        const topic = (user.role === "admin" || user.role === "super_admin") ? "admins" : "clients";
        console.log(`📢 Subscribing to topic: ${topic}`);
        
        if (user.role === "admin" || user.role === "super_admin") {
          await pushyService.subscribeToTopic("admins");
        } else {
          await pushyService.subscribeToTopic("clients");
        }
        
        console.log("=== PUSH TOKEN UPDATE COMPLETE ===");
      } catch (error) {
        console.error("❌ Error updating push token:", error);
        console.error("   Error details:", JSON.stringify(error, null, 2));
        if (error instanceof Error) {
          console.error("   Error message:", error.message);
          console.error("   Error stack:", error.stack);
        }
      }
    };

    updatePushToken();
  }, [user, savePushToken]);

  return null; // This component doesn't render anything
}

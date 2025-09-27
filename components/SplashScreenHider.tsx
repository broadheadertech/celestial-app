'use client';

import { useEffect } from 'react';

export function SplashScreenHider() {
  useEffect(() => {
    // Hide splash screen immediately when component mounts
    const hideSplashScreen = async () => {
      try {
        // Check if we're in a Capacitor environment
        if (typeof window !== 'undefined' && (window as any).Capacitor) {
          const { SplashScreen } = await import('@capacitor/splash-screen');
          await SplashScreen.hide();
        }
      } catch (error) {
        // Silently fail if SplashScreen is not available
        console.log('SplashScreen not available or already hidden');
      }
    };

    hideSplashScreen();
  }, []);

  // This component doesn't render anything
  return null;
}

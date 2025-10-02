import type { CapacitorConfig } from '@capacitor/cli';

// Production configuration - APK points to deployed server
const config: CapacitorConfig = {
  appId: 'com.celestial.app',
  appName: 'CelestialApp',
  webDir: 'public',
  server: {
    androidScheme: 'https',
    // Replace with your production server URL
    url: 'https://your-production-domain.com',
    cleartext: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#121212",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: "launch_screen",
      useDialog: true
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#121212'
    }
  }
};

export default config;

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dragoncave.inventory',
  appName: 'Dragon Cave Inventory',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    // Enable fallback to index.html for client-side routing
    iosScheme: 'capacitor',
    hostname: 'localhost'
  },
  android: {
    icon: 'app-icons/icon.png'
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

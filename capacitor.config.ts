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
  // Android launcher icons aren't set here (CapacitorConfig has no `android.icon`); they live in
  // android/app/src/main/res/mipmap-* (generate them from app-icons/icon.png, e.g. with @capacitor/assets).
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

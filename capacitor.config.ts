import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.celestial.app',
  appName: 'CelestialApp',
  webDir: 'public', // Minimal directory for Capacitor (not used when server.url is set)
  server: {
    androidScheme: 'https',
    url: 'http://10.0.2.2:3000', // Development server (10.0.2.2 is Android emulator's host machine)
    cleartext: true
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

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.celestial.app",
  appName: "CelestialApp",
  webDir: "out",
  bundledWebRuntime: false,
  icon: "public/logo.jpeg",
  server: {
    // Remove server URL for static deployment
    allowNavigation: ["*"]
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#FF6B00",
      sound: "default",
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: "#0f172a",
      style: "LIGHT",
    },
    SafeArea: {
      enabled: true,
    },
  },
  android: {
    allowMixedContent: true,
  },
  cordova: {
    preferences: {
      AllowInlineMediaPlayback: "true",
      MediaPlaybackRequiresUserAction: "false",
      AllowNavigation: "*",
      AllowIntents: "*",
      Hostname: "localhost",
    },
  },
};

export default config;

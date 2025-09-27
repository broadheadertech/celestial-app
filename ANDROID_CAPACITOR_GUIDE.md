# Celestial Drakon Aquatics - Android Capacitor Integration Guide

## Overview

This document provides comprehensive documentation for the updated Capacitor Android integration in the Celestial Drakon Aquatics application. The app uses Capacitor 7.4.3 to wrap the Next.js web application as a native Android app with enhanced notification capabilities.

## Technology Stack

- **Capacitor Version**: 7.4.3
- **Android SDK**: API 35 (Android 15)
- **Minimum SDK**: API 23 (Android 6.0)
- **Target SDK**: API 35 (Android 15)
- **Build Tool**: Gradle 8.0
- **Web Framework**: Next.js 15.5.3 with React 19.1.0
- **Notification System**: Enhanced push & local notifications

## Key Features & Enhancements

### 🚀 New Capacitor Configuration

The configuration has been enhanced with:
- **Notification Plugins**: Push notifications, local notifications, toast
- **UI Plugins**: Splash screen, status bar, haptics, dialog
- **System Plugins**: App lifecycle, device info, network status
- **Enhanced WebView**: Better performance and debugging capabilities

### 📱 Enhanced Android Manifest

- **Comprehensive Permissions**: Internet, notifications, storage, location, camera
- **Deep Linking Support**: `celestialapp://` scheme for app navigation
- **Security Features**: Network security config, proper backup settings
- **Performance**: Hardware acceleration, optimized config changes

### 🔔 Advanced Notification System

- **Local Notifications**: Scheduled reminders, alerts, and system notifications
- **Push Notifications**: Ready for Firebase integration
- **Toast Messages**: User-friendly feedback system
- **Status Bar**: Custom dark theme matching app design

## Available Commands

### Development Commands
```bash
# Development server
npm run dev

# Build web application
npm run build

# Android Development
npm run android:dev        # Run on connected device/emulator
npm run android:sync       # Sync web assets with Android
npm run android:open       # Open in Android Studio
npm run android:clean      # Clean Android build files
```

### Build Commands
```bash
# Debug APK (for testing)
npm run android:build      # Build debug APK

# Release APK (for production)
npm run android:release    # Build release APK/AAB

# Capacitor CLI commands
npm run cap:add            # Add Android platform
npm run cap:sync           # Sync with Android project
npm run cap:run            # Run on device
npm run cap:open           # Open Android Studio
```

## Project Structure

```
celestial-app/
├── android/                    # Android native project
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml     # Enhanced manifest
│   │   │   ├── java/com/celestial/app/
│   │   │   │   ├── MainActivity.java   # Main activity
│   │   │   │   └── MainApplication.java # Application class
│   │   │   └── res/                    # App resources
│   │   └── build.gradle                # App-level build config
│   └── variables.gradle              # SDK versions
├── capacitor.config.ts         # Enhanced Capacitor config
├── package.json                # Updated scripts and dependencies
└── ANDROID_CAPACITOR_GUIDE.md # This documentation
```

## Installation & Setup

### Prerequisites

1. **Android Studio**: Latest version with SDK 35
2. **Java Development Kit (JDK)**: Version 17 or higher
3. **Android SDK**: API 35 installed
4. **Node.js**: Version 18 or higher
5. **Gradle**: Version 8.0 or higher

### Initial Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Add Android Platform** (if not already added):
   ```bash
   npm run cap:add
   ```

3. **Install Additional Plugins** (if needed):
   ```bash
   npm install @capacitor/keyboard @capacitor/clipboard
   npx cap sync
   ```

## Development Workflow

### 1. Web Development
```bash
npm run dev                    # Start Next.js development server
```

### 2. Android Development
```bash
npm run android:dev           # Build and run on Android device
```

### 3. Android Studio Integration
```bash
npm run android:open          # Open project in Android Studio
```

### 4. Building for Testing
```bash
npm run android:build         # Build debug APK
```

### 5. Building for Production
```bash
npm run android:release       # Build release APK/AAB
```

## Configuration Details

### Capacitor Configuration (`capacitor.config.ts`)

Key enhancements:
- **Plugin Configuration**: Push notifications, local notifications, splash screen
- **Android Settings**: WebView debugging, mixed content, input capture
- **iOS Settings**: Future-ready configuration
- **Theme Support**: Dark theme with brand colors (#FF6B00)

### Android Manifest (`android/app/src/main/AndroidManifest.xml`)

New features:
- **Notification Permissions**: POST_NOTIFICATIONS, VIBRATE, WAKE_LOCK
- **Storage Permissions**: For file downloads and uploads
- **Camera Permissions**: For future photo features
- **Location Permissions**: For store locator features
- **Deep Linking**: Custom URL scheme support
- **Security**: Network security configuration

### Build Scripts (`package.json`)

Enhanced scripts:
- **android:build**: Complete build pipeline
- **android:release**: Production builds
- **android:sync**: Asset synchronization
- **android:clean**: Build cleanup
- **cap:***: Direct Capacitor CLI access

## APK Locations

### Debug APK
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Release APK
```
android/app/build/outputs/apk/release/app-release.apk
```

### Android App Bundle (AAB)
```
android/app/build/outputs/bundle/release/app-release.aab
```

## Device Setup

### Physical Device
1. Enable Developer Options
2. Enable USB Debugging
3. Connect device via USB
4. Trust computer on device
5. Run app:
   ```bash
   npm run android:dev
   ```

### Android Emulator
1. Create emulator in Android Studio
2. Start emulator
3. Run app:
   ```bash
   npm run android:dev
   ```

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clean build
npm run android:clean
npm run android:build

# Check Java version
java -version
```

#### Sync Issues
```bash
# Remove and re-add platform
rm -rf android
npm run cap:add
npm run cap:sync
```

#### Plugin Issues
```bash
# Reinstall plugins
npm install
npx cap sync android
```

#### WebView Issues
- Clear app data on device
- Check JavaScript settings
- Verify internet permissions

### Debugging Tools

#### Android Studio
- **Logcat**: View native logs
- **Layout Inspector**: Debug UI layouts
- **Profiler**: Performance monitoring
- **Debugger**: Native code debugging

#### Chrome DevTools
- **Remote Debugging**: `chrome://inspect/#devices`
- **Console**: JavaScript errors
- **Network**: API call debugging
- **Elements**: DOM inspection

## Performance Optimization

### Build Optimization
- Enable ProGuard for release builds
- Use App Bundle instead of APK
- Implement code splitting (already configured in Next.js)

### Runtime Optimization
- Hardware acceleration enabled
- Optimized WebView settings
- Proper caching strategies

## Security Considerations

### App Security
- HTTPS enforced for API calls (when available)
- Network security configuration
- Proper permission management

### WebView Security
- Secure native bridge
- Content Security Policy ready
- Proper same-origin policy

### Permissions
- Only essential permissions requested
- Runtime permission handling
- Privacy policy compliance

## Deployment

### Google Play Store
1. Create Developer Account
2. Generate signing key
3. Build App Bundle:
   ```bash
   npm run android:release
   ```
4. Upload to Play Console
5. Complete store listing
6. Submit for review

### Beta Testing
1. **Internal Testing**: Team members
2. **Closed Testing**: Limited user group
3. **Open Testing**: Public beta program

## Maintenance

### Dependencies
- Regular updates with `npm update`
- Security patches prompt application
- Compatibility testing with new Android versions

### Monitoring
- Crash reporting integration point
- Performance monitoring recommendations
- User feedback collection system

### Updates
1. Increment version in `android/app/build.gradle`
2. Update version in `package.json`
3. Follow build process
4. Upload to distribution platform

## Future Enhancements

### Planned Features
- **Firebase Integration**: Push notifications, analytics
- **Camera Integration**: Product photography
- **Location Services**: Store finder
- **Biometric Authentication**: Secure login
- **Offline Support**: PWA features

### Plugin Recommendations
```bash
# Future plugin installations
npm install @capacitor/keyboard
npm install @capacitor/clipboard
npm install @capacitor/share
npm install @capacitor/browser
npm install @capacitor/geolocation
npx cap sync
```

---

## Support

For issues and questions:
1. Check this documentation
2. Review Capacitor official docs
3. Consult Android Studio logs
4. Test on multiple devices

**Last Updated**: September 2024
**Version**: 1.0.0
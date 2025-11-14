# Android Capacitor Integration Guide

## Overview

This document provides comprehensive documentation for the Capacitor Android integration in the Kinecoin cryptocurrency trading application. The app uses Capacitor 7.4.3 to wrap the React web application as a native Android app.

## Technology Stack

- **Capacitor Version**: 7.4.3
- **Android SDK**: API 35 (Android 15)
- **Minimum SDK**: API 23 (Android 6.0)
- **Target SDK**: API 35 (Android 15)
- **Build Tool**: Gradle
- **Web Framework**: React 18.3.1 with Vite

## Project Structure

```
android/
├── app/
│   ├── build.gradle                    # App-level build configuration
│   ├── src/
│   │   ├── main/
│   │   │   ├── AndroidManifest.xml     # App manifest
│   │   │   ├── java/com/kinecoin/web/
│   │   │   │   ├── MainActivity.java   # Main activity
│   │   │   │   └── MainApplication.java # Application class
│   │   │   └── res/                    # App resources
│   │   └── ...
│   └── ...
├── build.gradle                        # Project-level build configuration
├── capacitor.settings.gradle          # Capacitor settings
├── gradle.properties                   # Gradle properties
├── gradlew                             # Gradle wrapper (Unix)
├── gradlew.bat                         # Gradle wrapper (Windows)
└── variables.gradle                    # Version variables
```

## Configuration

### Capacitor Configuration (`capacitor.config.json`)

```json
{
  "appId": "com.kinecoin.web",
  "appName": "Kinecoin",
  "webDir": "dist",
  "icon": "assets/appstore/icon.png"
}
```

### Android Manifest Configuration

Key features in `AndroidManifest.xml`:

- **Package Name**: `com.kinecoin.web`
- **Launch Mode**: `singleTask` for proper navigation handling
- **Config Changes**: Handles orientation, keyboard, and screen size changes
- **Internet Permission**: Required for API calls and real-time data
- **File Provider**: For file sharing and downloads

### Gradle Configuration

#### App Level (`android/app/build.gradle`)
- **Namespace**: `com.kinecoin.web`
- **Version Code**: 1
- **Version Name**: "1.0"
- **Minification**: Disabled for debug builds
- **Google Services**: Conditionally applied for push notifications

#### Variables (`android/variables.gradle`)
```gradle
ext {
    minSdkVersion = 23
    compileSdkVersion = 35
    targetSdkVersion = 35
    androidxActivityVersion = '1.9.2'
    androidxAppCompatVersion = '1.7.0'
    androidxCoordinatorLayoutVersion = '1.2.0'
    androidxCoreVersion = '1.15.0'
    androidxFragmentVersion = '1.8.4'
    coreSplashScreenVersion = '1.0.1'
    androidxWebkitVersion = '1.12.1'
}
```

## Development Commands

### Available Scripts

```bash
# Development
npm run android:dev        # Build web app and sync with Android
npm run android:build      # Build debug APK
npm run android:studio     # Open Android Studio

# Capacitor CLI Commands
npx cap sync android       # Sync web assets with Android project
npx cap open android       # Open project in Android Studio
npx cap run android        # Run app on connected device/emulator

cd android
.\gradlew.bat assembleDebug for build apk
```

### Development Workflow

1. **Web Development**: Use `npm run dev` for web development
2. **Android Sync**: Run `npm run android:dev` to build and sync
3. **Android Studio**: Use `npm run android:studio` for native debugging
4. **Build APK**: Use `npm run android:build` to generate debug APK

## Key Features

### Safe Area Handling

The app uses the `capacitor-plugin-safe-area` plugin to handle device-specific safe areas:

```javascript
// Plugin installation
npm install capacitor-plugin-safe-area
npx cap sync
```

### WebView Configuration

- **AndroidX WebView**: Uses modern WebView implementation
- **JavaScript Enabled**: Full JavaScript support for React app
- **DOM Storage**: Enabled for localStorage and sessionStorage
- **Mixed Content**: Allows HTTP and HTTPS content

### Native Integration Points

#### MetaMask Integration
- MetaMask SDK integrated for wallet functionality
- WebView configured for dApp interactions
- Deep linking support for wallet connections

#### Real-time Data
- Socket.io client for real-time trading data
- WebSocket support enabled in WebView
- Background data handling configured

#### File Operations
- File provider configured for downloads and uploads
- Storage permissions for KYC document uploads
- Image compression for large files

## Setup Instructions

### Prerequisites

1. **Android Studio**: Latest version installed
2. **Java Development Kit (JDK)**: Version 17 or higher
3. **Android SDK**: API 35 installed
4. **Node.js**: Version 18 or higher
5. **Gradle**: Version 8.0 or higher

### Initial Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Add Android Platform**:
   ```bash
   npx cap add android
   ```

3. **Install Plugins**:
   ```bash
   npm install capacitor-plugin-safe-area
   npx cap sync
   ```

4. **Build Web App**:
   ```bash
   npm run build
   ```

5. **Sync with Android**:
   ```bash
   npx cap sync android
   ```

### Device Setup

#### Physical Device
1. Enable Developer Options
2. Enable USB Debugging
3. Connect device via USB
4. Trust computer on device
5. Run app:
   ```bash
   npx cap run android
   ```

#### Android Emulator
1. Create emulator in Android Studio
2. Start emulator
3. Run app:
   ```bash
   npx cap run android
   ```

## Building for Production

### Debug Build
```bash
npm run android:build
```
Output: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release Build
1. **Generate Signing Key**:
   ```bash
   keytool -genkey -v -keystore kinecoin-release.keystore -alias kinecoin -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Configure Signing**:
   Add signing configuration to `android/app/build.gradle`

3. **Build Release APK**:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

4. **Output Location**: `android/app/build/outputs/apk/release/app-release.apk`

## Troubleshooting

### Common Issues

#### Build Failures
- **Solution**: Clean build with `./gradlew clean`
- **Check**: Java version compatibility
- **Verify**: Android SDK installation

#### Sync Issues
- **Solution**: Delete `android` folder and re-add platform
- **Command**: `npx cap add android`
- **Check**: `capacitor.config.json` configuration

#### Plugin Issues
- **Solution**: Reinstall plugins
- **Command**: `npx cap sync`
- **Check**: Plugin compatibility with Capacitor 7.4.3

#### WebView Issues
- **Solution**: Clear app data
- **Check**: JavaScript and DOM storage settings
- **Verify**: Internet permissions

### Debugging Tools

#### Android Studio
- **Logcat**: View native logs
- **Layout Inspector**: Debug UI layouts
- **Profiler**: Performance monitoring
- **Debugger**: Native code debugging

#### Chrome DevTools
- **Remote Debugging**: Connect to WebView
- **Console**: JavaScript errors
- **Network**: API call debugging
- **Elements**: DOM inspection

### Performance Optimization

#### Build Optimization
- Enable ProGuard for release builds
- Use App Bundle instead of APK
- Implement code splitting

#### Runtime Optimization
- Enable hardware acceleration
- Optimize WebView settings
- Implement proper caching strategies

## Security Considerations

### App Security
- **HTTPS Only**: Enforce HTTPS for API calls
- **Certificate Pinning**: Implement SSL pinning
- **Data Encryption**: Encrypt sensitive data at rest

### WebView Security
- **JavaScript Interface**: Secure native bridge
- **Content Security Policy**: Implement CSP headers
- **Same Origin Policy**: Configure properly

### Permissions
- **Minimum Required**: Only request necessary permissions
- **Runtime Requests**: Handle permission requests gracefully
- **Privacy Policy**: Update privacy policy accordingly

## Deployment

### Google Play Store
1. **Create Developer Account**
2. **Prepare App Bundle**: `./gradlew bundleRelease`
3. **Upload to Play Console**
4. **Complete Store Listing**
5. **Submit for Review**

### Beta Testing
1. **Internal Testing**: Test with team members
2. **Closed Testing**: Limited user group
3. **Open Testing**: Public beta program

### Updates
1. **Increment Version Code**: In `build.gradle`
2. **Update Version Name**: In `build.gradle`
3. **Build New Release**: Follow production build process
4. **Upload to Play Console**: Submit update

## Maintenance

### Dependencies
- **Regular Updates**: Keep Capacitor and plugins updated
- **Security Patches**: Apply security updates promptly
- **Compatibility Testing**: Test with new Android versions

### Monitoring
- **Crash Reporting**: Implement crash analytics
- **Performance Monitoring**: Track app performance
- **User Feedback**: Collect and analyze user feedback

### Backup and Recovery
- **Source Control**: Maintain proper Git workflow
- **Keystore Backup**: Securely backup signing keys
- **Documentation**: Keep documentation updated
# Android Build & Emulator Setup Guide

## Prerequisites
- Android SDK installed
- Android emulator or device connected
- Node.js and npm installed ✅
- Gradle (included with project) ✅

## Quick Start - Build & Run

### Option 1: Using Expo CLI (Recommended)
```bash
cd c:\Users\moham\work\platx-mobile
npm run android
```
This will:
1. Build the app using Gradle
2. Automatically detect emulator/device
3. Install and launch the app

### Option 2: Manual Gradle Build
```bash
cd c:\Users\moham\work\platx-mobile\android
.\gradlew.bat assembleDebug --no-daemon
```

Then deploy using:
```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.platxmobile/.MainActivity
```

## Starting Emulator (If needed)

### List available emulators:
```bash
emulator -list-avds
```

### Start an emulator:
```bash
emulator -avd <emulator-name> -netdelay none -netspeed full
```

Example:
```bash
emulator -avd Pixel_6_API_33 -netdelay none -netspeed full
```

## Check Build Status

### After running `npm run android`:
- Watch for "BUILD SUCCESSFUL" message
- App should auto-install and launch on emulator
- Check logcat for any runtime errors:
  ```bash
  adb logcat | findstr "platx"
  ```

## Build Output Location
APK file will be at:
```
c:\Users\moham\work\platx-mobile\android\app\build\outputs\apk\debug\app-debug.apk
```

## Troubleshooting

### Build Hangs
- Press `Ctrl+C` to cancel
- Clear cache: `npm start -- --reset-cache`
- Try again: `npm run android`

### Emulator Not Detected
- Ensure emulator is running: `adb devices`
- Or connect physical device via USB

### Build Fails
1. Check Java installation: `java -version`
2. Update SDK: `sdkmanager --update`
3. Clean and retry:
   ```bash
   cd android && .\gradlew.bat clean && cd ..
   npm run android
   ```

## Expected Build Time
- First build: 15-30 minutes (downloading dependencies)
- Subsequent builds: 5-10 minutes

## App Features to Test
After app launches:
1. **Login** - Test authentication
2. **Navigate Tabs** - Home, Courses, Chat, Notifications, Profile
3. **Live Feature** - Create and join live sessions (if logged in as staff)
4. **Video Streaming** - Agora RTC for live sessions
5. **Real-time Chat** - SignalR connections

---

**Last Updated**: February 7, 2026

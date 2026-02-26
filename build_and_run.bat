@echo off
REM PlatX Mobile - Build and Deploy Script
setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════╗
echo ║   PlatX Mobile - Build and Deploy         ║
echo ║   Android APK Builder                      ║
echo ╚════════════════════════════════════════════╝
echo.

set PROJECT_DIR=c:\Users\moham\work\platx-mobile
set ANDROID_DIR=%PROJECT_DIR%\android
set APK_PATH=%ANDROID_DIR%\app\build\outputs\apk\debug\app-debug.apk

echo [1/4] Checking build environment...
cd /d %PROJECT_DIR%
if not exist package.json (
    echo ERROR: Project not found!
    exit /b 1
)
echo ✓ Project found

echo.
echo [2/4] Building APK with Gradle...
cd /d %ANDROID_DIR%
call gradlew.bat assembleDebug --no-daemon
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build failed!
    exit /b 1
)
echo ✓ Build successful

echo.
echo [3/4] Checking for APK...
if not exist "%APK_PATH%" (
    echo ERROR: APK not found at %APK_PATH%
    exit /b 1
)
echo ✓ APK created: %APK_PATH%

echo.
echo [4/4] Installing APK on device...
adb install -r "%APK_PATH%"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install APK. Make sure emulator is running!
    echo Run: emulator -avd "Pixel_6_API_33" -netdelay none -netspeed full
    exit /b 1
)
echo ✓ APK installed

echo.
echo [5/5] Launching app...
adb shell am start -n com.platxmobile/.MainActivity

echo.
echo ╔════════════════════════════════════════════╗
echo ║   App launched successfully!              ║
echo ╚════════════════════════════════════════════╝
echo.
pause

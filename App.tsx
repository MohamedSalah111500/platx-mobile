import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
} from '@expo-google-fonts/cairo';

import { logger } from './app/services/logger';
import { ThemeProvider } from './app/theme/ThemeProvider';
import { RTLProvider } from './app/i18n/RTLProvider';
import { ErrorBoundary } from './app/components/ErrorBoundary';
import RootNavigator from './app/navigation/RootNavigator';

// ─── Native splash control ────────────────────────────────────────────────
// Block the auto-hide so we control when the splash disappears.
// Wrapped in try/catch — calling this twice or in unsupported env throws.
try {
  SplashScreen.preventAutoHideAsync();
} catch {}

// ─── Hard safety net ──────────────────────────────────────────────────────
// If anything below fails catastrophically, force the splash to disappear
// after 8 seconds. This guarantees the app never looks frozen.
const HARD_TIMEOUT_MS = 8000;
setTimeout(() => {
  try {
    SplashScreen.hideAsync();
  } catch {}
}, HARD_TIMEOUT_MS);

// ─── Global JS error capture ──────────────────────────────────────────────
// This catches uncaught throws and unhandled promise rejections so they
// reach Crashlytics even when no React component is mounted.
try {
  const eu: any = (global as any).ErrorUtils;
  const previous = eu?.getGlobalHandler?.();
  eu?.setGlobalHandler?.((error: Error, isFatal?: boolean) => {
    logger.log(`Global JS error fatal=${isFatal}`);
    logger.recordError(error, 'GlobalHandler');
    previous?.(error, isFatal);
  });
} catch {}

// ─── Font loading config ──────────────────────────────────────────────────
const FONTS = {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
};
const FONTS_TIMEOUT_MS = 5000;

export default function App() {
  const [fontsLoaded, fontsError] = useFonts(FONTS);
  const [fontsTimedOut, setFontsTimedOut] = useState(false);

  // Log font-load lifecycle for production debugging
  useEffect(() => {
    logger.log('[App] mount');
    const t = setTimeout(() => {
      logger.log('[App] fonts timeout fired');
      setFontsTimedOut(true);
    }, FONTS_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (fontsLoaded) logger.log('[App] fonts loaded');
    if (fontsError) {
      logger.log('[App] fonts errored');
      logger.recordError(fontsError, 'useFonts');
    }
  }, [fontsLoaded, fontsError]);

  const ready = fontsLoaded || !!fontsError || fontsTimedOut;

  // Hide native splash as soon as we know we can render — even if fonts errored
  useEffect(() => {
    if (ready) {
      try {
        SplashScreen.hideAsync();
      } catch {}
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <RTLProvider>
            <RootNavigator />
          </RTLProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

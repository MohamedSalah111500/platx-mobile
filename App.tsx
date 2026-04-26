import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { logger } from './app/services/logger';

// Catch any uncaught JS error globally → send to Crashlytics
const defaultHandler = (ErrorUtils as any).getGlobalHandler?.();
(ErrorUtils as any).setGlobalHandler?.((error: Error, isFatal?: boolean) => {
  logger.log(`Global handler: isFatal=${isFatal}`);
  logger.recordError(error, 'GlobalHandler');
  defaultHandler?.(error, isFatal);
});
import {
  useFonts,
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
} from '@expo-google-fonts/cairo';
import { ThemeProvider } from './app/theme/ThemeProvider';
import { RTLProvider } from './app/i18n/RTLProvider';
import { ErrorBoundary } from './app/components/ErrorBoundary';
import RootNavigator from './app/navigation/RootNavigator';

// Hard safety: force-hide native splash after 6s no matter what happens
setTimeout(() => {
  try { SplashScreen.hideAsync(); } catch {}
}, 6000);

export default function App() {
  const [fontsLoaded, fontsError] = useFonts({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  // Safety: if fonts fail or take too long, render anyway with system fonts
  const [fontsTimedOut, setFontsTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFontsTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, []);

  // Force splash to hide once we have fonts (or timeout)
  useEffect(() => {
    if (fontsLoaded || fontsError || fontsTimedOut) {
      try { SplashScreen.hideAsync(); } catch {}
    }
  }, [fontsLoaded, fontsError, fontsTimedOut]);

  if (!fontsLoaded && !fontsError && !fontsTimedOut) {
    return null;
  }

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

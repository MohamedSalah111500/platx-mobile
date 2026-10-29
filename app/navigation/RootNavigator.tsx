import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet, Image, Dimensions, AppState, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';

import { useAuthStore } from '../store/auth.store';
import { useParentStore } from '../store/parent.store';
import { useTheme } from '../theme/ThemeProvider';
import { runStartup } from '../bootstrap/startup';
import { logger } from '../services/logger';
import type { RootStackParamList } from '../types/navigation.types';

import { navigationRef, navigateToNotifications, openGuardianLink } from './navigationRef';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import ParentNavigator from './ParentNavigator';
import LiveClassroomScreen from '../screens/live/LiveClassroomScreen';
import WelcomeSplash from '../components/WelcomeSplash';
import UpdateRequiredAlert from '../components/UpdateRequiredAlert';
import UpdateAvailableBanner from '../components/UpdateAvailableBanner';
import { useUIStore } from '../store/ui.store';
import { checkAppVersion } from '../services/appVersionGate';
import { registerForPushNotifications } from '../services/realtime/pushNotifications';
import { guardianCodeFromUrl } from '../utils/guardianCode';

const Stack = createNativeStackNavigator<RootStackParamList>();
const { width: SCREEN_W } = Dimensions.get('window');
const isTablet = SCREEN_W >= 768;

const STARTUP_HARD_TIMEOUT_MS = 6000;

let coldStartHandled = false;

function BrandedLoading() {
  // Prefer the tenant's logo once a session is restored; fall back to the app icon.
  const tenantLogo = useAuthStore((s) => s.tenantLogo);
  const [logoFailed, setLogoFailed] = useState(false);
  return (
    <View style={styles.splash}>
      <Image
        source={tenantLogo && !logoFailed ? { uri: tenantLogo } : require('../../assets/images/logo-icon.png')}
        style={styles.splashIcon}
        resizeMode="contain"
        onError={() => setLogoFailed(true)}
      />
    </View>
  );
}

export default function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isParent = useParentStore((s) => !!s.token);
  const showWelcome = useAuthStore((s) => s.showWelcome);
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const { theme } = useTheme();
  const updateRequired = useUIStore((s) => s.updateRequired);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [navReady, setNavReady] = useState(false);
  const [pendingGuardianCode, setPendingGuardianCode] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Hard ceiling — even if startup hangs, we render the UI shell.
    const ceiling = setTimeout(() => {
      if (mounted) {
        logger.log('[RootNavigator] startup ceiling reached, forcing render');
        setBootstrapped(true);
      }
    }, STARTUP_HARD_TIMEOUT_MS);

    // Not a startup step: runStartup runs steps in series, so a slow version
    // check would hold the splash up. The gate is an overlay — it appears by
    // itself as soon as the store updates.
    checkAppVersion(true);

    runStartup([
      {
        name: 'restoreSession',
        run: () =>
          restoreSession().finally(() => {
            if (mounted) setSessionReady(true);
          }),
      },
    ], 4000)
      .finally(() => {
        clearTimeout(ceiling);
        if (mounted) setBootstrapped(true);
      });

    return () => {
      mounted = false;
      clearTimeout(ceiling);
    };
  }, [restoreSession]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      checkAppVersion();
      // Re-announce the push token on every return to the app. The server forgets a
      // token the moment one delivery bounces, and registering again here is what
      // gets notifications back without the student reinstalling anything.
      if (useAuthStore.getState().token || useParentStore.getState().token) {
        registerForPushNotifications().catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      navigateToNotifications();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => {
      const parent = useParentStore.getState();
      if (parent.token) parent.fetchUnreadCount();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const accept = (url: string | null) => {
      const code = guardianCodeFromUrl(url);
      if (code) setPendingGuardianCode(code);
    };
    Linking.getInitialURL().then(accept).catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => accept(url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!pendingGuardianCode || !bootstrapped || !sessionReady || !navReady || updateRequired) return;
    setPendingGuardianCode(null);
    openGuardianLink(pendingGuardianCode);
  }, [pendingGuardianCode, bootstrapped, sessionReady, navReady, updateRequired]);

  useEffect(() => {
    if (!bootstrapped || !(isAuthenticated || isParent) || coldStartHandled) return;
    coldStartHandled = true;
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) navigateToNotifications();
      })
      .catch(() => {});
  }, [bootstrapped, isAuthenticated, isParent]);

  const navigationTheme = {
    dark: theme.dark,
    colors: {
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.card,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.danger,
    },
    fonts: {
      regular: { fontFamily: 'Cairo_400Regular', fontWeight: '400' as const },
      medium: { fontFamily: 'Cairo_500Medium', fontWeight: '500' as const },
      bold: { fontFamily: 'Cairo_700Bold', fontWeight: '700' as const },
      heavy: { fontFamily: 'Cairo_700Bold', fontWeight: '900' as const },
    },
  };

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef} theme={navigationTheme} onReady={() => setNavReady(true)}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <>
              <Stack.Screen name="Main" component={MainTabNavigator} />
              <Stack.Screen name="LiveClassroom" component={LiveClassroomScreen} />
            </>
          ) : isParent ? (
            <Stack.Screen name="Parent" component={ParentNavigator} />
          ) : (
            <Stack.Screen name="Auth" component={AuthNavigator} />
          )}
        </Stack.Navigator>
      </NavigationContainer>

      {isAuthenticated && showWelcome && <WelcomeSplash />}
      {!bootstrapped && <BrandedLoading />}
      {(isAuthenticated || isParent) && <UpdateAvailableBanner />}
      <UpdateRequiredAlert />
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#121935',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashIcon: {
    width: isTablet ? 100 : 76,
    height: isTablet ? 100 : 76,
    marginBottom: 20,
  },
});

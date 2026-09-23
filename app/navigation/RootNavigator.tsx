import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet, Image, Dimensions, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';

import { useAuthStore } from '../store/auth.store';
import { useTheme } from '../theme/ThemeProvider';
import { runStartup } from '../bootstrap/startup';
import { logger } from '../services/logger';
import type { RootStackParamList } from '../types/navigation.types';

import { navigationRef, navigateToNotifications } from './navigationRef';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import LiveClassroomScreen from '../screens/live/LiveClassroomScreen';
import WelcomeSplash from '../components/WelcomeSplash';
import UpdateRequiredScreen from '../screens/UpdateRequiredScreen';
import UpdateAvailableBanner from '../components/UpdateAvailableBanner';
import { useUIStore } from '../store/ui.store';
import { checkAppVersion } from '../services/appVersionGate';

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
  const showWelcome = useAuthStore((s) => s.showWelcome);
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const { theme } = useTheme();
  const updateRequired = useUIStore((s) => s.updateRequired);
  const [bootstrapped, setBootstrapped] = useState(false);

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
        run: () => restoreSession(),
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
      if (state === 'active') checkAppVersion();
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
    if (!bootstrapped || !isAuthenticated || coldStartHandled) return;
    coldStartHandled = true;
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) navigateToNotifications();
      })
      .catch(() => {});
  }, [bootstrapped, isAuthenticated]);

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
      <NavigationContainer ref={navigationRef} theme={navigationTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <Stack.Screen name="Auth" component={AuthNavigator} />
          ) : (
            <>
              <Stack.Screen name="Main" component={MainTabNavigator} />
              <Stack.Screen name="LiveClassroom" component={LiveClassroomScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>

      {isAuthenticated && showWelcome && <WelcomeSplash />}
      {!bootstrapped && <BrandedLoading />}
      {isAuthenticated && !updateRequired && <UpdateAvailableBanner />}
      {updateRequired && (
        <View style={StyleSheet.absoluteFill}>
          <UpdateRequiredScreen />
        </View>
      )}
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

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet, Image, Dimensions } from 'react-native';

import { useAuthStore } from '../store/auth.store';
import { useTheme } from '../theme/ThemeProvider';
import { runStartup } from '../bootstrap/startup';
import { logger } from '../services/logger';
import type { RootStackParamList } from '../types/navigation.types';

import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import LiveClassroomScreen from '../screens/live/LiveClassroomScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const { width: SCREEN_W } = Dimensions.get('window');
const isTablet = SCREEN_W >= 768;

const STARTUP_HARD_TIMEOUT_MS = 6000;

function BrandedLoading() {
  const logoSize = isTablet ? 260 : 200;
  return (
    <View style={styles.splash}>
      <Image
        source={require('../../assets/images/logo-icon.png')}
        style={styles.splashIcon}
        resizeMode="contain"
      />
      <Image
        source={require('../../assets/images/logo-white.png')}
        style={[styles.splashWordmark, { width: logoSize }]}
        resizeMode="contain"
      />
    </View>
  );
}

export default function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const { theme } = useTheme();
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
      <NavigationContainer theme={navigationTheme}>
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

      {!bootstrapped && <BrandedLoading />}
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#121935',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashIcon: {
    width: isTablet ? 100 : 76,
    height: isTablet ? 100 : 76,
    marginBottom: 20,
  },
  splashWordmark: {
    height: isTablet ? 48 : 36,
  },
});

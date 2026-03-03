import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../store/auth.store';
import { useTheme } from '../theme/ThemeProvider';
import { View, StyleSheet, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import type { RootStackParamList } from '../types/navigation.types';

import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import LiveClassroomScreen from '../screens/live/LiveClassroomScreen';

// Prevent the native splash from auto-hiding
SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator<RootStackParamList>();

function BrandedLoading() {
  const logoOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 600 });
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 }),
      ),
      -1,
      true,
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={brandedStyles.container}>
      <Animated.View style={[brandedStyles.glow, glowStyle]} />
      <Animated.View style={logoStyle}>
        <Image
          source={require('../../assets/images/logo-white.png')}
          style={brandedStyles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const brandedStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121935',
  },
  logo: {
    width: 200,
    height: 80,
  },
  glow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#7c63fd',
  },
});

export default function RootNavigator() {
  const { isAuthenticated, restoreSession } = useAuthStore();
  const { theme } = useTheme();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await restoreSession();
      } catch {
        // Session restore failed, proceed to login
      } finally {
        setAppReady(true);
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync();
    }
  }, [appReady]);

  if (!appReady) {
    return <BrandedLoading />;
  }

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
  );
}

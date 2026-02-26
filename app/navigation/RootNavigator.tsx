import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/auth.store';
import { useTheme } from '../theme/ThemeProvider';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import type { RootStackParamList } from '../types/navigation.types';

import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import LiveClassroomScreen from '../screens/live/LiveClassroomScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

function SplashScreen() {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.splashContainer,
        { backgroundColor: theme.colors.primary },
      ]}
    >
      {/* Logo */}
      <Image
        source={require('../../assets/images/logo-white.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.tagline}>Learning Platform</Text>

      {/* Loading Indicator */}
      <ActivityIndicator
        size="small"
        color="rgba(255,255,255,0.8)"
        style={styles.loader}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 80,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
    letterSpacing: 2,
  },
  loader: {
    marginTop: 48,
  },
});

export default function RootNavigator() {
  const { isAuthenticated, isLoading, restoreSession } = useAuthStore();
  const { theme } = useTheme();

  useEffect(() => {
    restoreSession();
  }, []);

  if (isLoading) {
    return <SplashScreen />;
  }

  // Navigation container theme to match our app theme
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
      regular: { fontFamily: 'System', fontWeight: '400' as const },
      medium: { fontFamily: 'System', fontWeight: '500' as const },
      bold: { fontFamily: 'System', fontWeight: '700' as const },
      heavy: { fontFamily: 'System', fontWeight: '900' as const },
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

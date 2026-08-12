import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuthStore } from '../store/auth.store';
import { useRTL } from '../i18n/RTLProvider';

const { width: SCREEN_W } = Dimensions.get('window');
const isTablet = SCREEN_W >= 768;

const VISIBLE_MS = 3000;
const FADE_MS = 400;

export default function WelcomeSplash() {
  const { t } = useRTL();
  const user = useAuthStore((s) => s.user);
  const tenantName = useAuthStore((s) => s.tenantName);
  const tenantLogo = useAuthStore((s) => s.tenantLogo);
  const dismissWelcome = useAuthStore((s) => s.dismissWelcome);

  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  const firstName = user?.firstName?.trim();
  const greeting = firstName
    ? t('welcome.greetingNamed', { name: firstName })
    : t('welcome.greeting');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_MS,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();

    const hold = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start(() => dismissWelcome());
    }, VISIBLE_MS - FADE_MS);

    return () => clearTimeout(hold);
  }, [opacity, scale, dismissWelcome]);

  const logoSource = tenantLogo
    ? { uri: tenantLogo }
    : require('../../assets/images/logo-icon.png');

  return (
    <Animated.View style={[styles.overlay, { opacity }]}>
      <LinearGradient
        colors={['#1b2350', '#121935']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.content, { transform: [{ scale }] }]}>
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />
        <View style={styles.logoSpacer} />
        {tenantName ? <Text style={styles.tenantName}>{tenantName}</Text> : null}
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.message}>{t('welcome.message')}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    width: isTablet ? 180 : 150,
    height: isTablet ? 180 : 150,
  },
  logoSpacer: {
    height: 24,
  },
  tenantName: {
    fontFamily: 'Cairo_700Bold',
    fontSize: isTablet ? 26 : 22,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  greeting: {
    fontFamily: 'Cairo_700Bold',
    fontSize: isTablet ? 22 : 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    fontFamily: 'Cairo_400Regular',
    fontSize: isTablet ? 16 : 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
});

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuthStore } from '../store/auth.store';
import { useRTL } from '../i18n/RTLProvider';
import { isValidHexColor, darken } from '../utils/color';

const DEFAULT_ACCENT = '#7c63fd';

const { width: SCREEN_W } = Dimensions.get('window');
const isTablet = SCREEN_W >= 768;

const VISIBLE_MS = 3000;
const FADE_MS = 400;

const CARD_SIZE = isTablet ? 180 : 148;
const LOGO_SIZE = isTablet ? 126 : 102;

export default function WelcomeSplash() {
  const { t } = useRTL();
  const user = useAuthStore((s) => s.user);
  const tenantName = useAuthStore((s) => s.tenantName);
  const tenantLogo = useAuthStore((s) => s.tenantLogo);
  const tenantColor = useAuthStore((s) => s.tenantColor);
  const dismissWelcome = useAuthStore((s) => s.dismissWelcome);

  const accent = isValidHexColor(tenantColor) ? tenantColor : DEFAULT_ACCENT;
  const gradientColors = [darken(accent, 40), darken(accent, 70)] as const;

  const [logoFailed, setLogoFailed] = useState(false);

  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

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

  const logoSource = tenantLogo && !logoFailed
    ? { uri: tenantLogo }
    : require('../../assets/images/logo-icon.png');

  return (
    <Animated.View style={[styles.overlay, { opacity }]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.content, { transform: [{ scale }] }]}>
        <View style={styles.logoCard}>
          <Image
            source={logoSource}
            style={styles.logo}
            resizeMode="contain"
            onError={() => setLogoFailed(true)}
          />
        </View>
        {tenantName ? (
          <Text style={styles.tenantName} numberOfLines={2}>
            {tenantName}
          </Text>
        ) : null}
        <Text style={styles.greeting}>{greeting}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoCard: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: CARD_SIZE * 0.24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: isTablet ? 32 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  tenantName: {
    fontFamily: 'Cairo_700Bold',
    fontSize: isTablet ? 26 : 22,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
    paddingHorizontal: 8,
  },
  greeting: {
    fontFamily: 'Cairo_400Regular',
    fontSize: isTablet ? 17 : 15,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
});

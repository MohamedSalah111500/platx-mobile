import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, Animated, Easing, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '../store/auth.store';
import { useRTL } from '../i18n/RTLProvider';
import { isValidHexColor, darken } from '../utils/color';

const DEFAULT_ACCENT = '#7c63fd';
const VISIBLE_MS = 2600;
const ENTER_MS = 550;
const EXIT_MS = 350;
const PROGRESS_WIDTH = 140;

export default function WelcomeSplash() {
  const { t } = useRTL();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const tenantName = useAuthStore((s) => s.tenantName);
  const tenantLogo = useAuthStore((s) => s.tenantLogo);
  const tenantColor = useAuthStore((s) => s.tenantColor);
  const dismissWelcome = useAuthStore((s) => s.dismissWelcome);

  const accent = isValidHexColor(tenantColor) ? tenantColor! : DEFAULT_ACCENT;
  const deepAccent = darken(accent, 35);
  const [logoFailed, setLogoFailed] = useState(false);
  const hasLogo = !!tenantLogo && !logoFailed;

  const overlay = useRef(new Animated.Value(1)).current;
  const logoIn = useRef(new Animated.Value(0)).current;
  const textIn = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;

  const firstName = user?.firstName?.trim();
  const greeting = firstName ? t('welcome.greetingNamed', { name: firstName }) : t('welcome.greeting');
  const logoWidth = Math.min(width * 0.62, 280);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoIn, { toValue: 1, duration: ENTER_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(textIn, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    Animated.timing(progress, {
      toValue: 1,
      duration: VISIBLE_MS - EXIT_MS,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();

    const hold = setTimeout(() => {
      Animated.timing(overlay, { toValue: 0, duration: EXIT_MS, useNativeDriver: true }).start(() => dismissWelcome());
    }, VISIBLE_MS - EXIT_MS);

    return () => clearTimeout(hold);
  }, [overlay, logoIn, textIn, progress, dismissWelcome]);

  const logoStyle = {
    opacity: logoIn,
    transform: [
      { translateY: logoIn.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
      { scale: logoIn.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
    ],
  };
  const textStyle = {
    opacity: textIn,
    transform: [{ translateY: textIn.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: overlay }]} accessibilityRole="header" accessibilityLabel={tenantName ?? undefined}>
      <View style={[styles.glow, styles.glowTop, { backgroundColor: accent }]} />
      <View style={[styles.glow, styles.glowBottom, { backgroundColor: deepAccent }]} />

      <View style={styles.center}>
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          {hasLogo ? (
            <Image
              source={{ uri: tenantLogo! }}
              style={{ width: logoWidth, height: logoWidth * 0.55 }}
              resizeMode="contain"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <Text style={[styles.monogram, { color: accent }]}>{(tenantName || 'P').trim().charAt(0).toUpperCase()}</Text>
          )}
        </Animated.View>

        <Animated.View style={[styles.textBlock, textStyle]}>
          {tenantName ? (
            <Text style={[styles.tenantName, { color: deepAccent }]} numberOfLines={2}>
              {tenantName}
            </Text>
          ) : null}
          <Text style={styles.greeting} numberOfLines={2}>
            {greeting}
          </Text>
        </Animated.View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 28 }]}>
        <View style={styles.track}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: accent, opacity: 0.15 }]} />
          <Animated.View
            style={[
              styles.fill,
              {
                backgroundColor: accent,
                width: progress.interpolate({ inputRange: [0, 1], outputRange: [0, PROGRESS_WIDTH] }),
              },
            ]}
          />
        </View>
        <Text style={styles.powered}>{t('welcome.poweredBy')}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFFFFF',
    zIndex: 100,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    opacity: 0.07,
  },
  glowTop: {
    top: -200,
    right: -140,
  },
  glowBottom: {
    bottom: -220,
    left: -160,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  monogram: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 96,
    lineHeight: 120,
    textAlign: 'left',
  },
  textBlock: {
    alignItems: 'center',
  },
  tenantName: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 26,
    lineHeight: 38,
    textAlign: 'center',
  },
  greeting: {
    fontFamily: 'Cairo_400Regular',
    fontSize: 16,
    lineHeight: 26,
    color: '#5B6170',
    textAlign: 'center',
    marginTop: 4,
  },
  footer: {
    alignItems: 'center',
    gap: 14,
  },
  track: {
    width: PROGRESS_WIDTH,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 2,
  },
  powered: {
    fontFamily: 'Cairo_400Regular',
    fontSize: 14,
    color: '#9AA0AC',
    textAlign: 'left',
  },
});

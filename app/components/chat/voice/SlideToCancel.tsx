import React, { useEffect } from 'react';
import { I18nManager, StyleSheet, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '../../../theme/ThemeProvider';
import { useRTL } from '../../../i18n/RTLProvider';
import { fontFamily, fontSize, buttonLineHeight } from '../../../theme/typography';

const TOWARD_START = I18nManager.isRTL ? 1 : -1;

interface Props {
  dragX: SharedValue<number>;
  cancelDistance: SharedValue<number>;
}

export function SlideToCancel({ dragX, cancelDistance }: Props) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const nudge = useSharedValue(0);

  useEffect(() => {
    nudge.value = withRepeat(
      withSequence(withTiming(6, { duration: 500 }), withTiming(0, { duration: 500 })),
      -1,
    );
  }, [nudge]);

  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(dragX.value), [0, cancelDistance.value || 1], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateX: dragX.value * 0.8 }],
  }));

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: nudge.value * TOWARD_START }],
  }));

  return (
    <Animated.View style={[styles.row, textStyle]} pointerEvents="none">
      <Animated.View style={arrowStyle}>
        <Ionicons name="chevron-back" size={18} color={theme.colors.textMuted} style={styles.flip} />
      </Animated.View>
      <Text style={[styles.label, { color: theme.colors.textMuted }]} numberOfLines={1}>
        {t('chat.voice.slideToCancel')}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  flip: { transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] },
  label: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, textAlign: 'left', lineHeight: buttonLineHeight(fontSize.sm), includeFontPadding: false },
});

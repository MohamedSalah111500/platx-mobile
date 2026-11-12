import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  interpolate,
  Extrapolation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '../../../theme/ThemeProvider';

export const LOCK_DISTANCE = 110;

export function LockPill({ dragY }: { dragY: SharedValue<number> }) {
  const { theme } = useTheme();
  const enter = useSharedValue(0);
  const nudge = useSharedValue(0);

  useEffect(() => {
    enter.value = withSpring(1, { damping: 14, stiffness: 180 });
    nudge.value = withRepeat(withSequence(withTiming(-4, { duration: 450 }), withTiming(0, { duration: 450 })), -1);
  }, [enter, nudge]);

  const pillStyle = useAnimatedStyle(() => {
    const progress = Math.min(1, -dragY.value / LOCK_DISTANCE);
    return {
      opacity: enter.value,
      height: interpolate(progress, [0, 1], [96, 52], Extrapolation.CLAMP),
      transform: [{ translateY: interpolate(enter.value, [0, 1], [30, 0]) + dragY.value * 0.35 }],
    };
  });

  const chevronStyle = useAnimatedStyle(() => ({
    opacity: interpolate(-dragY.value, [0, LOCK_DISTANCE * 0.6], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: nudge.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.pill, { backgroundColor: theme.colors.card, borderColor: theme.colors.divider }, pillStyle]}
    >
      <Ionicons name="lock-open-outline" size={20} color={theme.colors.textSecondary} />
      <Animated.View style={chevronStyle}>
        <Ionicons name="chevron-up" size={18} color={theme.colors.textMuted} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: 46,
    alignSelf: 'center',
    width: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 10,
    gap: 6,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
});

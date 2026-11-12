import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useTheme } from '../../../theme/ThemeProvider';

export function TrashAnimation({ onDone }: { onDone: () => void }) {
  const { theme } = useTheme();
  const mic = useSharedValue(0);
  const bin = useSharedValue(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const finish = () => onDoneRef.current();
    mic.value = withSequence(
      withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }),
      withDelay(60, withTiming(2, { duration: 260, easing: Easing.in(Easing.quad) })),
    );
    bin.value = withSequence(
      withDelay(220, withTiming(1, { duration: 220, easing: Easing.out(Easing.back(1.6)) })),
      withDelay(300, withTiming(2, { duration: 240, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) scheduleOnRN(finish);
      })),
    );
  }, [mic, bin]);

  const micStyle = useAnimatedStyle(() => ({
    opacity: interpolate(mic.value, [0, 1.6, 2], [1, 1, 0]),
    transform: [
      { translateY: interpolate(mic.value, [0, 1, 2], [0, -38, 6]) },
      { rotate: `${interpolate(mic.value, [0, 1, 2], [0, 180, 360])}deg` },
      { scale: interpolate(mic.value, [0, 1, 2], [1, 1, 0.6]) },
    ],
  }));

  const binStyle = useAnimatedStyle(() => ({
    opacity: interpolate(bin.value, [0, 0.3, 1.6, 2], [0, 1, 1, 0]),
    transform: [{ translateY: interpolate(bin.value, [0, 1, 2], [28, 0, 28]) }],
  }));

  return (
    <View style={styles.stage} pointerEvents="none">
      <Animated.View style={[styles.layer, binStyle]}>
        <Ionicons name="trash" size={24} color={theme.colors.textMuted} />
      </Animated.View>
      <Animated.View style={[styles.layer, micStyle]}>
        <Ionicons name="mic" size={22} color={theme.colors.danger} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  layer: { position: 'absolute' },
});

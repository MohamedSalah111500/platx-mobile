import React from 'react';
import { I18nManager, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { LIVE_BAR_COUNT } from './useVoiceRecorder';

const HEIGHT = 26;
const BAR_WIDTH = 3;
const GAP = 2;
const STEP = BAR_WIDTH + GAP;
const MIN_BAR = 3;
const DIRECTION = I18nManager.isRTL ? -1 : 1;
const INDEXES = Array.from({ length: LIVE_BAR_COUNT }, (_, index) => index);

function LiveBar({ index, levels, color }: { index: number; levels: SharedValue<number[]>; color: string }) {
  const style = useAnimatedStyle(() => ({
    height: Math.max(MIN_BAR, (levels.value[index] ?? 0) * HEIGHT),
  }));
  return <Animated.View style={[styles.bar, { backgroundColor: color }, style]} />;
}

export function LiveWaveform({ levels, color }: { levels: SharedValue<number[]>; color: string }) {
  const offset = useSharedValue(0);

  useAnimatedReaction(
    () => levels.value,
    (current, previous) => {
      if (previous && current !== previous) {
        offset.value = STEP * DIRECTION;
        offset.value = withTiming(0, { duration: 100, easing: Easing.linear });
      }
    },
  );

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

  return (
    <View style={styles.clip}>
      <Animated.View style={[styles.row, rowStyle]}>
        {INDEXES.map((index) => (
          <LiveBar key={index} index={index} levels={levels} color={color} />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { flex: 1, height: HEIGHT, overflow: 'hidden', alignItems: 'flex-end' },
  row: { height: HEIGHT, flexDirection: 'row', alignItems: 'center', gap: GAP },
  bar: { width: BAR_WIDTH, borderRadius: BAR_WIDTH },
});

import React, { memo, useState } from 'react';
import { I18nManager, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useDerivedValue, useSharedValue, type SharedValue } from 'react-native-reanimated';

const HEIGHT = 28;
const BAR_WIDTH = 2.5;
const MIN_BAR = 3;
const DOT = 12;
const IS_RTL = I18nManager.isRTL;

interface Props {
  bars: number[];
  progress: SharedValue<number>;
  playedColor: string;
  idleColor: string;
  dotColor?: string;
  onSeek?: (fraction: number) => void;
}

const Bars = memo(function Bars({ bars, color, width }: { bars: number[]; color: string; width?: number }) {
  return (
    <View style={[styles.row, width != null && { width }]}>
      {bars.map((level, index) => (
        <View
          key={index}
          style={[styles.bar, { height: Math.max(MIN_BAR, level * HEIGHT), backgroundColor: color }]}
        />
      ))}
    </View>
  );
});

export function VoiceWaveform({ bars, progress, playedColor, idleColor, dotColor, onSeek }: Props) {
  const [width, setWidth] = useState(0);
  const scrub = useSharedValue(-1);
  const shown = useDerivedValue(() => (scrub.value >= 0 ? scrub.value : progress.value));

  const clipStyle = useAnimatedStyle(() => ({ width: shown.value * width }));
  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (IS_RTL ? -1 : 1) * shown.value * width }],
  }));

  const toFraction = (x: number) => {
    'worklet';
    const fraction = Math.min(1, Math.max(0, x / width));
    return IS_RTL ? 1 - fraction : fraction;
  };

  const commit = (fraction: number) => {
    onSeek?.(fraction);
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .enabled(!!onSeek && width > 0)
    .activeOffsetX([-6, 6])
    .failOffsetY([-12, 12])
    .onStart((event) => {
      scrub.value = toFraction(event.x);
    })
    .onUpdate((event) => {
      scrub.value = toFraction(event.x);
    })
    .onEnd(() => {
      const fraction = scrub.value;
      progress.value = fraction;
      commit(fraction);
    })
    .onFinalize(() => {
      scrub.value = -1;
    });

  const tap = Gesture.Tap()
    .runOnJS(true)
    .enabled(!!onSeek && width > 0)
    .onEnd((event) => {
      const fraction = toFraction(event.x);
      progress.value = fraction;
      commit(fraction);
    });

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <GestureDetector gesture={Gesture.Race(pan, tap)}>
      <View style={styles.container} onLayout={onLayout} hitSlop={{ top: 10, bottom: 10 }}>
        <Bars bars={bars} color={idleColor} />
        {width > 0 ? (
          <Animated.View style={[styles.clip, clipStyle]}>
            <Bars bars={bars} color={playedColor} width={width} />
          </Animated.View>
        ) : null}
        {width > 0 && dotColor ? (
          <Animated.View style={[styles.dot, { backgroundColor: dotColor }, dotStyle]} />
        ) : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'stretch', height: HEIGHT, marginHorizontal: DOT / 2, justifyContent: 'center' },
  row: {
    height: HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bar: { width: BAR_WIDTH, borderRadius: BAR_WIDTH },
  clip: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    start: 0,
    overflow: 'hidden',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    start: -DOT / 2,
    top: (HEIGHT - DOT) / 2,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
});

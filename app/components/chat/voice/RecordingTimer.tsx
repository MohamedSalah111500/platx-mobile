import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../../theme/ThemeProvider';
import { fontFamily, fontSize } from '../../../theme/typography';
import { formatVoiceTime } from './waveform';

interface Props {
  elapsedMs: () => number;
  running: boolean;
}

export function RecordingTimer({ elapsedMs, running }: Props) {
  const { theme } = useTheme();
  const [second, setSecond] = useState(() => Math.floor(elapsedMs() / 1000));
  const blink = useSharedValue(1);

  useEffect(() => {
    setSecond(Math.floor(elapsedMs() / 1000));
    if (!running) return;
    const timer = setInterval(() => setSecond(Math.floor(elapsedMs() / 1000)), 250);
    return () => clearInterval(timer);
  }, [elapsedMs, running]);

  useEffect(() => {
    blink.value = running ? withRepeat(withTiming(0.2, { duration: 550 }), -1, true) : withTiming(1);
  }, [running, blink]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: blink.value }));

  return (
    <View style={styles.row}>
      <Animated.View style={dotStyle}>
        <Ionicons name="mic" size={22} color={theme.colors.danger} />
      </Animated.View>
      <Text style={[styles.time, { color: theme.colors.text }]}>{formatVoiceTime(second * 1000)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  time: { fontSize: fontSize.base, fontFamily: fontFamily.semibold, minWidth: 44, textAlign: 'left', fontVariant: ['tabular-nums'] },
});

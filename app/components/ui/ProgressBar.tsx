import React, { memo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface ProgressBarProps {
  value: number;
  style?: ViewStyle;
}

function ProgressBarBase({ value, style }: ProgressBarProps) {
  const { theme, isDark } = useTheme();
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={[styles.track, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)' }, style]}>
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: theme.colors.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: 3, overflow: 'hidden', alignSelf: 'stretch' },
  fill: { height: '100%', borderRadius: 3 },
});

export const ProgressBar = memo(ProgressBarBase);
export default ProgressBar;

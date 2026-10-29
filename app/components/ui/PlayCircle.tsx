import React, { memo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';

type IconName = 'play' | 'forward';

interface PlayCircleProps {
  size?: number;
  tone?: 'ink' | 'light';
  icon?: IconName;
  style?: ViewStyle;
}

function PlayCircleBase({ size = 40, tone = 'ink', icon = 'play', style }: PlayCircleProps) {
  const { theme, isDark } = useTheme();
  const { isRTL } = useRTL();

  const background = tone === 'light' ? '#FFFFFF' : theme.colors.text;
  const foreground = tone === 'light' ? '#18181B' : isDark ? theme.colors.background : '#FFFFFF';
  const glyph = icon === 'play' ? 'play' : isRTL ? 'arrow-back' : 'arrow-forward';
  const glyphSize = Math.round(size * 0.46);

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: background },
        style,
      ]}
    >
      <Ionicons
        name={glyph}
        size={glyphSize}
        color={foreground}
        style={icon === 'play' ? styles.playNudge : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { justifyContent: 'center', alignItems: 'center' },
  playNudge: { transform: [{ translateX: 2 }] },
});

export const PlayCircle = memo(PlayCircleBase);
export default PlayCircle;

import React from 'react';
import { ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeProvider';

interface GradientBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/** Soft two-tone gradient screen background, driven by the current theme. */
export function GradientBackground({ children, style }: GradientBackgroundProps) {
  const { theme } = useTheme();

  return (
    <LinearGradient
      colors={[theme.colors.backgroundGradientFrom, theme.colors.backgroundGradientTo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ flex: 1 }, style]}
    >
      {children}
    </LinearGradient>
  );
}

export default GradientBackground;

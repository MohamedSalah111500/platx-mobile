import React from 'react';
import { View, ActivityIndicator, StyleSheet, ViewStyle, Text } from 'react-native';
import { useTheme } from '@theme/ThemeProvider';
import { spacing } from '@theme/spacing';
import { typography } from '@theme/typography';

interface SpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  fullScreen?: boolean;
  style?: ViewStyle;
}

export function Spinner({
  size = 'large',
  color,
  text,
  fullScreen = false,
  style,
}: SpinnerProps) {
  const { theme } = useTheme();
  const spinnerColor = color || theme.colors.primary;

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    fullScreen: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.background,
      zIndex: 999,
    },
    text: {
      ...typography.bodySmall,
      color: theme.colors.textSecondary,
      marginTop: spacing.md,
    },
  });

  return (
    <View style={[styles.container, fullScreen && styles.fullScreen, style]}>
      <ActivityIndicator size={size} color={spinnerColor} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
}

export default Spinner;

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface ErrorBannerProps {
  message: string;
  style?: ViewStyle;
}

/** Left-bordered danger banner for inline error messages (auth screens, forms). */
export function ErrorBanner({ message, style }: ErrorBannerProps) {
  const { theme } = useTheme();

  if (!message) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.danger + '15',
          borderLeftColor: theme.colors.danger,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color: theme.colors.danger }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius['2xl'],
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 3,
  },
  text: {
    ...typography.bodySmall,
    textAlign: 'left',
  },
});

export default ErrorBanner;

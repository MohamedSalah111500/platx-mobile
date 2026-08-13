import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface ErrorRetryProps {
  message: string;
  onRetry: () => void;
  retryLabel?: string;
  style?: ViewStyle;
}

/** Full-block error display with icon and retry button. */
export function ErrorRetry({ message, onRetry, retryLabel, style }: ErrorRetryProps) {
  const { theme } = useTheme();
  const { t } = useRTL();

  return (
    <View style={[styles.container, style]}>
      <Ionicons name="alert-circle-outline" size={48} color={theme.colors.danger} />
      <Text style={[styles.message, { color: theme.colors.danger }]}>{message}</Text>
      <TouchableOpacity
        style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
        onPress={onRetry}
        activeOpacity={0.7}
      >
        <Text style={styles.retryText}>{retryLabel || t('common.retry')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['3xl'],
  },
  message: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 14,
  },
  retryText: {
    ...typography.button,
    color: '#fff',
  },
});

export default ErrorRetry;

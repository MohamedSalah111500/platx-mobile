import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@theme/ThemeProvider';
import { spacing } from '@theme/spacing';
import { typography } from '@theme/typography';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function EmptyState({
  icon,
  title,
  description,
  message,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  const text = description || message;
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing['3xl'],
    },
    iconContainer: {
      marginBottom: spacing.xl,
    },
    title: {
      ...typography.h4,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    description: {
      ...typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
  });

  return (
    <View style={[styles.container, style]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={styles.title}>{title}</Text>
      {text && <Text style={styles.description}>{text}</Text>}
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} variant="outline" />
      )}
    </View>
  );
}

export default EmptyState;

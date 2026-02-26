import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@theme/ThemeProvider';
import { spacing, borderRadius } from '@theme/spacing';
import { fontSize } from '@theme/typography';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps {
  text?: string;
  count?: number;
  variant?: BadgeVariant;
  color?: string;
  size?: 'small' | 'medium';
  style?: ViewStyle;
}

export function Badge({
  text,
  count,
  variant = 'primary',
  color,
  size = 'medium',
  style,
}: BadgeProps) {
  const { theme } = useTheme();

  const getBackgroundColor = () => {
    if (color) return color;
    switch (variant) {
      case 'primary':
        return theme.colors.primary;
      case 'success':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      case 'danger':
        return theme.colors.danger;
      case 'info':
        return theme.colors.info;
      default:
        return theme.colors.primary;
    }
  };

  const displayText = text || (count !== undefined ? (count > 99 ? '99+' : count.toString()) : '');

  const styles = StyleSheet.create({
    badge: {
      backgroundColor: getBackgroundColor(),
      borderRadius: borderRadius.full,
      paddingHorizontal: size === 'small' ? spacing.xs : spacing.sm,
      paddingVertical: size === 'small' ? 2 : spacing.xs,
      minWidth: size === 'small' ? 16 : 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      color: '#ffffff',
      fontSize: size === 'small' ? fontSize.xs - 2 : fontSize.xs,
      fontWeight: '600',
    },
  });

  if (!displayText) {
    return (
      <View style={[styles.badge, { width: 8, height: 8, minWidth: 8, paddingHorizontal: 0, paddingVertical: 0 }, style]} />
    );
  }

  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.text}>{displayText}</Text>
    </View>
  );
}

export default Badge;

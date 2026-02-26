import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { useTheme } from '@theme/ThemeProvider';
import { spacing, borderRadius } from '@theme/spacing';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  padding?: keyof typeof spacing | number;
  shadow?: boolean;
}

export function Card({
  children,
  style,
  onPress,
  padding = 'lg',
  shadow = true,
}: CardProps) {
  const { theme } = useTheme();

  const paddingValue = typeof padding === 'number' ? padding : spacing[padding];

  const styles = StyleSheet.create({
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: borderRadius.xl,
      padding: paddingValue,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...(shadow && {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme.dark ? 0.3 : 0.1,
        shadowRadius: 8,
        elevation: 4,
      }),
    },
  });

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[styles.card, style]}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.card, style]}>{children}</View>;
}

export default Card;

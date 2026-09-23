import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { useTheme } from '@theme/ThemeProvider';
import { spacing, borderRadius } from '@theme/spacing';
import { typography } from '@theme/typography';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const { theme } = useTheme();

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
    };

    const sizeStyles: Record<ButtonSize, ViewStyle> = {
      small: { paddingVertical: 6, paddingHorizontal: spacing.md },
      medium: { paddingVertical: 10, paddingHorizontal: spacing.lg + 2 },
      large: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
    };

    const variantStyles: Record<ButtonVariant, ViewStyle> = {
      primary: {
        backgroundColor: theme.colors.primary,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: theme.dark ? 0.2 : 0.25,
        shadowRadius: 8,
        elevation: 3,
      },
      secondary: { backgroundColor: theme.colors.surface },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
      },
      danger: { backgroundColor: theme.colors.danger },
      ghost: { backgroundColor: 'transparent' },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      opacity: disabled ? 0.5 : 1,
      width: fullWidth ? '100%' : undefined,
    };
  };

  const getTextStyle = (): TextStyle => {
    const sizeStyles: Record<ButtonSize, TextStyle> = {
      // lineHeight >= 1.4 x fontSize, otherwise Cairo clips.
      small: { ...typography.buttonSmall, fontSize: 13, lineHeight: 19 },
      medium: { ...typography.button, fontSize: 15, lineHeight: 21 },
      large: { ...typography.button, fontSize: 16, lineHeight: 23 },
    };

    const variantStyles: Record<ButtonVariant, TextStyle> = {
      primary: { color: '#ffffff' },
      secondary: { color: theme.colors.text },
      outline: { color: theme.colors.primary },
      danger: { color: '#ffffff' },
      ghost: { color: theme.colors.primary },
    };

    return {
      ...sizeStyles[size],
      ...variantStyles[variant],
      fontFamily: 'Cairo_700Bold',
      // A long label shrinks and centres instead of pushing the icon out of the
      // button, and Cairo sits centred on Android without its extra font padding.
      flexShrink: 1,
      textAlign: 'center',
      textAlignVertical: 'center',
      includeFontPadding: false,
    };
  };

  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          color={
            variant === 'outline' || variant === 'ghost'
              ? theme.colors.primary
              : variant === 'secondary'
                ? theme.colors.text
                : '#ffffff'
          }
        />
      );
    }

    return (
      <>
        {icon && iconPosition === 'left' && icon}
        <Text style={[getTextStyle(), textStyle]}>
          {title}
        </Text>
        {icon && iconPosition === 'right' && icon}
      </>
    );
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[getButtonStyle(), style]}
      activeOpacity={0.7}
    >
      {renderContent()}
    </TouchableOpacity>
  );
}

export default Button;

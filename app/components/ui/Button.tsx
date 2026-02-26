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
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0,
          shadowRadius: 0,
        },
        android: {
          elevation: 0,
        },
      }),
    };

    const sizeStyles: Record<ButtonSize, ViewStyle> = {
      small: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: 12 },
      medium: { paddingVertical: 14, paddingHorizontal: spacing.xl },
      large: { paddingVertical: spacing.lg, paddingHorizontal: spacing['2xl'] },
    };

    const variantStyles: Record<ButtonVariant, ViewStyle> = {
      primary: { backgroundColor: '#7c63fd' },
      secondary: { backgroundColor: theme.colors.surface },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: '#7c63fd',
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
      small: { ...typography.buttonSmall },
      medium: { ...typography.button },
      large: { ...typography.button, fontSize: 18 },
    };

    const variantStyles: Record<ButtonVariant, TextStyle> = {
      primary: { color: '#ffffff' },
      secondary: { color: theme.colors.text },
      outline: { color: '#7c63fd' },
      danger: { color: '#ffffff' },
      ghost: { color: '#7c63fd' },
    };

    return {
      ...sizeStyles[size],
      ...variantStyles[variant],
      fontWeight: '700',
    };
  };

  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? '#7c63fd' : '#ffffff'}
        />
      );
    }

    return (
      <>
        {icon && iconPosition === 'left' && icon}
        <Text
          style={[
            getTextStyle(),
            icon && iconPosition === 'left' ? { marginLeft: spacing.sm } : undefined,
            icon && iconPosition === 'right' ? { marginRight: spacing.sm } : undefined,
            textStyle,
          ]}
        >
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

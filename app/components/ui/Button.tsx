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

const isIOS = Platform.OS === 'ios';
const NO_BREAK_SPACE = ' ';

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
      secondary: { backgroundColor: theme.dark ? theme.colors.border : theme.colors.background },
      outline: { backgroundColor: theme.dark ? theme.colors.border : theme.colors.background },
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
      // Android needs lineHeight >= 1.4 x fontSize or Cairo clips; iOS centres the
      // label itself and sits it high when it is given one.
      small: { ...typography.buttonSmall, fontSize: 14, lineHeight: isIOS ? undefined : 20 },
      medium: { ...typography.button, fontSize: 15, lineHeight: isIOS ? undefined : 21 },
      large: { ...typography.button, fontSize: 16, lineHeight: isIOS ? undefined : 23 },
    };

    const variantStyles: Record<ButtonVariant, TextStyle> = {
      primary: { color: theme.colors.onPrimary },
      secondary: { color: theme.colors.text },
      outline: { color: theme.colors.text },
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
            variant === 'ghost'
              ? theme.colors.primary
              : variant === 'secondary' || variant === 'outline'
                ? theme.colors.text
                : variant === 'primary'
                  ? theme.colors.onPrimary
                  : '#ffffff'
          }
        />
      );
    }

    return (
      <>
        {icon && iconPosition === 'left' && icon}
        <Text style={[getTextStyle(), textStyle]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {title.replace(/ /g, NO_BREAK_SPACE)}
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

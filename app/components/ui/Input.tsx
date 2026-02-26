import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@theme/ThemeProvider';
import { useRTL } from '@i18n/RTLProvider';
import { spacing, borderRadius } from '@theme/spacing';
import { typography, fontSize } from '@theme/typography';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

export function Input({
  label,
  error,
  hint,
  containerStyle,
  leftIcon,
  rightIcon,
  onRightIconPress,
  secureTextEntry,
  ...inputProps
}: InputProps) {
  const { theme } = useTheme();
  const { isRTL } = useRTL();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleTogglePassword = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const borderColor = error
    ? theme.colors.danger
    : isFocused
      ? '#7c63fd'
      : theme.colors.inputBorder;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text
          style={[
            styles.label,
            { color: theme.colors.text, textAlign: isRTL ? 'right' : 'left' },
          ]}
        >
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            flexDirection: isRTL ? 'row-reverse' : 'row',
            backgroundColor: theme.dark ? theme.colors.inputBackground : '#fff',
            borderColor,
            borderWidth: isFocused ? 1.5 : 1,
          },
        ]}
      >
        {leftIcon && (
          <View style={isRTL ? { marginLeft: spacing.sm } : { marginRight: spacing.sm }}>
            {leftIcon}
          </View>
        )}

        <TextInput
          style={[
            styles.input,
            {
              color: theme.colors.inputText,
              textAlign: isRTL ? 'right' : 'left',
            },
          ]}
          placeholderTextColor={theme.colors.inputPlaceholder}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          {...inputProps}
        />

        {secureTextEntry && (
          <TouchableOpacity
            onPress={handleTogglePassword}
            style={isRTL ? { marginRight: spacing.sm } : { marginLeft: spacing.sm }}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.colors.textMuted}
            />
          </TouchableOpacity>
        )}

        {rightIcon && !secureTextEntry && (
          <TouchableOpacity
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            style={isRTL ? { marginRight: spacing.sm } : { marginLeft: spacing.sm }}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <Text style={[styles.error, { textAlign: isRTL ? 'right' : 'left' }]}>
          {error}
        </Text>
      )}
      {hint && !error && (
        <Text style={[styles.hint, { color: theme.colors.textMuted, textAlign: isRTL ? 'right' : 'left' }]}>
          {hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  inputContainer: {
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: fontSize.base,
  },
  error: {
    ...typography.caption,
    color: '#F46A6A',
    marginTop: spacing.xs,
  },
  hint: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});

export default Input;

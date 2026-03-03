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
  I18nManager,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@theme/ThemeProvider';
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
            { color: theme.colors.text },
          ]}
        >
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.dark ? theme.colors.inputBackground : '#fff',
            borderColor,
            borderWidth: isFocused ? 1.5 : 1,
          },
        ]}
      >
        {leftIcon && (
          <View style={{ marginEnd: spacing.sm }}>
            {leftIcon}
          </View>
        )}

        <TextInput
          style={{
            flex: 1,
            height: 50,
            fontSize: fontSize.base,
            fontFamily: 'Cairo_400Regular',
            color: theme.colors.inputText,
            textAlign: I18nManager.isRTL ? 'right' : 'left',
            writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
          }}
          placeholderTextColor={theme.colors.inputPlaceholder}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          {...inputProps}
        />

        {secureTextEntry && (
          <TouchableOpacity
            onPress={handleTogglePassword}
            style={{ marginStart: spacing.sm }}
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
            style={{ marginStart: spacing.sm }}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <Text style={styles.error}>
          {error}
        </Text>
      )}
      {hint && !error && (
        <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
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
    fontFamily: 'Cairo_600SemiBold',
    marginBottom: spacing.sm,
    textAlign: 'left',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
  },
  error: {
    ...typography.caption,
    color: '#F46A6A',
    marginTop: spacing.xs,
    textAlign: 'left',
  },
  hint: {
    ...typography.caption,
    marginTop: spacing.xs,
    textAlign: 'left',
  },
});

export default Input;

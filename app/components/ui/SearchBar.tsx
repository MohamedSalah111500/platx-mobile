import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { typography, fontSize } from '../../theme/typography';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  radius?: number;
  style?: ViewStyle;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder,
  onSubmit,
  radius = 999,
  style,
}: SearchBarProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card,
          borderRadius: radius,
        },
        style,
      ]}
    >
      <Ionicons name="search" size={20} color={theme.colors.textMuted} />
      <TextInput
        style={[styles.input, { color: theme.colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')} activeOpacity={0.6}>
          <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    height: 48,
  },
  input: {
    flex: 1,
    marginStart: spacing.sm,
    paddingVertical: 0,
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: fontSize.sm,
    textAlign: 'left',
  },
});

export default SearchBar;

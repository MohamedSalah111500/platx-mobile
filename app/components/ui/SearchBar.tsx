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
  /** Border radius — defaults to 14 */
  radius?: number;
  style?: ViewStyle;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder,
  onSubmit,
  radius = 14,
  style,
}: SearchBarProps) {
  const { theme, isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? theme.colors.surface : theme.colors.card,
          borderRadius: radius,
          borderColor: isDark ? theme.colors.border : '#F0F0F0',
        },
        style,
      ]}
    >
      <Ionicons name="search" size={18} color={theme.colors.textMuted} />
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
    height: 44,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    marginLeft: spacing.sm,
    paddingVertical: 0,
    ...typography.bodySmall,
    fontSize: fontSize.base,
  },
});

export default SearchBar;

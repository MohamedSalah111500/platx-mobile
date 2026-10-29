import React, { memo } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontFamily, fontSize } from '../../theme/typography';

interface ChipProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  onPress: () => void;
}

function ChipBase({ label, icon, active = false, onPress }: ChipProps) {
  const { theme, isDark } = useTheme();
  const background = active ? theme.colors.text : theme.colors.card;
  const foreground = active ? (isDark ? theme.colors.background : '#FFFFFF') : theme.colors.text;

  return (
    <TouchableOpacity
      style={[styles.chip, { backgroundColor: background }]}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      {icon ? <Ionicons name={icon} size={18} color={active ? foreground : theme.colors.primary} /> : null}
      <Text style={[styles.label, { color: foreground }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
  },
  label: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, textAlign: 'left' },
});

export const Chip = memo(ChipBase);
export default Chip;

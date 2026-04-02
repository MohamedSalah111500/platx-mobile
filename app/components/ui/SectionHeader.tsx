import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface SectionHeaderProps {
  title: string;
  onSeeAll?: () => void;
  seeAllLabel?: string;
  style?: ViewStyle;
}

export function SectionHeader({ title, onSeeAll, seeAllLabel, style }: SectionHeaderProps) {
  const { theme } = useTheme();
  const { t } = useRTL();

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity activeOpacity={0.7} onPress={onSeeAll}>
          <Text style={[styles.seeAll, { color: theme.colors.primary }]}>
            {seeAllLabel || t('common.seeAll')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h4,
    fontFamily: 'Cairo_700Bold',
  },
  seeAll: {
    ...typography.bodySmall,
    fontFamily: 'Cairo_600SemiBold',
  },
});

export default SectionHeader;

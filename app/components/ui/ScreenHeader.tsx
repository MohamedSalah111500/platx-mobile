import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface ScreenHeaderProps {
  title?: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  /** Use transparent variant for colored/hero backgrounds */
  transparent?: boolean;
  style?: ViewStyle;
}

export function ScreenHeader({ title, onBack, rightElement, transparent, style }: ScreenHeaderProps) {
  const { theme } = useTheme();
  const { isRTL } = useRTL();
  const insets = useSafeAreaInsets();

  const backBg = transparent
    ? 'rgba(255,255,255,0.15)'
    : theme.colors.card;

  const textColor = transparent ? '#FFFFFF' : theme.colors.text;
  const iconColor = transparent ? '#FFFFFF' : theme.colors.text;

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }, style]}>
      {onBack ? (
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: backBg }]}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isRTL ? 'arrow-forward' : 'arrow-back'}
            size={22}
            color={iconColor}
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.spacer} />
      )}

      {title ? (
        <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      {rightElement || <View style={styles.spacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.h4,
    fontFamily: 'Cairo_700Bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
  spacer: {
    width: 40,
  },
});

export default ScreenHeader;

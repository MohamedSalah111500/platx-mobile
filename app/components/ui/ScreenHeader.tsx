import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { BackButton } from './BackButton';

interface ScreenHeaderProps {
  title?: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  transparent?: boolean;
  style?: ViewStyle;
}

export function ScreenHeader({ title, onBack, rightElement, transparent, style }: ScreenHeaderProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }, style]}>
      {onBack ? <BackButton onPress={onBack} tone={transparent ? 'onColor' : 'surface'} /> : null}
      <Text
        style={[styles.title, { color: transparent ? '#FFFFFF' : theme.colors.text }]}
        numberOfLines={1}
      >
        {title ?? ''}
      </Text>
      {rightElement ?? null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.md,
    minHeight: 44,
  },
  title: {
    ...typography.screenTitle,
    flex: 1,
  },
});

export default ScreenHeader;

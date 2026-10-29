import React, { memo } from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';

interface BackButtonProps {
  onPress: () => void;
  tone?: 'surface' | 'onColor';
  style?: ViewStyle;
}

function BackButtonBase({ onPress, tone = 'surface', style }: BackButtonProps) {
  const { theme } = useTheme();
  const { isRTL, t } = useRTL();
  const onColor = tone === 'onColor';

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: onColor ? 'rgba(255,255,255,0.18)' : theme.colors.card }, style]}
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
    >
      <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color={onColor ? '#FFFFFF' : theme.colors.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});

export const BackButton = memo(BackButtonBase);
export default BackButton;

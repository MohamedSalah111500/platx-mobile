import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTheme } from '../../../theme/ThemeProvider';
import { useRTL } from '../../../i18n/RTLProvider';
import { spacing } from '../../../theme/spacing';
import { fontFamily, fontSize } from '../../../theme/typography';

const VISIBLE_MS = 2200;

export function HoldToRecordHint({ trigger }: { trigger: number }) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!trigger) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(200)}
      pointerEvents="none"
      style={[styles.tip, { backgroundColor: theme.colors.text }]}
    >
      <Text style={[styles.text, { color: theme.colors.background }]}>{t('chat.voice.holdToRecord')}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tip: {
    position: 'absolute',
    bottom: '100%',
    end: spacing.lg,
    marginBottom: spacing.sm,
    maxWidth: 280,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    zIndex: 4,
  },
  text: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, textAlign: 'left' },
});

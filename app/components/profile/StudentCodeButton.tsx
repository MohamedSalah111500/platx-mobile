import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { QrCode } from '../ui/QrCode';

export function StudentCodeButton({ code }: { code: string }) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
        style={styles.pill}
        accessibilityRole="button"
        accessibilityLabel={t('profile.showQr')}
      >
        <Ionicons name="qr-code" size={14} color="#FFFFFF" />
        <Text style={styles.pillText}>{code}</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.colors.card, marginBottom: insets.bottom }]}>
            <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>{t('profile.studentCode')}</Text>
            <View style={styles.qrFrame}>
              <QrCode value={code} size={240} />
            </View>
            <Text style={[styles.sheetCode, { color: theme.colors.text }]}>{code}</Text>
            <TouchableOpacity
              onPress={() => setOpen(false)}
              style={[styles.closeButton, { borderColor: theme.colors.border }]}
              accessibilityRole="button"
            >
              <Text style={[styles.closeText, { color: theme.colors.text }]}>{t('common.close')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.full,
  },
  pillText: {
    fontSize: 14,
    fontFamily: 'Cairo_700Bold',
    color: '#FFFFFF',
    letterSpacing: 1,
    writingDirection: 'ltr',
    textAlign: 'left',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    borderRadius: 24,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  sheetTitle: {
    ...typography.h3,
  },
  qrFrame: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  sheetCode: {
    fontSize: 28,
    fontFamily: 'Cairo_700Bold',
    letterSpacing: 2,
    writingDirection: 'ltr',
    textAlign: 'left',
  },
  closeButton: {
    alignSelf: 'stretch',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
  },
  closeText: {
    ...typography.button,
  },
});

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeProvider';
import { useRTL } from '../i18n/RTLProvider';
import { useUIStore } from '../store/ui.store';
import { spacing, borderRadius } from '../theme/spacing';
import { fontSize } from '../theme/typography';

/**
 * Optional-update prompt: a new store version exists but the installed one still
 * works. Sits above the tab bar, can be dismissed for the session, and is never
 * shown while the blocking update screen is up.
 */
export default function UpdateAvailableBanner() {
  const { theme } = useTheme();
  const { t } = useRTL();
  const insets = useSafeAreaInsets();
  const updateAvailable = useUIStore((s) => s.updateAvailable);
  const dismiss = useUIStore((s) => s.dismissUpdateAvailable);

  const openStore = useCallback(async () => {
    const url = updateAvailable?.storeUrl;
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('common.error'), t('updateRequired.storeFailed'));
    }
  }, [updateAvailable?.storeUrl, t]);

  if (!updateAvailable) return null;

  return (
    <View style={[styles.wrapper, { bottom: insets.bottom + 90 }]} pointerEvents="box-none">
      <View style={[styles.banner, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={[styles.icon, { backgroundColor: theme.colors.primary + '1A' }]}>
          <Ionicons name="arrow-up-circle-outline" size={20} color={theme.colors.primary} />
        </View>
        <View style={styles.texts}>
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
            {t('updateAvailable.title')}
          </Text>
          <Text style={[styles.body, { color: theme.colors.textMuted }]} numberOfLines={2}>
            {t('updateAvailable.message', { version: updateAvailable.latestVersion })}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.action, { backgroundColor: theme.colors.primary }]}
          onPress={openStore}
          activeOpacity={0.8}
        >
          <Text style={styles.actionText}>{t('updateAvailable.update')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={dismiss} hitSlop={10} style={styles.close}>
          <Ionicons name="close" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    start: 0,
    end: 0,
    paddingHorizontal: spacing.lg,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1 },
  title: { fontSize: fontSize.sm, fontFamily: 'Cairo_700Bold' },
  body: { fontSize: fontSize.xs, fontFamily: 'Cairo_400Regular' },
  action: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
  },
  actionText: { color: '#fff', fontSize: fontSize.xs, fontFamily: 'Cairo_700Bold' },
  close: { padding: 2 },
});

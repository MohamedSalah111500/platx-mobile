import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Image, Linking, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeProvider';
import { useRTL } from '../i18n/RTLProvider';
import { useUIStore } from '../store/ui.store';
import { Button } from '../components/ui/Button';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';

export default function UpdateRequiredScreen() {
  const { theme } = useTheme();
  const { t } = useRTL();
  const insets = useSafeAreaInsets();
  const updateRequired = useUIStore((s) => s.updateRequired);

  const openStore = useCallback(async () => {
    const url = updateRequired?.storeUrl;
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('common.error'), t('updateRequired.storeFailed'));
    }
  }, [updateRequired?.storeUrl, t]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top + spacing['2xl'], paddingBottom: insets.bottom + spacing.xl },
      ]}
    >
      <View style={styles.content}>
        <Image source={require('../../assets/images/logo-icon.png')} style={styles.logo} resizeMode="contain" />

        <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryLight }]}>
          <Ionicons name="cloud-download-outline" size={40} color={theme.colors.primary} />
        </View>

        <Text style={[styles.title, { color: theme.colors.text }]}>{t('updateRequired.title')}</Text>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{t('updateRequired.body')}</Text>

        <View style={[styles.versions, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.versionRow}>
            <Text style={[styles.versionLabel, { color: theme.colors.textMuted }]}>{t('updateRequired.current')}</Text>
            <Text style={[styles.versionValue, { color: theme.colors.text }]}>{updateRequired?.currentVersion}</Text>
          </View>
          <View style={[styles.versionDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.versionRow}>
            <Text style={[styles.versionLabel, { color: theme.colors.textMuted }]}>{t('updateRequired.latest')}</Text>
            <Text style={[styles.versionValue, { color: theme.colors.primary }]}>{updateRequired?.latestVersion}</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Button title={t('updateRequired.update')} onPress={openStore} size="large" fullWidth icon={<Ionicons name="arrow-down-circle" size={20} color="#fff" />} />
        <Text style={[styles.hint, { color: theme.colors.textMuted }]}>{t('updateRequired.hint')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'space-between' },
  content: { alignItems: 'center', gap: spacing.md },
  logo: { width: 72, height: 72, marginBottom: spacing.sm },
  iconWrap: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  title: { ...typography.screenTitle, textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 24, fontFamily: 'Cairo_400Regular', textAlign: 'center', maxWidth: 340 },
  versions: { width: '100%', borderRadius: borderRadius.xl, borderWidth: 1, marginTop: spacing.md, overflow: 'hidden' },
  versionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  versionDivider: { height: 1 },
  versionLabel: { fontSize: 14, fontFamily: 'Cairo_500Medium' },
  versionValue: { fontSize: 16, fontFamily: 'Cairo_700Bold' },
  footer: { gap: spacing.md },
  hint: { fontSize: 13, textAlign: 'center', fontFamily: 'Cairo_400Regular' },
});

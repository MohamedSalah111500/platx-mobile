import React, { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../../theme/ThemeProvider';
import { useRTL } from '../../../i18n/RTLProvider';
import { useAuth } from '../../../hooks/useAuth';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Spinner } from '../../../components/ui/Spinner';
import { ErrorRetry } from '../../../components/ui/ErrorRetry';
import { Button } from '../../../components/ui/Button';
import { SwitchField } from '../../../components/ui/SwitchField';
import { spacing, borderRadius } from '../../../theme/spacing';
import { fontSize } from '../../../theme/typography';
import { useTabBarSpace } from '../../../navigation/tabBar';
import { storeApi, type StoreSettings } from '../../../services/api/store.api';
import { StoreManageTabs } from './StoreOrdersScreen';
import type { ProfileStackParamList } from '../../../types/navigation.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'StoreSettings'>;

const KEYS: (keyof StoreSettings)[] = ['enabled', 'acceptPoints', 'acceptCashOnDelivery', 'acceptTransfer', 'showOnLanding'];

export default function StoreSettingsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const { isAdmin } = useAuth();
  const tabBarSpace = useTabBarSpace();

  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [draft, setDraft] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const fresh = await storeApi.settings();
      setSettings(fresh);
      setDraft(fresh);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.code === 'FEATURE_DISABLED' ? t('store.ADDON_OFF_HINT_OWNER') : err?.userMessage || t('store.LOAD_FAILED'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    if (isAdmin) load();
    else setLoading(false);
  }, [isAdmin, load]);

  const dirty = !!settings && !!draft && KEYS.some((key) => draft[key] !== settings[key]);
  const noPayment = !!draft && draft.enabled && !draft.acceptPoints && !draft.acceptCashOnDelivery && !draft.acceptTransfer;

  const set = (key: keyof StoreSettings, value: boolean) => setDraft((current) => (current ? { ...current, [key]: value } : current));

  const save = async () => {
    if (!draft || saving || noPayment || !dirty) return;
    setSaving(true);
    try {
      const saved = await storeApi.saveSettings(draft);
      setSettings(saved);
      setDraft(saved);
      Alert.alert(t('common.success'), t('store.SETTINGS.SAVED'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('store.LOAD_FAILED'));
    } finally {
      setSaving(false);
    }
  };

  const muted = { color: theme.colors.textMuted };
  const text = { color: theme.colors.text };
  const card = [styles.card, { backgroundColor: theme.colors.card }];

  const renderBody = () => {
    if (!isAdmin) return null;
    if (loading) return <Spinner />;
    if (error || !draft) return <ErrorRetry message={error ?? t('store.LOAD_FAILED')} onRetry={() => { setLoading(true); load(); }} retryLabel={t('store.TRY_AGAIN')} />;

    return (
      <>
        <View style={card}>
          <SwitchField label={t('store.SETTINGS.ENABLED')} hint={t('store.SETTINGS.ENABLED_HINT')} value={draft.enabled} onChange={(value) => set('enabled', value)} />
        </View>
        <View style={card}>
          <Text style={[styles.section, text]}>{t('store.SETTINGS.PAYMENT')}</Text>
          <SwitchField label={t('store.PAYMENT.Points')} hint={t('store.SETTINGS.POINTS_HINT')} value={draft.acceptPoints} onChange={(value) => set('acceptPoints', value)} />
          <SwitchField
            label={t('store.PAYMENT.CashOnDelivery')}
            hint={t('store.SETTINGS.CASH_HINT')}
            value={draft.acceptCashOnDelivery}
            onChange={(value) => set('acceptCashOnDelivery', value)}
          />
          <SwitchField
            label={t('store.PAYMENT.Transfer')}
            hint={`${t('store.SETTINGS.TRANSFER_HINT')} ${t('store.SETTINGS.TRANSFER_ACCOUNTS')}`}
            value={draft.acceptTransfer}
            onChange={(value) => set('acceptTransfer', value)}
          />
          {noPayment ? <Text style={[styles.meta, { color: theme.colors.danger }]}>{t('store.SETTINGS.PAYMENT_REQUIRED')}</Text> : null}
        </View>
        <View style={card}>
          <SwitchField
            label={t('store.SETTINGS.SHOW_ON_LANDING')}
            hint={t('store.SETTINGS.SHOW_ON_LANDING_HINT')}
            value={draft.showOnLanding}
            onChange={(value) => set('showOnLanding', value)}
          />
        </View>
        {dirty ? <Text style={[styles.meta, muted]}>{t('store.SETTINGS.UNSAVED')}</Text> : null}
        <Button title={t('store.SAVE')} onPress={save} loading={saving} disabled={noPayment || !dirty} fullWidth />
        {dirty ? <Button title={t('store.SETTINGS.DISCARD')} variant="secondary" onPress={() => setDraft(settings)} disabled={saving} fullWidth /> : null}
      </>
    );
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]} edges={['bottom', 'left', 'right']}>
      <ScreenHeader title={t('store.PAGES.SETTINGS_TITLE')} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarSpace + spacing.lg }]}
        refreshControl={isAdmin ? <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.primary} /> : undefined}
      >
        <StoreManageTabs current="settings" onNavigate={(screen) => navigation.navigate(screen)} />
        <Text style={[styles.meta, muted]}>{t('store.PAGES.SETTINGS_SUBTITLE')}</Text>
        {renderBody()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  card: { borderRadius: borderRadius.xl, padding: spacing.lg, gap: spacing.sm },
  section: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', textAlign: 'left' },
  meta: { fontSize: 14, fontFamily: 'Cairo_400Regular', textAlign: 'left' },
});

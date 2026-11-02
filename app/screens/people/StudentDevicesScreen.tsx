import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useDisplayFormat } from '../../hooks/useDisplayFormat';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { deviceProtectionApi } from '../../services/api/studentAccess.api';
import { parseServerDate } from '../../utils/date';
import type { DeviceSecurityEvent, StudentDevices, UserDevice } from '../../types/people.types';
import type { ProfileStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'StudentDevices'>;

const ACTIVITY_PAGE_SIZE = 10;

const PLATFORM_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  Android: 'logo-android',
  IOS: 'logo-apple',
  Web: 'globe-outline',
};

export default function StudentDevicesScreen({ navigation, route }: Props) {
  const { studentId } = route.params;
  const { theme } = useTheme();
  const { t } = useRTL();
  const { date, time } = useDisplayFormat();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [details, setDetails] = useState<StudentDevices | null>(null);
  const [activity, setActivity] = useState<DeviceSecurityEvent[]>([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityPage, setActivityPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const [devices, events] = await Promise.all([
          deviceProtectionApi.getDevices(studentId),
          deviceProtectionApi.getActivity(studentId, 1, ACTIVITY_PAGE_SIZE),
        ]);
        setDetails(devices);
        setActivity(events.items);
        setActivityTotal(events.totalCount);
        setActivityPage(1);
      } catch (err: any) {
        setError(err?.userMessage || t('people.loadFailed'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [studentId, t]
  );

  useEffect(() => {
    load();
  }, [load]);

  const loadMoreActivity = async () => {
    setLoadingMore(true);
    try {
      const next = activityPage + 1;
      const events = await deviceProtectionApi.getActivity(studentId, next, ACTIVITY_PAGE_SIZE);
      setActivity((current) => [...current, ...events.items]);
      setActivityTotal(events.totalCount);
      setActivityPage(next);
    } catch {
    } finally {
      setLoadingMore(false);
    }
  };

  const confirm = (message: string, action: () => Promise<void>, destructive = true) =>
    Alert.alert(t('common.confirm'), message, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        style: destructive ? 'destructive' : 'default',
        onPress: async () => {
          try {
            await action();
            Alert.alert(t('common.success'), t('people.devices.done'));
            load('refresh');
          } catch (err: any) {
            Alert.alert(t('common.error'), err?.userMessage || t('people.saveFailed'));
          }
        },
      },
    ]);

  const label = (prefix: string, key: string) => {
    const full = `people.devices.${prefix}.${key}`;
    const value = t(full);
    return value === full ? key : value;
  };

  const renderDevice = (device: UserDevice) => {
    const active = device.status === 'Active';
    return (
      <View key={device.id} style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <View style={styles.cardTop}>
          <Ionicons name={PLATFORM_ICON[device.platform] ?? 'phone-portrait-outline'} size={24} color={theme.colors.primary} />
          <View style={styles.flex}>
            <Text style={styles.title} numberOfLines={1}>{device.deviceName || t('people.devices.unnamed')}</Text>
            <Text style={styles.meta}>
              {[device.platform, device.appVersion ? `v${device.appVersion}` : null].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: (active ? theme.colors.success : theme.colors.textMuted) + '1A' }]}>
            <Text style={[styles.pillText, { color: active ? theme.colors.success : theme.colors.textMuted }]}>
              {label('status', device.status)}
            </Text>
          </View>
        </View>
        <Text style={styles.meta}>{`${t('people.devices.firstSeen')}: ${date(parseServerDate(device.firstSeenAt))}`}</Text>
        <Text style={styles.meta}>{`${t('people.devices.lastSeen')}: ${date(parseServerDate(device.lastSeenAt))}`}</Text>
        {active ? (
          <Button
            title={t('people.devices.remove')}
            variant="danger"
            size="small"
            onPress={() => confirm(t('people.devices.confirmRemove'), () => deviceProtectionApi.removeDevice(studentId, device.id))}
          />
        ) : null}
      </View>
    );
  };

  if (loading || error || !details) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('people.devices.title')} onBack={() => navigation.goBack()} />
        {loading ? <Spinner /> : <ErrorRetry message={error ?? ''} onRetry={() => load()} />}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('people.devices.title')} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing['3xl'] }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load('refresh')}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
            progressBackgroundColor={theme.colors.card}
          />
        }
      >
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Text style={styles.title}>{details.studentName}</Text>
          <Text style={styles.meta}>
            {details.deviceProtectionEnabled
              ? `${t('people.devices.registered')}: ${details.activeDeviceCount} / ${details.maxDevices}`
              : t('people.devices.disabledHint')}
          </Text>
          {details.isBlocked ? (
            <View style={[styles.pill, styles.selfStart, { backgroundColor: theme.colors.danger + '1A' }]}>
              <Text style={[styles.pillText, { color: theme.colors.danger }]}>{t('people.devices.blocked')}</Text>
            </View>
          ) : null}
          <Button
            title={t('people.devices.revokeSessions')}
            variant="secondary"
            onPress={() => confirm(t('people.devices.confirmRevoke'), () => deviceProtectionApi.revokeSessions(studentId))}
          />
          {details.isBlocked ? (
            <Button
              title={t('people.devices.unblock')}
              onPress={() => confirm(t('people.devices.confirmUnblock'), () => deviceProtectionApi.unblock(studentId), false)}
            />
          ) : (
            <Button
              title={t('people.devices.block')}
              variant="danger"
              onPress={() => confirm(t('people.devices.confirmBlock'), () => deviceProtectionApi.block(studentId))}
            />
          )}
        </View>

        <Text style={styles.section}>{t('people.devices.listTitle')}</Text>
        {details.devices.length ? details.devices.map(renderDevice) : <Text style={styles.empty}>{t('people.devices.empty')}</Text>}

        <Text style={styles.section}>{t('people.devices.activityTitle')}</Text>
        {activity.length ? (
          activity.map((event) => (
            <View key={event.id} style={[styles.card, { backgroundColor: theme.colors.card }]}>
              <Text style={styles.title}>{label('events', event.eventType)}</Text>
              {event.reason && event.reason !== 'None' ? <Text style={styles.meta}>{label('reasons', event.reason)}</Text> : null}
              <Text style={styles.meta}>
                {[event.platform, `${date(parseServerDate(event.occurredAt))} ${time(parseServerDate(event.occurredAt))}`].join(' · ')}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>{t('people.devices.activityEmpty')}</Text>
        )}
        {activity.length < activityTotal ? (
          <Button title={t('people.loadMore')} variant="secondary" onPress={loadMoreActivity} loading={loadingMore} />
        ) : null}
      </ScrollView>
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { paddingHorizontal: spacing.xl, gap: spacing.sm },
    flex: { flex: 1 },
    card: { borderRadius: borderRadius.xl, padding: spacing.md, gap: spacing.sm },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    title: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', color: theme.colors.text, textAlign: 'left' },
    meta: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: theme.colors.textMuted, textAlign: 'left' },
    pill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
    selfStart: { alignSelf: 'flex-start' },
    pillText: { fontSize: 14, fontFamily: 'Cairo_600SemiBold' },
    section: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: theme.colors.textMuted, textAlign: 'left', marginTop: spacing.md },
    empty: { fontSize: fontSize.sm, fontFamily: 'Cairo_400Regular', color: theme.colors.textMuted, textAlign: 'center', paddingVertical: spacing.md },
  });
}

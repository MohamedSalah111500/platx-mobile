import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParentStackParamList } from '../../types/navigation.types';
import type { GuardianAttendance, GuardianAttendanceItem } from '../../types/guardian.types';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { guardianApi } from '../../services/api/guardian.api';
import { SESSION_STATUS } from '../../services/api/sessions.api';
import { selectCurrentChild, useParentStore } from '../../store/parent.store';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { Theme } from '../../theme/themes';
import { attendanceColor, formatSessionDate } from '../sessions/sessionFormat';
import { COUNT_KEYS } from './parentFormat';
import { useLinkRevoked } from './parentHooks';

type Props = NativeStackScreenProps<ParentStackParamList, 'ParentAttendance'>;

export default function ParentAttendanceScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t, locale } = useRTL();
  const child = useParentStore(selectCurrentChild);
  const onLinkRevoked = useLinkRevoked();
  const [data, setData] = useState<GuardianAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const generation = useRef(0);
  const childId = child?.studentId ?? null;

  const load = useCallback(async () => {
    const current = ++generation.current;
    if (childId == null) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const result = await guardianApi.attendance(childId);
      if (current !== generation.current) return;
      setData(result);
      setFailed(false);
    } catch (error) {
      if (current !== generation.current) return;
      if (!onLinkRevoked(error)) setFailed(true);
    } finally {
      if (current === generation.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [childId, onLinkRevoked]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const styles = createStyles(theme);

  const renderItem = ({ item }: { item: GuardianAttendanceItem }) => {
    const color = item.status ? attendanceColor(item.status, theme.colors) : theme.colors.textMuted;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={[styles.badge, { backgroundColor: color + '1F' }]}>
            <Text style={[styles.badgeText, { color }]}>
              {item.status ? t(`sessions.attendance.${item.status}`) : t('parent.notRecorded')}
            </Text>
          </View>
        </View>
        <Text style={styles.meta}>
          {formatSessionDate(item.startsAt, locale)}
          {item.sessionStatus === SESSION_STATUS.Cancelled ? ` · ${t('sessions.status.2')}` : ''}
        </Text>
      </View>
    );
  };

  const header = data ? (
    <View style={styles.countsRow}>
      {COUNT_KEYS.map(({ status, key }) => {
        const color = attendanceColor(status, theme.colors);
        return (
          <View key={key} style={[styles.countBox, { backgroundColor: color + '1F' }]}>
            <Text style={[styles.countValue, { color }]}>{data.counts[key]}</Text>
            <Text style={[styles.countLabel, { color }]} numberOfLines={1}>
              {t(`sessions.attendance.${status}`)}
            </Text>
          </View>
        );
      })}
    </View>
  ) : null;

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('parent.attendance')} onBack={() => navigation.goBack()} />
      {loading ? (
        <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
      ) : failed && !data ? (
        <ErrorRetry
          message={t('parent.loadFailed')}
          onRetry={() => {
            setLoading(true);
            load();
          }}
        />
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(item) => String(item.sessionId)}
          renderItem={renderItem}
          ListHeaderComponent={header}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={<EmptyState title={t('parent.noAttendance')} />}
        />
      )}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loader: {
      marginTop: spacing['3xl'],
    },
    list: {
      padding: spacing.lg,
      paddingBottom: spacing['3xl'],
    },
    countsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    countBox: {
      flex: 1,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    countValue: {
      ...typography.h4,
      fontFamily: 'Cairo_700Bold',
    },
    countLabel: {
      ...typography.bodySmall,
    },
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: 20,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    title: {
      ...typography.h4,
      flex: 1,
      color: theme.colors.text,
    },
    badge: {
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: 2,
    },
    badgeText: {
      ...typography.bodySmall,
    },
    meta: {
      ...typography.bodySmall,
      color: theme.colors.textMuted,
    },
  });
}

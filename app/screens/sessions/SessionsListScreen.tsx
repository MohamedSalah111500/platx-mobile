import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../types/navigation.types';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { SESSION_STATUS, sessionsApi, type SessionListItem } from '../../services/api/sessions.api';
import { formatSessionDate } from './sessionFormat';

const PAGE_SIZE = 50;

type Props = NativeStackScreenProps<ProfileStackParamList, 'Sessions'>;

function today(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T00:00:00`;
}

export default function SessionsListScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t, locale } = useRTL();
  const [items, setItems] = useState<SessionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const loadingMore = useRef(false);
  const generation = useRef(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const current = ++generation.current;
    try {
      const first = await sessionsApi.list(1, PAGE_SIZE, today());
      if (current !== generation.current) return;
      setItems(first.items);
      setTotal(first.totalCount);
      setPage(1);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const loadMore = async () => {
    if (loadingMore.current || failed || items.length >= total) return;
    loadingMore.current = true;
    const current = generation.current;
    try {
      const next = await sessionsApi.list(page + 1, PAGE_SIZE, today());
      if (current !== generation.current) return;
      setItems((current) => [...current, ...next.items.filter((item) => !current.some((c) => c.id === item.id))]);
      setPage(page + 1);
    } catch {
    } finally {
      loadingMore.current = false;
    }
  };

  const statusColor = (item: SessionListItem): string =>
    item.status === SESSION_STATUS.Completed ? theme.colors.success : item.status === SESSION_STATUS.Cancelled ? theme.colors.danger : theme.colors.primary;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title={t('sessions.title')} onBack={() => navigation.goBack()} />
      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing['3xl'] }} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['3xl'] }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={<Text style={[styles.hint, { color: theme.colors.textMuted }]}>{t('sessions.upcomingHint')}</Text>}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.colors.textMuted }]}>
              {failed ? t('sessions.loadFailed') : t('sessions.upcomingEmpty')}
            </Text>
          }
          renderItem={({ item }) => {
            const color = statusColor(item);
            return (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.colors.card }]}
                onPress={() => navigation.navigate('SessionAttendance', { sessionId: item.id, title: item.title })}
                accessibilityRole="button"
              >
                <View style={[styles.icon, { backgroundColor: color + '1F' }]}>
                  <Ionicons name="easel" size={20} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>{item.title}</Text>
                  <Text style={[styles.meta, { color: theme.colors.textMuted }]}>{formatSessionDate(item.startsAt, locale)}</Text>
                  <Text style={[styles.meta, { color: theme.colors.textMuted }]} numberOfLines={1}>
                    {item.audience === 1 ? t('sessions.allStudents') : item.targetNames.join('، ')}
                  </Text>
                </View>
                <View style={styles.side}>
                  <Text style={[styles.count, { color: theme.colors.success }]}>{item.counts.present + item.counts.late}</Text>
                  <Text style={[styles.meta, { color: theme.colors.textMuted }]}>{t('sessions.attended')}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hint: {
    ...typography.bodySmall,
    marginBottom: spacing.md,
  },
  card: {
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h4,
  },
  meta: {
    ...typography.bodySmall,
  },
  side: {
    alignItems: 'center',
  },
  count: {
    ...typography.h3,
  },
  empty: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing['3xl'],
  },
});

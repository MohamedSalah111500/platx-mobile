import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../types/navigation.types';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
  ATTENDANCE_STATUS,
  SESSION_STATUS,
  isUnlocked,
  sessionsApi,
  type MySession,
  type SessionContent,
} from '../../services/api/sessions.api';
import { attendanceColor, formatSessionDate } from './sessionFormat';

const PAGE_SIZE = 20;

type Props = NativeStackScreenProps<ProfileStackParamList, 'MySessions'>;

export default function MySessionsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t, locale } = useRTL();
  const [items, setItems] = useState<MySession[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const loadingMore = useRef(false);
  const generation = useRef(0);

  const load = useCallback(async () => {
    const current = ++generation.current;
    try {
      const first = await sessionsApi.mine(1, PAGE_SIZE);
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

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    if (loadingMore.current || failed || items.length >= total) return;
    loadingMore.current = true;
    const current = generation.current;
    try {
      const next = await sessionsApi.mine(page + 1, PAGE_SIZE);
      if (current !== generation.current) return;
      setItems((current) => [...current, ...next.items.filter((item) => !current.some((c) => c.id === item.id))]);
      setPage(page + 1);
    } catch {
    } finally {
      loadingMore.current = false;
    }
  };

  const openContent = (content: SessionContent) => {
    navigation.getParent()?.navigate('HomeTab', { screen: 'CourseDetail', params: { courseId: content.courseId }, initial: false });
  };

  const lockedText = (session: MySession): string => {
    if (session.status === SESSION_STATUS.Cancelled) return t('sessions.contentCancelled');
    if (session.myStatus === ATTENDANCE_STATUS.Absent || session.myStatus === ATTENDANCE_STATUS.Excused) return t('sessions.contentMissed');
    return t('sessions.contentLocked');
  };

  const renderItem = ({ item }: { item: MySession }) => {
    const open = isUnlocked(item);
    const color = item.myStatus ? attendanceColor(item.myStatus, theme.colors) : theme.colors.textMuted;
    return (
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={[styles.badge, { backgroundColor: color + '1F' }]}>
            <Text style={[styles.badgeText, { color }]}>
              {item.myStatus ? t(`sessions.attendance.${item.myStatus}`) : t('sessions.notRecorded')}
            </Text>
          </View>
        </View>
        <Text style={[styles.meta, { color: theme.colors.textMuted }]}>
          {formatSessionDate(item.startsAt, locale)}
          {item.status === SESSION_STATUS.Cancelled ? ` · ${t('sessions.status.2')}` : ''}
        </Text>
        {!!item.location && <Text style={[styles.meta, { color: theme.colors.textMuted }]}>{item.location}</Text>}

        {item.contents.length > 0 && (
          <View style={[styles.contents, { borderTopColor: theme.colors.border }]}>
            <Text style={[styles.contentsTitle, { color: theme.colors.text }]}>
              {open ? t('sessions.contentOpen') : lockedText(item)}
            </Text>
            {open && !!item.contentViewLimit && (
              <Text style={[styles.meta, { color: theme.colors.textMuted }]}>{t('sessions.viewLimit', { count: item.contentViewLimit })}</Text>
            )}
            {item.contents.map((content, index) => {
              const label = [content.courseName, content.sectionTitle ?? content.lessonTitle].filter(Boolean).join(' · ');
              return open ? (
                <TouchableOpacity key={index} style={styles.contentRow} onPress={() => openContent(content)} accessibilityRole="button">
                  <Ionicons name="lock-open" size={16} color={theme.colors.primary} />
                  <Text style={[styles.contentText, { color: theme.colors.primary }]} numberOfLines={2}>{label}</Text>
                </TouchableOpacity>
              ) : (
                <View key={index} style={styles.contentRow}>
                  <Ionicons name="lock-closed" size={16} color={theme.colors.textMuted} />
                  <Text style={[styles.contentText, { color: theme.colors.textMuted }]} numberOfLines={2}>{label}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title={t('sessions.mine')} onBack={() => navigation.goBack()} />
      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing['3xl'] }} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['3xl'] }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.colors.textMuted }]}>
              {failed ? t('sessions.loadFailed') : t('sessions.mineEmpty')}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
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
  },
  contents: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  contentsTitle: {
    ...typography.bodySmall,
    fontFamily: 'Cairo_600SemiBold',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  contentText: {
    ...typography.bodySmall,
    flex: 1,
  },
  empty: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing['3xl'],
  },
});

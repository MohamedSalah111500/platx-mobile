import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { CourseAvailabilityBadge } from '../../components/course/CourseAvailabilityBadge';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { coursesApi } from '../../services/api/courses.api';
import { ENROLLMENT_STATUS, type EnrollmentHistoryItem } from '../../types/course.types';
import type { HomeStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<HomeStackParamList, 'CourseStudents'>;

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 600;
const SEARCH_MIN_CHARS = 2;

export default function CourseStudentsScreen({ navigation, route }: Props) {
  const { courseId, courseName } = route.params;
  const { theme } = useTheme();
  const { t } = useRTL();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<EnrollmentHistoryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (pageNum: number, term: string, mode: 'initial' | 'more' | 'refresh' = 'initial') => {
    try {
      setError(null);
      if (mode === 'initial') setLoading(true);
      if (mode === 'more') setLoadingMore(true);
      if (mode === 'refresh') setRefreshing(true);
      const res = await coursesApi.getEnrollmentHistory({ courseId, page: pageNum, size: PAGE_SIZE, search: term });
      setItems((prev) => (pageNum === 1 ? res.items : [...prev, ...res.items]));
      setTotalCount(res.totalCount);
      setPage(pageNum);
    } catch (err: any) {
      setError(err?.userMessage || t('courseStudents.loadFailed'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [courseId, t]);

  useEffect(() => {
    load(1, '');
  }, [load]);

  const onSearch = (text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const term = text.trim();
    if (term.length > 0 && term.length < SEARCH_MIN_CHARS) return;
    searchTimer.current = setTimeout(() => load(1, term), SEARCH_DEBOUNCE_MS);
  };

  const hasMore = items.length < totalCount;
  const onEndReached = () => {
    if (loading || loadingMore || !hasMore) return;
    load(page + 1, search.trim(), 'more');
  };

  const styles = useMemo(() => createStyles(theme), [theme]);

  const statusMeta = (status: number) => {
    switch (status) {
      case ENROLLMENT_STATUS.Completed:
        return { label: t('courseStudents.status.completed'), color: theme.colors.primary };
      case ENROLLMENT_STATUS.Suspended:
        return { label: t('courseStudents.status.suspended'), color: theme.colors.warning };
      case ENROLLMENT_STATUS.Cancelled:
        return { label: t('courseStudents.status.cancelled'), color: theme.colors.danger };
      default:
        return { label: t('courseStudents.status.active'), color: theme.colors.success };
    }
  };

  const initials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();

  const renderItem = ({ item }: { item: EnrollmentHistoryItem }) => {
    const status = statusMeta(item.status);
    const progress = Math.max(0, Math.min(100, Math.round(item.progressPercentage ?? 0)));
    return (
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(item.studentName || '?')}</Text>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.name} numberOfLines={1}>{item.studentName}</Text>
            <View style={[styles.statusPill, { backgroundColor: status.color + '1A' }]}>
              <View style={[styles.statusDot, { backgroundColor: status.color }]} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
          {item.studentEmail ? <Text style={styles.email} numberOfLines={1}>{item.studentEmail}</Text> : null}
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={13} color={theme.colors.textMuted} />
            <Text style={styles.metaText}>
              {t('courseStudents.enrolledOn')} {new Date(item.enrollmentDate).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: theme.colors.primary }]} />
            </View>
            <Text style={styles.progressText}>{progress}%</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('courseStudents.title')} onBack={() => navigation.goBack()} />
      <View style={styles.headerBlock}>
        {courseName ? <Text style={styles.courseName} numberOfLines={1}>{courseName}</Text> : null}
        <View style={styles.summaryRow}>
          <Text style={styles.summary}>{t('courseStudents.count', { count: totalCount })}</Text>
          {items[0]?.courseAvailability ? (
            <CourseAvailabilityBadge availability={items[0].courseAvailability} forManager />
          ) : null}
        </View>
        <Input value={search} onChangeText={onSearch} placeholder={t('courseStudents.search')} autoCapitalize="none" />
      </View>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorRetry message={error} onRetry={() => load(1, search.trim())} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing['3xl'] }]}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, search.trim(), 'refresh')} tintColor={theme.colors.primary} colors={[theme.colors.primary]} progressBackgroundColor={theme.colors.card} />}
          ListEmptyComponent={<EmptyState title={t('courseStudents.empty')} message={search ? t('common.noResults') : t('courseStudents.emptyHint')} />}
          ListFooterComponent={loadingMore ? <Spinner size="small" /> : null}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    headerBlock: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.md },
    courseName: { fontSize: fontSize.base, fontFamily: 'Cairo_600SemiBold', color: theme.colors.textSecondary },
    summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    summary: { fontSize: fontSize.sm, fontFamily: 'Cairo_500Medium', color: theme.colors.textMuted },
    list: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
    card: {
      flexDirection: 'row',
      gap: spacing.md,
      backgroundColor: theme.colors.card,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: spacing.md,
    },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: fontSize.sm, fontFamily: 'Cairo_700Bold', color: theme.colors.primary },
    cardBody: { flex: 1, gap: 4 },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    name: { flex: 1, fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', color: theme.colors.text },
    email: { fontSize: fontSize.sm, fontFamily: 'Cairo_400Regular', color: theme.colors.textMuted },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: fontSize.xs, fontFamily: 'Cairo_600SemiBold' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: fontSize.xs, fontFamily: 'Cairo_400Regular', color: theme.colors.textMuted },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
    progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: theme.colors.border, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },
    progressText: { fontSize: fontSize.xs, fontFamily: 'Cairo_600SemiBold', color: theme.colors.textSecondary, minWidth: 34, textAlign: 'center' },
  });
}

import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useAuth } from '../../hooks/useAuth';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { spacing } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { examApi } from '../../services/api/exam.api';
import type { ExamsStackParamList } from '../../types/navigation.types';
import type { ExamHistoryItem } from '../../types/exam.types';

import { appDateLocale } from '../../utils/dateLocale';
type Props = NativeStackScreenProps<ExamsStackParamList, 'MyExams'>;

const PAGE_SIZE = 20;

export default function MyExamsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t, isRTL } = useRTL();
  const { user } = useAuth();
  const [items, setItems] = useState<ExamHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingMore = useRef(false);

  const load = useCallback(
    async (p: number) => {
      try {
        setError(null);
        const result = await examApi.getExamHistory(user?.studentId ?? 0, p, PAGE_SIZE);
        setItems(prev => (p === 1 ? result.items : [...prev, ...result.items]));
        setHasMore(p * PAGE_SIZE < result.totalCount);
        setPage(p);
      } catch (err: any) {
        setError(err?.userMessage || t('myExams.loadFailed'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t, user?.studentId],
  );

  useFocusEffect(
    useCallback(() => {
      load(1);
    }, [load]),
  );

  const loadMore = () => {
    if (loadingMore.current || !hasMore || loading) return;
    loadingMore.current = true;
    load(page + 1).finally(() => {
      loadingMore.current = false;
    });
  };

  const statusOf = (item: ExamHistoryItem) => {
    if (item.resultStatus === 'Pass') return { label: t('myExams.passed'), color: theme.colors.success };
    if (item.resultStatus === 'Fail') return { label: t('myExams.failed'), color: theme.colors.danger };
    return { label: t('myExams.pending'), color: theme.colors.warning };
  };

  const renderItem = ({ item }: { item: ExamHistoryItem }) => {
    const status = statusOf(item);
    const graded = item.isAutoCorrect;
    const date = item.examDate ? new Date(item.examDate).toLocaleDateString(appDateLocale()) : '';
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.card }]}
        activeOpacity={graded ? 0.7 : 1}
        disabled={!graded}
        onPress={() => navigation.navigate('ExamResult', { examId: item.examId })}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardTitleWrap}>
            <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>
              {item.examName}
            </Text>
            <Text style={[styles.meta, { color: theme.colors.textMuted }]} numberOfLines={1}>
              {[item.courseName, date].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <View style={[styles.chip, { backgroundColor: status.color + '1A' }]}>
            <Text style={[styles.chipText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        {graded ? (
          <>
            <View style={styles.scoreRow}>
              <Text style={[styles.score, { color: theme.colors.text }]}>
                {`${item.studentScore}/${item.totalMarks}`}
              </Text>
              <Text style={[styles.meta, { color: theme.colors.textMuted }]}>{Math.round(item.percentage)}%</Text>
            </View>
            <View style={[styles.track, { backgroundColor: theme.colors.border }]}>
              <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, item.percentage))}%`, backgroundColor: status.color }]} />
            </View>
            <View style={styles.footer}>
              <View style={styles.counts}>
                <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                <Text style={[styles.count, { color: theme.colors.text }]}>{item.correctAnswersCount}</Text>
                <Ionicons name="close-circle" size={18} color={theme.colors.danger} />
                <Text style={[styles.count, { color: theme.colors.text }]}>{item.incorrectAnswersCount}</Text>
              </View>
              <View style={styles.counts}>
                <Text style={[styles.link, { color: theme.colors.primary }]}>{t('myExams.viewDetails')}</Text>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={theme.colors.primary} />
              </View>
            </View>
          </>
        ) : (
          <Text style={[styles.meta, { color: theme.colors.textMuted }]}>{t('myExams.pendingHint')}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom', 'left', 'right']}>
      <ScreenHeader title={t('myExams.title')} onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined} />
      {loading && items.length === 0 ? (
        <Spinner />
      ) : error && items.length === 0 ? (
        <ErrorRetry message={error} onRetry={() => { setLoading(true); load(1); }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.studentExamId)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(1); }} />}
          ListHeaderComponent={
            <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{t('myExams.subtitle')}</Text>
          }
          ListEmptyComponent={<EmptyState icon={<Ionicons name="ribbon-outline" size={40} color={theme.colors.textMuted} />} title={t('myExams.empty')} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: spacing.lg, paddingBottom: 60, gap: spacing.md },
  subtitle: { fontSize: fontSize.sm, fontFamily: 'Cairo_500Medium', textAlign: 'left' },
  card: { borderRadius: 14, padding: spacing.md, gap: spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  cardTitleWrap: { flex: 1, gap: 2 },
  title: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', textAlign: 'left' },
  meta: { fontSize: fontSize.sm, fontFamily: 'Cairo_500Medium', textAlign: 'left' },
  chip: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10 },
  chipText: { fontSize: fontSize.sm, fontFamily: 'Cairo_700Bold', textAlign: 'left' },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  score: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', textAlign: 'left' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counts: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  count: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold', marginEnd: spacing.sm, textAlign: 'left' },
  link: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },
});

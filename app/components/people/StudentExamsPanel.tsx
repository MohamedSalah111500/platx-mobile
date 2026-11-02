import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useDisplayFormat } from '../../hooks/useDisplayFormat';
import { Spinner } from '../ui/Spinner';
import { ErrorRetry } from '../ui/ErrorRetry';
import { Button } from '../ui/Button';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { examApi } from '../../services/api/exam.api';
import { parseServerDate } from '../../utils/date';
import type { ExamHistoryItem } from '../../types/exam.types';

const PAGE_SIZE = 10;

interface Props {
  studentId: number;
  onOpenResult: (examId: number) => void;
}

export function StudentExamsPanel({ studentId, onOpenResult }: Props) {
  const { theme } = useTheme();
  const { t, isRTL } = useRTL();
  const { date, percent } = useDisplayFormat();
  const [items, setItems] = useState<ExamHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (pageNum: number) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const res = await examApi.getExamHistory(studentId, pageNum, PAGE_SIZE);
        setItems((prev) => (pageNum === 1 ? res.items : [...prev, ...res.items]));
        setTotal(res.totalCount);
        setPage(pageNum);
      } catch (err: any) {
        setError(err?.userMessage || t('people.loadFailed'));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [studentId, t]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const statusOf = (item: ExamHistoryItem) => {
    if (item.resultStatus === 'Pass') return { label: t('myExams.passed'), color: theme.colors.success };
    if (item.resultStatus === 'Fail') return { label: t('myExams.failed'), color: theme.colors.danger };
    return { label: t('myExams.pending'), color: theme.colors.warning };
  };

  if (loading) return <Spinner size="small" />;
  if (error && !items.length) return <ErrorRetry message={error} onRetry={() => load(1)} />;
  if (!items.length) return <Text style={[styles.empty, { color: theme.colors.textMuted }]}>{t('people.students.noExams')}</Text>;

  return (
    <View style={styles.list}>
      {items.map((item) => {
        const status = statusOf(item);
        const graded = item.isAutoCorrect;
        return (
          <TouchableOpacity
            key={item.studentExamId}
            style={[styles.card, { backgroundColor: theme.colors.card }]}
            activeOpacity={graded ? 0.7 : 1}
            disabled={!graded}
            onPress={() => onOpenResult(item.examId)}
          >
            <View style={styles.top}>
              <View style={styles.titleWrap}>
                <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={2}>{item.examName}</Text>
                <Text style={[styles.meta, { color: theme.colors.textMuted }]} numberOfLines={1}>
                  {[item.courseName, item.examDate ? date(parseServerDate(item.examDate)) : null].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <View style={[styles.pill, { backgroundColor: status.color + '1A' }]}>
                <Text style={[styles.pillText, { color: status.color }]}>{status.label}</Text>
              </View>
            </View>
            {graded ? (
              <View style={styles.scoreRow}>
                <Text style={[styles.score, { color: theme.colors.text }]}>{`${item.studentScore}/${item.totalMarks}`}</Text>
                <Text style={[styles.meta, { color: theme.colors.textMuted }]}>{percent(item.percentage)}</Text>
                <View style={styles.spacer} />
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.colors.textMuted} />
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
      {items.length < total ? (
        <Button title={t('people.loadMore')} variant="secondary" onPress={() => load(page + 1)} loading={loadingMore} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  empty: { fontSize: fontSize.sm, fontFamily: 'Cairo_400Regular', textAlign: 'center', paddingVertical: spacing.lg },
  card: { borderRadius: borderRadius.xl, padding: spacing.md, gap: spacing.xs },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  titleWrap: { flex: 1 },
  name: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', textAlign: 'left' },
  meta: { fontSize: 14, fontFamily: 'Cairo_400Regular', textAlign: 'left' },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
  pillText: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  score: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', textAlign: 'left' },
  spacer: { flex: 1 },
});

export default StudentExamsPanel;

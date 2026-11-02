import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useDisplayFormat } from '../../hooks/useDisplayFormat';
import { Spinner } from '../ui/Spinner';
import { ErrorRetry } from '../ui/ErrorRetry';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { coursesApi } from '../../services/api/courses.api';
import { parseServerDate } from '../../utils/date';
import { ENROLLMENT_STATUS, type EnrollmentHistoryItem } from '../../types/course.types';

export function StudentCoursesPanel({ studentId }: { studentId: number }) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const { date, percent } = useDisplayFormat();
  const [items, setItems] = useState<EnrollmentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await coursesApi.getStudentCourses(studentId));
    } catch (err: any) {
      setError(err?.userMessage || t('people.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [studentId, t]);

  useEffect(() => {
    load();
  }, [load]);

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

  if (loading) return <Spinner size="small" />;
  if (error) return <ErrorRetry message={error} onRetry={load} />;
  if (!items.length) return <Text style={[styles.empty, { color: theme.colors.textMuted }]}>{t('people.students.noCourses')}</Text>;

  return (
    <View style={styles.list}>
      {items.map((item) => {
        const status = statusMeta(item.status);
        const progress = Math.max(0, Math.min(100, Math.round(item.progressPercentage ?? 0)));
        return (
          <View key={item.id} style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <View style={styles.top}>
              <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={2}>{item.courseName}</Text>
              <View style={[styles.pill, { backgroundColor: status.color + '1A' }]}>
                <Text style={[styles.pillText, { color: status.color }]}>{status.label}</Text>
              </View>
            </View>
            <Text style={[styles.meta, { color: theme.colors.textMuted }]}>
              {`${t('courseStudents.enrolledOn')} ${date(parseServerDate(item.enrollmentDate))}`}
            </Text>
            <View style={styles.progressRow}>
              <View style={[styles.track, { backgroundColor: theme.colors.border }]}>
                <View style={[styles.fill, { width: `${progress}%`, backgroundColor: theme.colors.primary }]} />
              </View>
              <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>{percent(progress)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  empty: { fontSize: fontSize.sm, fontFamily: 'Cairo_400Regular', textAlign: 'center', paddingVertical: spacing.lg },
  card: { borderRadius: borderRadius.xl, padding: spacing.md, gap: 4 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  name: { flex: 1, fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', textAlign: 'left' },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
  pillText: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },
  meta: { fontSize: 14, fontFamily: 'Cairo_400Regular', textAlign: 'left' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});

export default StudentCoursesPanel;

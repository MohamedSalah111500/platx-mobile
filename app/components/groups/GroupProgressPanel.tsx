import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { Spinner } from '../ui/Spinner';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { ErrorRetry } from '../ui/ErrorRetry';
import { SearchPickerSheet } from '../ui/SearchPickerSheet';
import { spacing } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { curriculumApi } from '../../services/api/curriculum.api';
import type { CurriculumGrade } from '../../types/group.types';

interface GroupProgressPanelProps {
  groupId: number;
  subGroupId?: number;
  canToggle: boolean;
  canAssign: boolean;
}

export function GroupProgressPanel({ groupId, subGroupId, canToggle, canAssign }: GroupProgressPanelProps) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const [grades, setGrades] = useState<CurriculumGrade[]>([]);
  const [allGrades, setAllGrades] = useState<CurriculumGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busySubject, setBusySubject] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setGrades(await curriculumApi.getProgress(groupId, subGroupId));
    } catch (err: any) {
      setError(err?.userMessage || t('groupManage.progress.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [groupId, subGroupId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const total = grades.reduce((sum, g) => sum + g.units.reduce((n, u) => n + u.subjects.length, 0), 0);
  const done = grades.reduce(
    (sum, g) => sum + g.units.reduce((n, u) => n + u.subjects.filter((s) => s.isCompleted).length, 0),
    0
  );
  const percent = total ? Math.round((done / total) * 100) : 0;
  const assigned = grades[0]?.isAssignedToGroup ?? false;

  const toggle = async (gradeId: number, unitId: number, subjectId: number) => {
    if (!canToggle || busySubject) return;
    setBusySubject(subjectId);
    try {
      await curriculumApi.toggleSubject(groupId, gradeId, unitId, subjectId, subGroupId);
      await load();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('groupManage.progress.saveFailed'));
    } finally {
      setBusySubject(null);
    }
  };

  const openAssign = async () => {
    try {
      setAllGrades(await curriculumApi.getGrades());
      setPicking(true);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('groupManage.progress.loadFailed'));
    }
  };

  const assign = async (ids: number[]) => {
    try {
      await curriculumApi.assignGrade(groupId, ids[0], subGroupId);
      setPicking(false);
      await load();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('groupManage.progress.saveFailed'));
    }
  };

  const confirmRemove = () =>
    Alert.alert(t('groupManage.progress.removeTitle'), t('groupManage.progress.removeConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await curriculumApi.removeGrade(groupId, subGroupId);
            await load();
          } catch (err: any) {
            Alert.alert(t('common.error'), err?.userMessage || t('groupManage.progress.saveFailed'));
          }
        },
      },
    ]);

  if (loading) return <Spinner />;
  if (error) return <ErrorRetry message={error} onRetry={load} />;

  return (
    <View style={styles.wrap}>
      {grades.length === 0 ? (
        <EmptyState title={t('groupManage.progress.empty')} message={t('groupManage.progress.emptyHint')} />
      ) : (
        <>
          <View style={[styles.summary, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>{grades[0].name}</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.primary }]}>{percent}%</Text>
            <View style={[styles.track, { backgroundColor: theme.colors.border }]}>
              <View style={[styles.fill, { width: `${percent}%`, backgroundColor: theme.colors.primary }]} />
            </View>
            <Text style={[styles.summaryHint, { color: theme.colors.textMuted }]}>
              {t('groupManage.progress.count', { done, total })}
            </Text>
          </View>

          {grades.map((grade) =>
            grade.units.map((unit) => (
              <View key={`${grade.id}-${unit.id}`} style={[styles.unit, { backgroundColor: theme.colors.card }]}>
                <View style={styles.unitHeader}>
                  <Ionicons
                    name={unit.isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={unit.isCompleted ? theme.colors.success : theme.colors.textMuted}
                  />
                  <Text style={[styles.unitName, { color: theme.colors.text }]}>{unit.name}</Text>
                </View>
                {unit.subjects.map((subject) => (
                  <TouchableOpacity
                    key={subject.id}
                    style={styles.subject}
                    disabled={!canToggle || busySubject !== null}
                    onPress={() => toggle(grade.id, unit.id, subject.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: subject.isCompleted, disabled: !canToggle }}
                  >
                    {busySubject === subject.id ? (
                      <Spinner size="small" style={{ padding: 0 }} />
                    ) : (
                      <Ionicons
                        name={subject.isCompleted ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={subject.isCompleted ? theme.colors.success : theme.colors.textMuted}
                      />
                    )}
                    <Text
                      style={[
                        styles.subjectName,
                        { color: subject.isCompleted ? theme.colors.text : theme.colors.textSecondary },
                      ]}
                    >
                      {subject.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}
        </>
      )}

      {canAssign ? (
        assigned ? (
          <Button title={t('groupManage.progress.remove')} variant="danger" onPress={confirmRemove} fullWidth />
        ) : (
          <Button title={t('groupManage.progress.assign')} onPress={openAssign} fullWidth />
        )
      ) : null}

      <SearchPickerSheet
        visible={picking}
        title={t('groupManage.progress.assign')}
        confirmLabel={t('groupManage.progress.assign')}
        items={allGrades.map((g) => ({ id: g.id, label: g.name, hint: g.description }))}
        onClose={() => setPicking(false)}
        onConfirm={assign}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  summary: { borderRadius: 20, padding: spacing.lg, gap: spacing.xs },
  summaryTitle: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', textAlign: 'left' },
  summaryValue: { fontSize: 28, fontFamily: 'Cairo_700Bold', textAlign: 'left' },
  summaryHint: { fontSize: fontSize.sm, fontFamily: 'Cairo_500Medium', textAlign: 'left' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  unit: { borderRadius: 20, padding: spacing.lg, gap: spacing.sm },
  unitHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  unitName: { flex: 1, fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', textAlign: 'left' },
  subject: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6, paddingStart: spacing.lg },
  subjectName: { flex: 1, fontSize: fontSize.base, fontFamily: 'Cairo_500Medium', textAlign: 'left' },
});

export default GroupProgressPanel;

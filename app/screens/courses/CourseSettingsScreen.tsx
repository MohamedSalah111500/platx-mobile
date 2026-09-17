import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useSound } from '../../hooks/useSound';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { CourseAvailabilityBadge } from '../../components/course/CourseAvailabilityBadge';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize, typography } from '../../theme/typography';
import { coursesApi } from '../../services/api/courses.api';
import { isValidDateInput, resolveCourseAvailability, toDateInputValue } from '../../utils/courseAvailability';
import type { Course } from '../../types/course.types';
import type { HomeStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<HomeStackParamList, 'CourseSettings'>;

export default function CourseSettingsScreen({ navigation, route }: Props) {
  const { courseId } = route.params;
  const { theme } = useTheme();
  const { t } = useRTL();
  const { play } = useSound();
  const insets = useSafeAreaInsets();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [togglingActive, setTogglingActive] = useState(false);
  const [hasSchedule, setHasSchedule] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCourse();
  }, [courseId]);

  const loadCourse = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await coursesApi.getOnlineCourseSingle(courseId);
      setCourse(data);
      setIsEnabled((data as any)?.isActive ?? true);
      const start = toDateInputValue(data?.startDate);
      const end = toDateInputValue(data?.endDate);
      setStartDate(start);
      setEndDate(end);
      setHasSchedule(!!(start || end));
    } catch (err: any) {
      setError(err?.userMessage || t('courses.failedToLoadCourseDetails'));
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (value: boolean) => {
    setIsEnabled(value);
    setTogglingActive(true);
    try {
      await coursesApi.setActive(courseId, value);
      play('success');
    } catch (err: any) {
      setIsEnabled(!value);
      Alert.alert(t('common.error'), err?.userMessage || t('courses.manage.saveFailed'));
    } finally {
      setTogglingActive(false);
    }
  };

  const dateErrors = useMemo(() => {
    if (!hasSchedule) return { start: undefined, end: undefined };
    const start = startDate.trim();
    const end = endDate.trim();
    const errors: { start?: string; end?: string } = {};
    if (start && !isValidDateInput(start)) errors.start = t('courses.manage.invalidDate');
    if (end && !isValidDateInput(end)) errors.end = t('courses.manage.invalidDate');
    if (!errors.start && !errors.end && start && end && end < start) errors.end = t('courses.manage.endBeforeStart');
    return errors;
  }, [hasSchedule, startDate, endDate, t]);

  const previewAvailability = resolveCourseAvailability({
    startDate: hasSchedule && startDate.trim() ? startDate.trim() : null,
    endDate: hasSchedule && endDate.trim() ? `${endDate.trim()}T23:59:59` : null,
  });

  const saveSchedule = async () => {
    if (dateErrors.start || dateErrors.end) return;
    setSaving(true);
    try {
      await coursesApi.updateSchedule(courseId, {
        startDate: hasSchedule && startDate.trim() ? startDate.trim() : null,
        endDate: hasSchedule && endDate.trim() ? endDate.trim() : null,
      });
      play('success');
      Alert.alert(t('common.success'), t('courses.manage.saved'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('courses.manage.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('courses.manage.settings')} onBack={() => navigation.goBack()} />

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorRetry message={error} onRetry={loadCourse} />
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing['3xl'] }]} keyboardShouldPersistTaps="handled">
          <Text style={styles.courseName} numberOfLines={2}>{course?.title || course?.name}</Text>

          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{t('courses.manage.active')}</Text>
                <Text style={styles.rowHint}>{t('courses.manage.activeHint')}</Text>
              </View>
              <Switch
                value={isEnabled}
                onValueChange={toggleActive}
                disabled={togglingActive}
                trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                thumbColor="#fff"
              />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{t('courses.manage.schedule')}</Text>
                <Text style={styles.rowHint}>{t('courses.manage.scheduleHint')}</Text>
              </View>
              <Switch
                value={hasSchedule}
                onValueChange={(value) => {
                  setHasSchedule(value);
                  if (!value) {
                    setStartDate('');
                    setEndDate('');
                  }
                }}
                trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                thumbColor="#fff"
              />
            </View>

            {hasSchedule && (
              <View style={styles.scheduleFields}>
                <Input
                  label={t('courses.manage.startDate')}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  error={dateErrors.start}
                />
                <Input
                  label={t('courses.manage.endDate')}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  error={dateErrors.end}
                  hint={t('courses.manage.dateFormatHint')}
                />
                <View style={styles.previewRow}>
                  <Ionicons name="eye-outline" size={16} color={theme.colors.textMuted} />
                  <Text style={styles.previewLabel}>{t('courses.manage.preview')}</Text>
                  <CourseAvailabilityBadge availability={previewAvailability} forManager />
                  {previewAvailability === 1 && <Text style={styles.previewOpen}>{t('courses.availability.open')}</Text>}
                </View>
              </View>
            )}

            <Button
              title={t('courses.manage.save')}
              onPress={saveSchedule}
              loading={saving}
              disabled={!!dateErrors.start || !!dateErrors.end}
              fullWidth
              style={{ marginTop: spacing.lg }}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { paddingHorizontal: spacing.lg, gap: spacing.lg, paddingTop: spacing.sm },
    courseName: { ...typography.sectionTitle, color: theme.colors.text },
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: spacing.lg,
    },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
    rowText: { flex: 1, gap: 2 },
    rowTitle: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', color: theme.colors.text },
    rowHint: { fontSize: fontSize.sm, lineHeight: 20, fontFamily: 'Cairo_400Regular', color: theme.colors.textMuted },
    scheduleFields: { marginTop: spacing.lg, gap: spacing.md },
    previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
    previewLabel: { fontSize: fontSize.sm, fontFamily: 'Cairo_500Medium', color: theme.colors.textMuted },
    previewOpen: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold', color: theme.colors.success },
  });
}

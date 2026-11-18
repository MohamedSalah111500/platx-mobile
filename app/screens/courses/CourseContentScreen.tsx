import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useAuth } from '../../hooks/useAuth';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { Button } from '../../components/ui/Button';
import { spacing } from '../../theme/spacing';
import { fontSize, buttonLineHeight } from '../../theme/typography';
import { courseManageApi } from '../../services/api/courseManage.api';
import { LESSON_TYPE, type LessonType, type ManagedLesson, type ManagedSection } from '../../types/course.types';
import type { HomeStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<HomeStackParamList, 'CourseContent'>;
type IconName = keyof typeof Ionicons.glyphMap;

export const LESSON_ICON: Record<LessonType, IconName> = {
  [LESSON_TYPE.Video]: 'play-circle-outline',
  [LESSON_TYPE.Document]: 'document-text-outline',
  [LESSON_TYPE.Exam]: 'help-circle-outline',
  [LESSON_TYPE.File]: 'download-outline',
  [LESSON_TYPE.Link]: 'link-outline',
  [LESSON_TYPE.Divider]: 'remove-outline',
};

function MoveButtons({
  index,
  count,
  onMove,
  disabled,
}: {
  index: number;
  count: number;
  onMove: (to: number) => void;
  disabled: boolean;
}) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const button = (to: number, icon: IconName, label: string) => {
    const off = disabled || to < 0 || to >= count;
    return (
      <TouchableOpacity
        onPress={() => onMove(to)}
        disabled={off}
        style={[styles.moveButton, { opacity: off ? 0.3 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Ionicons name={icon} size={18} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    );
  };
  return (
    <View style={styles.moveGroup}>
      {button(index - 1, 'chevron-up', t('courseManage.content.moveUp'))}
      {button(index + 1, 'chevron-down', t('courseManage.content.moveDown'))}
    </View>
  );
}

export default function CourseContentScreen({ navigation, route }: Props) {
  const { courseId, courseName } = route.params;
  const { theme } = useTheme();
  const { t } = useRTL();
  const { canModule } = useAuth();
  const insets = useSafeAreaInsets();
  const canCreate = canModule('OnlineCourses', 'create');
  const canEdit = canModule('OnlineCourses', 'edit');

  const [sections, setSections] = useState<ManagedSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const loadedOnce = useRef(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' | 'silent' = 'initial') => {
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      setError(null);
      try {
        setSections(await courseManageApi.getSections(courseId));
      } catch (err: any) {
        setError(err?.userMessage || t('courseManage.loadFailed'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [courseId, t]
  );

  useFocusEffect(
    useCallback(() => {
      load(loadedOnce.current ? 'silent' : 'initial');
      loadedOnce.current = true;
    }, [load])
  );

  const lessonCount = useMemo(() => sections.reduce((n, s) => n + s.lessons.length, 0), [sections]);

  const reorder = async (run: () => Promise<void>) => {
    setBusy(true);
    try {
      await run();
      await load('silent');
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('courseManage.content.reorderFailed'));
    } finally {
      setBusy(false);
    }
  };

  const moveSection = (section: ManagedSection, to: number) =>
    reorder(() => courseManageApi.reorderSection(section.id, to + 1));

  const moveLesson = (lesson: ManagedLesson, to: number) =>
    reorder(() => courseManageApi.reorderLesson(lesson.id, to + 1));

  const toggle = (id: number) => setExpanded((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));

  const renderLesson = (section: ManagedSection, lesson: ManagedLesson, index: number) => {
    const divider = lesson.type === LESSON_TYPE.Divider;
    return (
      <View key={lesson.id} style={[styles.lesson, { borderTopColor: theme.colors.divider }]}>
        <TouchableOpacity
          style={styles.lessonMain}
          disabled={!canEdit}
          onPress={() => navigation.navigate('LessonForm', { courseId, sectionId: section.id, lessonId: lesson.id })}
          accessibilityRole="button"
        >
          <View style={[styles.lessonIcon, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name={LESSON_ICON[lesson.type] ?? 'document-outline'} size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.lessonBody}>
            <Text style={[styles.lessonTitle, { color: theme.colors.text }, divider && styles.dividerTitle]} numberOfLines={2}>
              {lesson.title}
            </Text>
            <Text style={[styles.lessonMeta, { color: theme.colors.textMuted }]} numberOfLines={1}>
              {t(`courseManage.lessonTypes.${lesson.type}`)}
              {lesson.freePreview ? ` · ${t('courseManage.lesson.freePreview')}` : ''}
            </Text>
          </View>
        </TouchableOpacity>
        {canEdit ? (
          <MoveButtons index={index} count={section.lessons.length} onMove={(to) => moveLesson(lesson, to)} disabled={busy} />
        ) : null}
      </View>
    );
  };

  const renderSection = (section: ManagedSection, index: number) => {
    const open = expanded[section.id] ?? true;
    return (
      <View key={section.id} style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <View style={styles.sectionHeader}>
          <TouchableOpacity style={styles.sectionTitleWrap} onPress={() => toggle(section.id)} accessibilityRole="button">
            <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={18} color={theme.colors.textMuted} />
            <View style={styles.sectionBody}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]} numberOfLines={2}>
                {section.title}
              </Text>
              <Text style={[styles.lessonMeta, { color: theme.colors.textMuted }]}>
                {t('courseManage.content.lessonsCount', { count: section.lessons.length })}
              </Text>
            </View>
          </TouchableOpacity>
          {canEdit ? (
            <>
              <MoveButtons index={index} count={sections.length} onMove={(to) => moveSection(section, to)} disabled={busy} />
              <TouchableOpacity
                onPress={() => navigation.navigate('SectionForm', { courseId, sectionId: section.id })}
                style={styles.moveButton}
                accessibilityRole="button"
                accessibilityLabel={t('courseManage.section.edit')}
              >
                <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            </>
          ) : null}
        </View>
        {open ? (
          <>
            {section.lessons.map((lesson, i) => renderLesson(section, lesson, i))}
            {canCreate ? (
              <TouchableOpacity
                style={[styles.addLesson, { borderTopColor: theme.colors.divider }]}
                onPress={() => navigation.navigate('LessonForm', { courseId, sectionId: section.id })}
                accessibilityRole="button"
              >
                <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.addLessonText, { color: theme.colors.primary }]}>{t('courseManage.lesson.add')}</Text>
              </TouchableOpacity>
            ) : null}
          </>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title={t('courseManage.content.title')} onBack={() => navigation.goBack()} />
      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorRetry message={error} onRetry={() => load()} />
      ) : (
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
          showsVerticalScrollIndicator={false}
        >
          {courseName ? (
            <Text style={[styles.courseName, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              {courseName}
            </Text>
          ) : null}
          <Text style={[styles.summary, { color: theme.colors.textMuted }]}>
            {t('courseManage.content.summary', { sections: sections.length, lessons: lessonCount })}
          </Text>
          {sections.length === 0 ? (
            <EmptyState title={t('courseManage.content.empty')} message={t('courseManage.content.emptyHint')} />
          ) : (
            sections.map(renderSection)
          )}
          {canCreate ? (
            <Button
              title={t('courseManage.section.add')}
              onPress={() => navigation.navigate('SectionForm', { courseId })}
              icon={<Ionicons name="add" size={20} color="#FFFFFF" />}
              fullWidth
            />
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, gap: spacing.md },
  courseName: { fontSize: fontSize.base, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },
  summary: { fontSize: fontSize.sm, fontFamily: 'Cairo_500Medium', textAlign: 'left' },
  section: { borderRadius: 20, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.xs },
  sectionTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionBody: { flex: 1 },
  sectionTitle: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', textAlign: 'left', lineHeight: buttonLineHeight(fontSize.base), includeFontPadding: false },
  lesson: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  lessonMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  lessonIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  lessonBody: { flex: 1 },
  lessonTitle: { fontSize: fontSize.base, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },
  dividerTitle: { fontFamily: 'Cairo_700Bold' },
  lessonMeta: { fontSize: fontSize.sm, fontFamily: 'Cairo_400Regular', textAlign: 'left' },
  moveGroup: { flexDirection: 'row' },
  moveButton: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  addLesson: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, padding: spacing.md },
  addLessonText: { fontSize: fontSize.base, fontFamily: 'Cairo_600SemiBold', lineHeight: buttonLineHeight(fontSize.base), includeFontPadding: false },
});

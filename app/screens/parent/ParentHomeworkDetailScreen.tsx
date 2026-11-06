import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParentStackParamList } from '../../types/navigation.types';
import {
  HomeworkQuestionType,
  HomeworkSubmissionStatus,
  type HomeworkQuestion,
  type HomeworkSubmissionAnswer,
  type StudentHomework,
} from '../../types/homework.types';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { AudioFeedback } from '../../components/homework/AudioFeedback';
import { guardianApi } from '../../services/api/guardian.api';
import { absUrl } from '../../utils/absUrl';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { Theme } from '../../theme/themes';
import { formatDateTime, formatDay } from './parentFormat';
import { useLinkRevoked } from './parentHooks';

type Props = NativeStackScreenProps<ParentStackParamList, 'ParentHomeworkDetail'>;

const stripHtml = (value?: string | null) => (value || '').replace(/<[^>]*>/g, '').trim();

const isChoice = (question: HomeworkQuestion) => question.typeId !== HomeworkQuestionType.Essay;

function answeredCorrectly(question: HomeworkQuestion, answer?: HomeworkSubmissionAnswer): boolean {
  const correct = question.answers.filter((option) => option.isCorrect).map((option) => option.id);
  const selected = answer?.selectedAnswerIds ?? [];
  return correct.length > 0 && correct.length === selected.length && correct.every((id) => selected.includes(id));
}

export default function ParentHomeworkDetailScreen({ navigation, route }: Props) {
  const { studentId, homeworkId } = route.params;
  const { theme } = useTheme();
  const { t, locale } = useRTL();
  const onLinkRevoked = useLinkRevoked();
  const [homework, setHomework] = useState<StudentHomework | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const styles = createStyles(theme);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setHomework(await guardianApi.homeworkDetail(studentId, homeworkId));
    } catch (error) {
      if (!onLinkRevoked(error)) setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [studentId, homeworkId, onLinkRevoked]);

  useEffect(() => {
    load();
  }, [load]);

  const title = homework?.name || t('parent.homeworkDetails');

  if (loading || failed || !homework) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={title} onBack={() => navigation.goBack()} />
        {loading ? (
          <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
        ) : (
          <ErrorRetry message={t('parent.loadFailed')} onRetry={load} />
        )}
      </View>
    );
  }

  const submission = homework.submission ?? null;
  const status = submission?.status ?? null;
  const graded = status === HomeworkSubmissionStatus.Graded;
  const answers = new Map((submission?.answers ?? []).map((answer) => [answer.questionId, answer]));
  const choiceQuestions = homework.questions.filter(isChoice);
  const correctCount = choiceQuestions.filter((question) => answeredCorrectly(question, answers.get(question.id))).length;
  const teacherText = stripHtml(submission?.teacherFeedbackText);
  const aiText = graded ? stripHtml(submission?.aiFeedback) : '';

  const statusMeta = (() => {
    switch (status) {
      case HomeworkSubmissionStatus.Graded:
        return { label: t('homework.graded'), color: theme.colors.success, icon: 'checkmark-circle' as const };
      case HomeworkSubmissionStatus.Submitted:
        return { label: t('parent.awaitingGrade'), color: theme.colors.info, icon: 'time' as const };
      case HomeworkSubmissionStatus.Draft:
        return { label: t('parent.notSubmittedYet'), color: theme.colors.warning, icon: 'create-outline' as const };
      default:
        return { label: t('parent.notSubmittedYet'), color: theme.colors.textMuted, icon: 'ellipse-outline' as const };
    }
  })();

  const due = homework.isAlwaysOpen || !homework.dueDate ? t('parent.alwaysOpen') : t('parent.due', { date: formatDay(homework.dueDate, locale) });

  return (
    <View style={styles.container}>
      <ScreenHeader title={title} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={[styles.statusChip, { backgroundColor: statusMeta.color + '1F' }]}>
            <Ionicons name={statusMeta.icon} size={16} color={statusMeta.color} />
            <Text style={[styles.statusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
          </View>
          {graded && submission?.finalGrade != null && (
            <Text style={[styles.grade, { color: theme.colors.success }]}>
              {t('parent.grade', { grade: submission.finalGrade, total: homework.totalScore })}
            </Text>
          )}
          {graded && choiceQuestions.length > 0 && (
            <Text style={styles.meta}>{t('parent.correctAnswers', { correct: correctCount, total: choiceQuestions.length })}</Text>
          )}
          <Text style={styles.meta}>{due}</Text>
          {!!submission?.submittedAt && status !== HomeworkSubmissionStatus.Draft && (
            <Text style={styles.meta}>{t('parent.submittedAt', { date: formatDateTime(submission.submittedAt, locale) })}</Text>
          )}
        </View>

        {graded && (!!teacherText || !!submission?.teacherFeedbackAudio?.url || !!aiText) && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>{t('homework.teacherFeedback')}</Text>
            {!!teacherText && <Text style={styles.body}>{teacherText}</Text>}
            {!teacherText && !!aiText && <Text style={styles.body}>{aiText}</Text>}
            {!!submission?.teacherFeedbackAudio?.url && (
              <AudioFeedback url={absUrl(submission.teacherFeedbackAudio.url)} theme={theme} t={t} />
            )}
          </View>
        )}

        {(submission?.files?.length ?? 0) > 0 && status !== HomeworkSubmissionStatus.Draft && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>{t('homework.submittedFiles')}</Text>
            {submission!.files.map((file) => (
              <TouchableOpacity
                key={file.id}
                style={styles.fileRow}
                onPress={() => Linking.openURL(absUrl(file.url)).catch(() => Alert.alert(t('homework.openFileFailed')))}
                accessibilityRole="link"
              >
                <Ionicons name="document-text-outline" size={18} color={theme.colors.primary} />
                <Text style={styles.fileName} numberOfLines={1}>
                  {file.name || `#${file.id}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {status !== null && status !== HomeworkSubmissionStatus.Draft &&
          homework.questions.map((question, index) => {
            const answer = answers.get(question.id);
            const choice = isChoice(question);
            const correct = choice && graded && answeredCorrectly(question, answer);
            const selected = new Set(answer?.selectedAnswerIds ?? []);
            const accent = !graded ? theme.colors.textMuted : !choice ? theme.colors.info : correct ? theme.colors.success : theme.colors.danger;
            return (
              <View key={question.id} style={styles.card}>
                <View style={styles.questionHeader}>
                  <View style={[styles.number, { backgroundColor: accent + '1F' }]}>
                    <Text style={[styles.numberText, { color: accent }]}>{index + 1}</Text>
                  </View>
                  {graded && (
                    <Text style={styles.meta}>{`${answer?.score ?? 0}/${question.maxScore}`}</Text>
                  )}
                </View>
                <Text style={styles.body}>{stripHtml(question.questionBody)}</Text>
                {choice ? (
                  question.answers.map((option) => {
                    const picked = selected.has(option.id);
                    const right = graded && option.isCorrect;
                    const color = right ? theme.colors.success : picked && graded ? theme.colors.danger : theme.colors.border;
                    return (
                      <View key={option.id} style={[styles.option, { borderColor: color, backgroundColor: right || (picked && graded) ? color + '14' : 'transparent' }]}>
                        <Text style={styles.optionText}>{stripHtml(option.answerBody)}</Text>
                        {picked && (
                          <View style={[styles.pickedBadge, { backgroundColor: theme.colors.primary }]}>
                            <Text style={styles.pickedText}>{t('parent.childAnswer')}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })
                ) : (
                  <View style={[styles.option, { borderColor: theme.colors.border }]}>
                    <Text style={styles.optionText}>{stripHtml(answer?.textAnswer) || t('homework.noAnswer')}</Text>
                  </View>
                )}
                {choice && selected.size === 0 && <Text style={styles.meta}>{t('homework.noAnswer')}</Text>}
              </View>
            );
          })}
      </ScrollView>
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
    content: {
      padding: spacing.lg,
      paddingBottom: spacing['3xl'],
      gap: spacing.md,
    },
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: 20,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    statusChip: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: spacing.xs,
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
    },
    statusText: {
      ...typography.body,
      fontFamily: 'Cairo_700Bold',
    },
    grade: {
      ...typography.h3,
      fontFamily: 'Cairo_700Bold',
    },
    sectionLabel: {
      ...typography.body,
      fontFamily: 'Cairo_600SemiBold',
      color: theme.colors.textMuted,
    },
    body: {
      ...typography.body,
      color: theme.colors.text,
    },
    meta: {
      ...typography.bodySmall,
      color: theme.colors.textMuted,
    },
    fileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
    fileName: {
      ...typography.body,
      flex: 1,
      color: theme.colors.primary,
    },
    questionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    number: {
      width: 30,
      height: 30,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numberText: {
      ...typography.body,
      fontFamily: 'Cairo_700Bold',
    },
    option: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
    },
    optionText: {
      ...typography.body,
      flex: 1,
      color: theme.colors.text,
    },
    pickedBadge: {
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    pickedText: {
      ...typography.bodySmall,
      fontFamily: 'Cairo_600SemiBold',
      color: '#FFFFFF',
    },
  });
}

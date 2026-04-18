import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useAuth } from '../../hooks/useAuth';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Spinner } from '../../components/ui/Spinner';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { spacing } from '../../theme/spacing';
import { typography, fontSize } from '../../theme/typography';
import { examApi } from '../../services/api/exam.api';
import { API_CONFIG } from '../../config';
import type { ExamsStackParamList } from '../../types/navigation.types';
import type { OnlineExam, StudentExamQuestion } from '../../types/exam.types';

type Props = NativeStackScreenProps<ExamsStackParamList, 'ExamTaking'>;

export default function ExamTakingScreen({ navigation, route }: Props) {
  const { examId } = route.params;
  const { theme } = useTheme();
  const { t, isRTL } = useRTL();
  const { user, isStudent } = useAuth();
  const [exam, setExam] = useState<OnlineExam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number[]>>({});
  const [countdown, setCountdown] = useState<number | null>(null);
  const [examStarted, setExamStarted] = useState(false);
  const startDateRef = useRef(new Date().toISOString());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const loadExam = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await examApi.getExamById(examId, isStudent);
      setExam(data);

      // Teacher/Admin: always show preview, skip guards
      if (!isStudent) {
        setExamStarted(true);
        return;
      }

      if (data.isAnswered) {
        if (data.isShowCorrectAnswers) {
          navigation.replace('ExamResult', { examId });
          return;
        }
        Alert.alert(t('common.info'), t('exams.alreadyAnswered'), [
          { text: t('common.ok'), onPress: () => navigation.goBack() },
        ]);
        return;
      }

      // Check if scheduled exam hasn't started yet
      if (data.onlineType === 1 && data.startDate) {
        const start = new Date(data.startDate).getTime();
        const now = Date.now();
        if (start > now) {
          setCountdown(Math.floor((start - now) / 1000));
          setExamStarted(false);
        } else {
          setExamStarted(true);
          startDurationTimer(data.durationInMin);
        }
      } else {
        setExamStarted(true);
        startDurationTimer(data.durationInMin);
      }

      startDateRef.current = new Date().toISOString();
    } catch (err: any) {
      setError(err?.userMessage || err?.message || t('exams.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [examId, t, navigation]);

  const startDurationTimer = (durationInMin?: number) => {
    if (durationInMin && durationInMin > 0) {
      setTimeLeft(durationInMin * 60);
    }
  };

  // Countdown for scheduled exams
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const iv = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(iv);
          setExamStarted(true);
          startDurationTimer(exam?.durationInMin);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [countdown !== null]);

  // Duration timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft !== null]);

  useEffect(() => {
    loadExam();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleAutoSubmit = () => {
    Alert.alert(t('exams.timeUp'), t('exams.autoSubmitMessage'), [
      { text: t('common.ok'), onPress: () => doSubmit() },
    ]);
  };

  const selectSingleAnswer = (questionId: number, answerId: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: [answerId] }));
  };

  const toggleMultiAnswer = (questionId: number, answerId: number) => {
    setAnswers(prev => {
      const current = prev[questionId] || [];
      const exists = current.includes(answerId);
      return {
        ...prev,
        [questionId]: exists
          ? current.filter(id => id !== answerId)
          : [...current, answerId],
      };
    });
  };

  const doSubmit = async () => {
    if (!exam || !user?.studentId) return;
    try {
      setSubmitting(true);
      const questionAnswers = exam.questions.map(q => ({
        questionId: q.id,
        answersId: answers[q.id] || [],
      }));

      await examApi.submitExam({
        examId: exam.id,
        studentId: user.studentId,
        startDate: startDateRef.current,
        questionAnswers,
      });

      if (timerRef.current) clearInterval(timerRef.current);

      if (exam.isShowCorrectAnswers) {
        Alert.alert(t('common.success'), t('exams.submitSuccess'), [
          { text: t('exams.viewResults'), onPress: () => navigation.replace('ExamResult', { examId }) },
        ]);
      } else {
        Alert.alert(t('common.success'), t('exams.submitSuccess'), [
          { text: t('common.ok'), onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || err?.message || t('exams.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    Alert.alert(t('exams.confirmSubmitTitle'), t('exams.confirmSubmitMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('exams.submit'), onPress: doSubmit },
    ]);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatCountdown = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return { d, h, m, s };
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScreenHeader title={t('exams.exam')} onBack={() => navigation.goBack()} />
        <Spinner />
      </SafeAreaView>
    );
  }

  if (error || !exam) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScreenHeader title={t('exams.exam')} onBack={() => navigation.goBack()} />
        <ErrorRetry message={error || t('exams.examNotFound')} onRetry={loadExam} />
      </SafeAreaView>
    );
  }

  // Not started yet — show countdown
  if (!examStarted && countdown !== null && countdown > 0) {
    const cd = formatCountdown(countdown);
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScreenHeader title={exam.name} onBack={() => navigation.goBack()} />
        <View style={styles.countdownContainer}>
          <View style={[styles.countdownIconWrap, { backgroundColor: theme.colors.primary + '15' }]}>
            <Ionicons name="time-outline" size={48} color={theme.colors.primary} />
          </View>
          <Text style={[styles.countdownLabel, { color: theme.colors.text }]}>
            {t('exams.examStartsIn')}
          </Text>
          <View style={styles.countdownRow}>
            {cd.d > 0 && (
              <View style={[styles.countdownBox, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.countdownNum, { color: theme.colors.primary }]}>{cd.d}</Text>
                <Text style={[styles.countdownUnit, { color: theme.colors.textMuted }]}>{t('exams.days')}</Text>
              </View>
            )}
            <View style={[styles.countdownBox, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.countdownNum, { color: theme.colors.primary }]}>{cd.h}</Text>
              <Text style={[styles.countdownUnit, { color: theme.colors.textMuted }]}>{t('exams.hours')}</Text>
            </View>
            <View style={[styles.countdownBox, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.countdownNum, { color: theme.colors.primary }]}>{cd.m}</Text>
              <Text style={[styles.countdownUnit, { color: theme.colors.textMuted }]}>{t('exams.minutes')}</Text>
            </View>
            <View style={[styles.countdownBox, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.countdownNum, { color: theme.colors.primary }]}>{cd.s}</Text>
              <Text style={[styles.countdownUnit, { color: theme.colors.textMuted }]}>{t('exams.seconds')}</Text>
            </View>
          </View>
          {exam.durationInMin != null && (
            <View style={styles.examInfoRow}>
              <Ionicons name="timer-outline" size={16} color={theme.colors.textMuted} />
              <Text style={[styles.examInfoText, { color: theme.colors.textMuted }]}>
                {t('exams.duration')}: {exam.durationInMin} {t('exams.min')}
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Exam UI (preview for teacher, taking for student)
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header with timer */}
      <View style={[styles.examHeader, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.dark ? theme.colors.surface : '#F3F0FF' }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.examHeaderCenter}>
          <Text style={[styles.examHeaderTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {exam.name}
          </Text>
          <Text style={[styles.questionCount, { color: theme.colors.textMuted }]}>
            {exam.questions.length} {t('exams.questions')}
            {!isStudent ? ` — ${t('exams.preview')}` : ''}
          </Text>
        </View>
        {isStudent && timeLeft !== null && (
          <View style={[styles.timerBadge, { backgroundColor: theme.colors.primary + '15' }, timeLeft < 60 && styles.timerBadgeDanger]}>
            <Ionicons name="timer-outline" size={14} color={timeLeft < 60 ? '#fff' : theme.colors.primary} />
            <Text style={[styles.timerText, { color: theme.colors.primary }, timeLeft < 60 && { color: '#fff' }]}>
              {formatTime(timeLeft)}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {exam.questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index}
            selectedAnswers={isStudent ? (answers[question.id] || []) : []}
            onSelectSingle={isStudent ? (answerId) => selectSingleAnswer(question.id, answerId) : () => {}}
            onToggleMulti={isStudent ? (answerId) => toggleMultiAnswer(question.id, answerId) : () => {}}
            theme={theme}
            t={t}
            readOnly={!isStudent}
          />
        ))}

        {/* Submit Button — students only */}
        {isStudent && (
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: theme.colors.primary }, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.submitText}>
              {submitting ? t('common.loading') : t('exams.submit')}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Question Card Component
function QuestionCard({
  question,
  index,
  selectedAnswers,
  onSelectSingle,
  onToggleMulti,
  theme,
  t,
  readOnly,
}: {
  question: StudentExamQuestion;
  index: number;
  selectedAnswers: number[];
  onSelectSingle: (answerId: number) => void;
  onToggleMulti: (answerId: number) => void;
  theme: any;
  t: (key: string) => string;
  readOnly?: boolean;
}) {
  const isSingle = question.typeId === 1;
  const typeLabel = isSingle ? t('exams.singleChoice') : t('exams.multipleChoice');

  return (
    <View style={[styles.questionCard, { backgroundColor: theme.colors.card }]}>
      {/* Question header */}
      <View style={styles.questionHeader}>
        <View style={[styles.questionNum, { backgroundColor: theme.colors.primary + '15' }]}>
          <Text style={[styles.questionNumText, { color: theme.colors.primary }]}>{index + 1}</Text>
        </View>
        <View style={styles.questionTypeBadge}>
          <Ionicons
            name={isSingle ? 'radio-button-on' : 'checkbox'}
            size={12}
            color={theme.colors.textMuted}
          />
          <Text style={[styles.questionTypeText, { color: theme.colors.textMuted }]}>
            {typeLabel}
          </Text>
        </View>
      </View>

      {/* Question body */}
      <Text style={[styles.questionBody, { color: theme.colors.text }]}>
        {question.questionBody?.replace(/<[^>]*>/g, '') || ''}
      </Text>

      {/* Question image */}
      {question.uploadedFile?.url && (
        <Image
          source={{ uri: question.uploadedFile.url.startsWith('http')
            ? question.uploadedFile.url
            : `${API_CONFIG.BASE_URL}${question.uploadedFile.url.replace(/^\//, '')}`
          }}
          style={styles.questionImage}
          resizeMode="contain"
        />
      )}

      {/* Answers */}
      <View style={styles.answersContainer}>
        {question.answers.map(answer => {
          const isSelected = selectedAnswers.includes(answer.id);
          return (
            <TouchableOpacity
              key={answer.id}
              style={[
                styles.answerOption,
                { borderColor: readOnly ? theme.colors.border : (isSelected ? theme.colors.primary : theme.colors.border) },
                !readOnly && isSelected && { backgroundColor: theme.colors.primary + '08' },
              ]}
              onPress={readOnly ? undefined : () => isSingle ? onSelectSingle(answer.id) : onToggleMulti(answer.id)}
              activeOpacity={readOnly ? 1 : 0.7}
              disabled={readOnly}
            >
              <View style={[
                isSingle ? styles.radioOuter : styles.checkboxOuter,
                { borderColor: isSelected ? theme.colors.primary : theme.colors.border },
                isSelected && !isSingle && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
              ]}>
                {isSelected && (
                  isSingle ? (
                    <View style={[styles.radioInner, { backgroundColor: theme.colors.primary }]} />
                  ) : (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )
                )}
              </View>
              <Text style={[styles.answerText, { color: theme.colors.text }]}>
                {String(answer.answerBody || '').replace(/<[^>]*>/g, '')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Exam header
  examHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  examHeaderCenter: {
    flex: 1,
  },
  examHeaderTitle: {
    fontSize: fontSize.base,
    fontFamily: 'Cairo_600SemiBold',
  },
  questionCount: {
    fontSize: 11,
    fontFamily: 'Cairo_500Medium',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  timerBadgeDanger: {
    backgroundColor: '#EF4444',
  },
  timerText: {
    fontSize: 13,
    fontFamily: 'Cairo_700Bold',
  },
  // Scroll
  scrollView: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
    gap: spacing.lg,
  },
  // Question card
  questionCard: {
    borderRadius: 16,
    padding: spacing.lg,
    
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  questionNum: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionNumText: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_700Bold',
  },
  questionTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  questionTypeText: {
    fontSize: 11,
    fontFamily: 'Cairo_500Medium',
  },
  questionBody: {
    fontSize: fontSize.base,
    fontFamily: 'Cairo_500Medium',
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  questionImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  // Answers
  answersContainer: {
    gap: spacing.sm,
  },
  answerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  checkboxOuter: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  answerText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_500Medium',
    lineHeight: 22,
  },
  // Submit
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: spacing.md,
  },
  submitText: {
    ...typography.button,
    color: '#fff',
    fontSize: fontSize.base,
  },
  // Countdown
  countdownContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['3xl'],
  },
  countdownIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  countdownLabel: {
    fontSize: fontSize.lg,
    fontFamily: 'Cairo_700Bold',
    marginBottom: spacing.xl,
  },
  countdownRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  countdownBox: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 14,
    minWidth: 64,
  },
  countdownNum: {
    fontSize: 28,
    fontFamily: 'Cairo_700Bold',
  },
  countdownUnit: {
    fontSize: 11,
    fontFamily: 'Cairo_500Medium',
  },
  examInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xl,
  },
  examInfoText: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_500Medium',
  },
});

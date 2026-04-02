import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
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
import type { ExamsStackParamList } from '../../types/navigation.types';
import type { ExamResult, ExamQuestionResult } from '../../types/exam.types';

type Props = NativeStackScreenProps<ExamsStackParamList, 'ExamResult'>;

export default function ExamResultScreen({ navigation, route }: Props) {
  const { examId } = route.params;
  const { theme } = useTheme();
  const { t } = useRTL();
  const { user } = useAuth();
  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());

  const loadResults = async () => {
    if (!user?.studentId) return;
    try {
      setError(null);
      setLoading(true);
      const data = await examApi.getResults(examId, user.studentId);
      setResult(data);
    } catch (err: any) {
      setError(err?.userMessage || err?.message || t('exams.failedToLoadResults'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, []);

  const toggleQuestion = (questionId: number) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const getPercentageColor = (pct: number) => {
    if (pct >= 80) return '#34C38F';
    if (pct >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const formatTimeTaken = () => {
    if (!result?.startTime || !result?.endTime) return null;
    const start = new Date(result.startTime).getTime();
    const end = new Date(result.endTime).getTime();
    const diffMin = Math.floor((end - start) / 60000);
    if (diffMin >= 60) {
      const h = Math.floor(diffMin / 60);
      const m = diffMin % 60;
      return `${h}h ${m}m`;
    }
    return `${diffMin}m`;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScreenHeader title={t('exams.results')} onBack={() => navigation.goBack()} />
        <Spinner />
      </SafeAreaView>
    );
  }

  if (error || !result) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScreenHeader title={t('exams.results')} onBack={() => navigation.goBack()} />
        <ErrorRetry message={error || t('exams.failedToLoadResults')} onRetry={loadResults} />
      </SafeAreaView>
    );
  }

  const pctColor = getPercentageColor(result.percentage);
  const timeTaken = formatTimeTaken();
  const totalQuestions = result.correctAnswers + result.incorrectAnswers;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title={t('exams.results')} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Score Summary */}
        <View style={styles.summaryGrid}>
          {/* Percentage — big card */}
          <View style={[styles.percentageCard, { backgroundColor: pctColor + '12' }]}>
            <Text style={[styles.percentageValue, { color: pctColor }]}>
              {Math.round(result.percentage)}%
            </Text>
            <Text style={[styles.percentageLabel, { color: pctColor }]}>
              {t('exams.percentage')}
            </Text>
          </View>

          {/* Small stat cards */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
              <Ionicons name="trophy-outline" size={18} color={theme.colors.primary} />
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {result.totalScore}/{result.maxPossibleScore}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>
                {t('exams.totalScore')}
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#34C38F" />
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {result.correctAnswers}/{totalQuestions}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>
                {t('exams.correct')}
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
              <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {result.incorrectAnswers}/{totalQuestions}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>
                {t('exams.incorrect')}
              </Text>
            </View>

            {timeTaken && (
              <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
                <Ionicons name="time-outline" size={18} color="#3B82F6" />
                <Text style={[styles.statValue, { color: theme.colors.text }]}>{timeTaken}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>
                  {t('exams.timeTaken')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Question Results */}
        {result.showCorrectAnswers && result.questionResults.length > 0 && (
          <View style={styles.questionsSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {t('exams.questionDetails')}
            </Text>

            {result.questionResults.map((qr, index) => (
              <QuestionResultCard
                key={qr.questionId}
                result={qr}
                index={index}
                expanded={expandedQuestions.has(qr.questionId)}
                onToggle={() => toggleQuestion(qr.questionId)}
                theme={theme}
                t={t}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function QuestionResultCard({
  result,
  index,
  expanded,
  onToggle,
  theme,
  t,
}: {
  result: ExamQuestionResult;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  theme: any;
  t: (key: string) => string;
}) {
  const isCorrect = result.isCorrect;

  return (
    <View style={[styles.qrCard, { backgroundColor: theme.colors.card }]}>
      <TouchableOpacity style={styles.qrHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={[styles.qrNum, { backgroundColor: isCorrect ? '#E8F8F0' : '#FEE2E2' }]}>
          <Text style={[styles.qrNumText, { color: isCorrect ? '#34C38F' : '#EF4444' }]}>
            {index + 1}
          </Text>
        </View>
        <View style={styles.qrHeaderInfo}>
          <View style={styles.qrBadges}>
            <View style={[styles.qrBadge, { backgroundColor: isCorrect ? '#E8F8F0' : '#FEE2E2' }]}>
              <Ionicons
                name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                size={12}
                color={isCorrect ? '#34C38F' : '#EF4444'}
              />
              <Text style={{ fontSize: 11, fontFamily: 'Cairo_600SemiBold', color: isCorrect ? '#34C38F' : '#EF4444' }}>
                {isCorrect ? t('exams.correct') : t('exams.incorrect')}
              </Text>
            </View>
            <Text style={[styles.qrScore, { color: theme.colors.textMuted }]}>
              {result.earnedScore}/{result.questionScore}
            </Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={theme.colors.textMuted}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.qrBody}>
          <Text style={[styles.qrQuestionText, { color: theme.colors.text }]}>
            {result.questionBody?.replace(/<[^>]*>/g, '') || ''}
          </Text>

          {result.answers.map(answer => {
            let bgColor = 'transparent';
            let borderColor = theme.colors.border;
            let iconName: string | null = null;
            let iconColor = '';

            if (answer.isCorrect) {
              bgColor = '#E8F8F0';
              borderColor = '#34C38F';
              iconName = 'checkmark-circle';
              iconColor = '#34C38F';
            } else if (answer.isSubmittedAnswer && !answer.isCorrect) {
              bgColor = '#FEF3C7';
              borderColor = '#F59E0B';
              iconName = 'alert-circle';
              iconColor = '#F59E0B';
            }

            return (
              <View
                key={answer.id}
                style={[
                  styles.qrAnswer,
                  { backgroundColor: bgColor, borderColor },
                ]}
              >
                {iconName && (
                  <Ionicons name={iconName as any} size={16} color={iconColor} />
                )}
                <Text style={[styles.qrAnswerText, { color: theme.colors.text }]}>
                  {String(answer.answerBody || '').replace(/<[^>]*>/g, '')}
                </Text>
                {answer.isSubmittedAnswer && (
                  <View style={[styles.yourAnswerBadge, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.yourAnswerText}>{t('exams.yourAnswer')}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  // Summary
  summaryGrid: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  percentageCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    borderRadius: 20,
  },
  percentageValue: {
    fontSize: 48,
    fontFamily: 'Cairo_700Bold',
  },
  percentageLabel: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_600SemiBold',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '22%',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 14,
    gap: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  statValue: {
    fontSize: fontSize.base,
    fontFamily: 'Cairo_700Bold',
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Cairo_500Medium',
    textAlign: 'center',
  },
  // Questions section
  questionsSection: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontFamily: 'Cairo_700Bold',
    marginBottom: spacing.sm,
  },
  // Question result card
  qrCard: {
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  qrNum: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrNumText: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_700Bold',
  },
  qrHeaderInfo: {
    flex: 1,
  },
  qrBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  qrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  qrScore: {
    fontSize: 12,
    fontFamily: 'Cairo_600SemiBold',
  },
  // Expanded body
  qrBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  qrQuestionText: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_500Medium',
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  qrAnswer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  qrAnswerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Cairo_500Medium',
  },
  yourAnswerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  yourAnswerText: {
    fontSize: 10,
    fontFamily: 'Cairo_600SemiBold',
    color: '#fff',
  },
});

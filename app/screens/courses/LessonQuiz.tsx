import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { spacing } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { coursesApi } from '../../services/api/courses.api';
import type { Quiz, QuizQuestion } from '../../types/course.types';

type Props = {
  examId: number;
  onFinished: (r: { score: number; total: number; passed: boolean }) => void;
};

type QState = { checked: boolean; selected: number[]; correct: boolean };

function stripHtml(s?: string): string {
  return (s || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

export default function LessonQuiz({ examId, onFinished }: Props) {
  const { theme } = useTheme();
  const { t } = useRTL();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [phase, setPhase] = useState<'solving' | 'results'>('solving');
  const [index, setIndex] = useState(0);
  const [states, setStates] = useState<Record<number, QState>>({});

  useEffect(() => {
    load();
  }, [examId]);

  const load = async () => {
    setLoading(true);
    setFailed(false);
    setPhase('solving');
    setIndex(0);
    setStates({});
    try {
      const res = await coursesApi.getQuiz(examId);
      const questions = (res?.questions ?? []).filter((q) => q.typeId !== 4);
      setQuiz({ ...res, questions });
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const questions = quiz?.questions ?? [];
  const total = questions.length;
  const current = questions[index] ?? null;
  const currentState = current ? states[current.id] : undefined;
  const isLast = index >= total - 1;
  const score = Object.values(states).filter((s) => s.correct).length;
  const passMark = quiz?.passMark ?? null;
  const passed = passMark == null ? true : score >= passMark;
  const canCheck = !!currentState && !currentState.checked && currentState.selected.length > 0;

  const isMulti = (q: QuizQuestion) => q.typeId === 2;
  const isSelected = (qId: number, aId: number) => !!states[qId]?.selected.includes(aId);

  const toggle = (q: QuizQuestion, aId: number) => {
    const prev = states[q.id] ?? { checked: false, selected: [], correct: false };
    if (prev.checked) return;
    const selected = isMulti(q)
      ? prev.selected.includes(aId)
        ? prev.selected.filter((x) => x !== aId)
        : [...prev.selected, aId]
      : [aId];
    setStates({ ...states, [q.id]: { ...prev, selected } });
  };

  const check = () => {
    if (!current) return;
    const prev = states[current.id];
    if (!prev || prev.checked || prev.selected.length === 0) return;
    const correctIds = current.answers.filter((a) => a.isCorrect).map((a) => a.id);
    const correct =
      prev.selected.length === correctIds.length && prev.selected.every((id) => correctIds.includes(id));
    setStates({ ...states, [current.id]: { ...prev, checked: true, correct } });
  };

  const next = () => {
    if (isLast) {
      setPhase('results');
      onFinished({ score, total, passed });
      return;
    }
    setIndex((i) => i + 1);
  };

  const answerColors = (q: QuizQuestion, aId: number, isCorrect: boolean) => {
    const s = states[q.id];
    if (!s?.checked) {
      const sel = isSelected(q.id, aId);
      return {
        border: sel ? theme.colors.primary : theme.colors.divider,
        bg: sel ? theme.colors.primary + '14' : theme.colors.card,
        markerBg: sel ? theme.colors.primary : 'transparent',
      };
    }
    if (isCorrect) return { border: '#12A150', bg: '#12A15015', markerBg: '#12A150' };
    if (s.selected.includes(aId)) return { border: '#E0342C', bg: '#E0342C15', markerBg: '#E0342C' };
    return { border: theme.colors.divider, bg: theme.colors.card, markerBg: 'transparent' };
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (failed || total === 0) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Ionicons name="alert-circle-outline" size={40} color={theme.colors.textMuted} />
        <Text style={[styles.muted, { color: theme.colors.textMuted }]}>{t('quiz.loadFailed')}</Text>
        <TouchableOpacity style={[styles.btnOutline, { borderColor: theme.colors.primary }]} onPress={load}>
          <Text style={[styles.btnOutlineText, { color: theme.colors.primary }]}>{t('quiz.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (phase === 'results') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={styles.wrap}>
        <View style={[styles.resultHead, { backgroundColor: passed ? theme.colors.primary : '#343a40' }]}>
          <Ionicons name={passed ? 'trophy' : 'alert-circle'} size={44} color="#fff" />
          <Text style={styles.resultTitle}>{passed ? t('quiz.wellDone') : t('quiz.reviewMaterial')}</Text>
          <Text style={styles.resultSub}>
            {t('quiz.youGot')} {score} {t('quiz.outOf')} {total} {t('quiz.correct')}
          </Text>
          {passMark != null && (
            <View style={styles.passBadge}>
              <Text style={styles.passBadgeText}>{t('quiz.passMark')}: {passMark}/{total}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={[styles.btnOutline, { borderColor: theme.colors.primary, alignSelf: 'center' }]} onPress={load}>
          <Ionicons name="refresh" size={16} color={theme.colors.primary} />
          <Text style={[styles.btnOutlineText, { color: theme.colors.primary }]}>{t('quiz.retry')}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const q = current!;
  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.wrap}>
      <View style={styles.progressRow}>
        <Text style={[styles.progressText, { color: theme.colors.textMuted }]}>
          {t('quiz.question')} {index + 1} {t('quiz.of')} {total}
        </Text>
        <View style={[styles.progressBar, { backgroundColor: theme.colors.divider }]}>
          <View style={[styles.progressFill, { backgroundColor: theme.colors.primary, width: `${((index + 1) / total) * 100}%` }]} />
        </View>
      </View>

      <Text style={[styles.question, { color: theme.colors.text }]}>{stripHtml(q.questionBody)}</Text>

      <View style={{ gap: spacing.sm }}>
        {q.answers.map((a) => {
          const c = answerColors(q, a.id, a.isCorrect);
          const showCheck = isSelected(q.id, a.id) || (currentState?.checked && a.isCorrect);
          return (
            <TouchableOpacity
              key={a.id}
              activeOpacity={0.8}
              disabled={currentState?.checked}
              onPress={() => toggle(q, a.id)}
              style={[styles.answer, { borderColor: c.border, backgroundColor: c.bg }]}
            >
              <View style={[styles.marker, { borderColor: c.border, backgroundColor: c.markerBg }, isMulti(q) && styles.markerSquare]}>
                {showCheck && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={[styles.answerText, { color: theme.colors.text }]}>{stripHtml(a.answerBody)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {currentState?.checked && (
        <View style={[styles.feedback, { backgroundColor: currentState.correct ? '#12A15015' : '#E0342C15' }]}>
          <Ionicons name={currentState.correct ? 'checkmark-circle' : 'close-circle'} size={18} color={currentState.correct ? '#12A150' : '#E0342C'} />
          <Text style={[styles.feedbackText, { color: currentState.correct ? '#0f5132' : '#842029' }]}>
            {currentState.correct ? t('quiz.thatsCorrect') : t('quiz.thatsIncorrect')}
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        {!currentState?.checked ? (
          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: canCheck ? theme.colors.primary : theme.colors.divider }]}
            disabled={!canCheck}
            onPress={check}
          >
            <Text style={styles.btnPrimaryText}>{t('quiz.checkAnswer')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: theme.colors.primary }]} onPress={next}>
            <Text style={styles.btnPrimaryText}>{isLast ? t('quiz.seeResults') : t('quiz.next')}</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  muted: { fontSize: fontSize.sm, fontFamily: 'Cairo_500Medium' },
  wrap: { padding: spacing.xl, paddingBottom: 40 },
  progressRow: { marginBottom: spacing.lg },
  progressText: { fontSize: 12, fontFamily: 'Cairo_500Medium', marginBottom: 6 },
  progressBar: { height: 6, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  question: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', lineHeight: 26, marginBottom: spacing.lg },
  answer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: spacing.md,
  },
  marker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerSquare: { borderRadius: 7 },
  answerText: { flex: 1, fontSize: fontSize.sm, fontFamily: 'Cairo_500Medium', lineHeight: 22 },
  feedback: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: spacing.md, marginTop: spacing.md },
  feedbackText: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold' },
  actions: { marginTop: spacing.lg, alignItems: 'flex-end' },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  btnPrimaryText: { color: '#fff', fontSize: fontSize.sm, fontFamily: 'Cairo_700Bold' },
  btnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginTop: spacing.md,
  },
  btnOutlineText: { fontSize: fontSize.sm, fontFamily: 'Cairo_700Bold' },
  resultHead: { borderRadius: 16, padding: spacing.xl, alignItems: 'center', gap: 6, marginBottom: spacing.lg },
  resultTitle: { color: '#fff', fontSize: fontSize.lg, fontFamily: 'Cairo_700Bold' },
  resultSub: { color: 'rgba(255,255,255,0.9)', fontSize: fontSize.sm, fontFamily: 'Cairo_500Medium' },
  passBadge: { marginTop: 6, backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  passBadgeText: { color: '#fff', fontSize: 12, fontFamily: 'Cairo_600SemiBold' },
});

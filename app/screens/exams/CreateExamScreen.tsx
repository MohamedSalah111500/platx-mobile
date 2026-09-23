import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useAuth } from '../../hooks/useAuth';
import { useSound } from '../../hooks/useSound';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { examApi } from '../../services/api/exam.api';
import { groupsApi } from '../../services/api/groups.api';
import { EXAM_ONLINE_TYPE, QUESTION_TYPE } from '../../types/exam.types';
import type { ExamQuestionInput } from '../../types/exam.types';
import type { Group } from '../../types/group.types';
import type { ExamsStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<ExamsStackParamList, 'CreateExam'>;

type Draft = {
  body: string;
  type: number;
  score: string;
  answers: { text: string; correct: boolean }[];
};

const TYPE_OPTIONS = [
  { value: QUESTION_TYPE.SingleChoice, labelKey: 'createExam.typeSingle' },
  { value: QUESTION_TYPE.MultiChoice, labelKey: 'createExam.typeMulti' },
  { value: QUESTION_TYPE.TrueFalse, labelKey: 'createExam.typeTrueFalse' },
  { value: QUESTION_TYPE.Essay, labelKey: 'createExam.typeEssay' },
] as const;

/** Starting answers for a question type: true/false is fixed, essay has none. */
function defaultAnswers(type: number, t: (key: string) => string) {
  if (type === QUESTION_TYPE.Essay) return [];
  if (type === QUESTION_TYPE.TrueFalse) {
    return [
      { text: t('createExam.true'), correct: true },
      { text: t('createExam.false'), correct: false },
    ];
  }
  return [
    { text: '', correct: true },
    { text: '', correct: false },
  ];
}

export default function CreateExamScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const { user } = useAuth();
  const { play } = useSound();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [duration, setDuration] = useState('30');
  const [passMark, setPassMark] = useState('');
  const [showAnswers, setShowAnswers] = useState(true);

  const [questions, setQuestions] = useState<Draft[]>([
    { body: '', type: QUESTION_TYPE.SingleChoice, score: '1', answers: defaultAnswers(QUESTION_TYPE.SingleChoice, t) },
  ]);

  const [sendToAll, setSendToAll] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);

  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    if (sendToAll || groups.length) return;
    setGroupsLoading(true);
    groupsApi
      .getAll(1, 100)
      .then((res) => setGroups(Array.isArray(res?.items) ? res.items : []))
      .catch(() => setGroups([]))
      .finally(() => setGroupsLoading(false));
  }, [sendToAll, groups.length]);

  // ── question editing ────────────────────────────────────────────────────
  const updateQuestion = (index: number, patch: Partial<Draft>) =>
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));

  const changeType = (index: number, type: number) =>
    updateQuestion(index, { type, answers: defaultAnswers(type, t) });

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { body: '', type: QUESTION_TYPE.SingleChoice, score: '1', answers: defaultAnswers(QUESTION_TYPE.SingleChoice, t) },
    ]);
  };

  const removeQuestion = (index: number) =>
    setQuestions((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));

  const addAnswer = (index: number) =>
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, answers: [...q.answers, { text: '', correct: false }] } : q)),
    );

  const removeAnswer = (qIndex: number, aIndex: number) =>
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex && q.answers.length > 2 ? { ...q, answers: q.answers.filter((_, j) => j !== aIndex) } : q,
      ),
    );

  const setAnswerText = (qIndex: number, aIndex: number, text: string) =>
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, answers: q.answers.map((a, j) => (j === aIndex ? { ...a, text } : a)) } : q,
      ),
    );

  // Single choice and true/false keep exactly one correct answer; multi choice toggles.
  const toggleCorrect = (qIndex: number, aIndex: number) =>
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        if (q.type === QUESTION_TYPE.MultiChoice) {
          return { ...q, answers: q.answers.map((a, j) => (j === aIndex ? { ...a, correct: !a.correct } : a)) };
        }
        return { ...q, answers: q.answers.map((a, j) => ({ ...a, correct: j === aIndex })) };
      }),
    );

  // ── validation ──────────────────────────────────────────────────────────
  const questionProblem = (q: Draft): string | null => {
    if (!q.body.trim()) return t('createExam.questionRequired');
    if (q.type === QUESTION_TYPE.Essay) return null;
    if (q.answers.some((a) => !a.text.trim())) return t('createExam.answerRequired');
    if (!q.answers.some((a) => a.correct)) return t('createExam.correctRequired');
    return null;
  };

  const firstProblem = (): string | null => {
    if (!name.trim()) return t('createExam.nameRequired');
    const minutes = Number(duration);
    if (!Number.isFinite(minutes) || minutes <= 0) return t('createExam.durationRequired');
    if (passMark.trim()) {
      const mark = Number(passMark);
      if (!Number.isFinite(mark) || mark < 0) return t('createExam.passMarkInvalid');
    }
    for (const q of questions) {
      const problem = questionProblem(q);
      if (problem) return problem;
    }
    if (!sendToAll && selectedGroups.length === 0) return t('createExam.chooseGroups');
    return null;
  };

  const submit = async () => {
    setSubmitted(true);
    const problem = firstProblem();
    if (problem) {
      Alert.alert(t('common.validation'), problem);
      return;
    }

    const payloadQuestions: ExamQuestionInput[] = questions.map((q) => ({
      questionBody: q.body.trim(),
      typeId: q.type,
      maxScore: Number(q.score) > 0 ? Number(q.score) : 1,
      answers:
        q.type === QUESTION_TYPE.Essay
          ? []
          : q.answers.map((a, index) => ({
              answerBody: a.text.trim(),
              isCorrect: a.correct,
              orderNumber: index + 1,
            })),
    }));

    setSaving(true);
    try {
      await examApi.createOnlineExam({
        name: name.trim(),
        // Essay answers need a teacher, so the exam is only auto-corrected without them.
        isAutoCorrect: questions.every((q) => q.type !== QUESTION_TYPE.Essay),
        isShowCorrectAnswers: showAnswers,
        passMark: passMark.trim() ? Number(passMark) : null,
        onlineType: EXAM_ONLINE_TYPE.Dynamic,
        durationInMin: Number(duration),
        sendToAll,
        createdBy: user?.staffId ?? null,
        groupIds: sendToAll ? [] : selectedGroups,
        subGroupIds: [],
        studentIds: [],
        questions: payloadQuestions,
      });
      play('success');
      Alert.alert(t('common.success'), t('createExam.created'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('createExam.failed'));
    } finally {
      setSaving(false);
    }
  };

  const renderQuestion = (q: Draft, index: number) => {
    const problem = submitted ? questionProblem(q) : null;
    return (
      <View key={index} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            {t('createExam.question')} {index + 1}
          </Text>
          {questions.length > 1 && (
            <TouchableOpacity onPress={() => removeQuestion(index)} hitSlop={8}>
              <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
            </TouchableOpacity>
          )}
        </View>

        <Input
          value={q.body}
          onChangeText={(text) => updateQuestion(index, { body: text })}
          placeholder={t('createExam.questionPlaceholder')}
          multiline
        />

        <View style={styles.chipRow}>
          {TYPE_OPTIONS.map((option) => {
            const active = q.type === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.colors.primary : theme.colors.background,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => changeType(index, option.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, { color: active ? '#fff' : theme.colors.text }]}>
                  {t(option.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {q.type !== QUESTION_TYPE.Essay && (
          <>
            <Text style={styles.hint}>
              {q.type === QUESTION_TYPE.MultiChoice ? t('createExam.pickCorrectMulti') : t('createExam.pickCorrect')}
            </Text>
            {q.answers.map((answer, answerIndex) => (
              <View key={answerIndex} style={styles.answerRow}>
                <TouchableOpacity onPress={() => toggleCorrect(index, answerIndex)} hitSlop={6}>
                  <Ionicons
                    name={
                      answer.correct
                        ? q.type === QUESTION_TYPE.MultiChoice
                          ? 'checkbox'
                          : 'radio-button-on'
                        : q.type === QUESTION_TYPE.MultiChoice
                          ? 'square-outline'
                          : 'radio-button-off'
                    }
                    size={22}
                    color={answer.correct ? theme.colors.success : theme.colors.textMuted}
                  />
                </TouchableOpacity>
                <View style={styles.answerInput}>
                  <Input
                    value={answer.text}
                    onChangeText={(text) => setAnswerText(index, answerIndex, text)}
                    placeholder={`${t('createExam.answer')} ${answerIndex + 1}`}
                    editable={q.type !== QUESTION_TYPE.TrueFalse}
                  />
                </View>
                {q.type !== QUESTION_TYPE.TrueFalse && q.answers.length > 2 && (
                  <TouchableOpacity onPress={() => removeAnswer(index, answerIndex)} hitSlop={6}>
                    <Ionicons name="close-circle-outline" size={20} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {q.type !== QUESTION_TYPE.TrueFalse && (
              <TouchableOpacity style={styles.addAnswer} onPress={() => addAnswer(index)} activeOpacity={0.7}>
                <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
                <Text style={styles.addAnswerText}>{t('createExam.addAnswer')}</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel}>{t('createExam.score')}</Text>
          <View style={styles.scoreInput}>
            <Input
              value={q.score}
              onChangeText={(text) => updateQuestion(index, { score: text.replace(/[^0-9.]/g, '') })}
              keyboardType="numeric"
            />
          </View>
        </View>

        {problem && <Text style={styles.problem}>{problem}</Text>}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('createExam.title')} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing['3xl'] }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Exam settings */}
          <View style={styles.card}>
            <Input
              label={t('createExam.nameLabel')}
              value={name}
              onChangeText={setName}
              placeholder={t('createExam.namePlaceholder')}
              error={submitted && !name.trim() ? t('validation.required') : undefined}
              maxLength={150}
            />
            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Input
                  label={t('createExam.durationLabel')}
                  value={duration}
                  onChangeText={(text) => setDuration(text.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  maxLength={4}
                />
              </View>
              <View style={styles.rowItem}>
                <Input
                  label={t('createExam.passMarkLabel')}
                  value={passMark}
                  onChangeText={(text) => setPassMark(text.replace(/[^0-9]/g, ''))}
                  placeholder={t('createExam.passMarkPlaceholder')}
                  keyboardType="numeric"
                  maxLength={4}
                />
              </View>
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t('createExam.showAnswers')}</Text>
              <Switch
                value={showAnswers}
                onValueChange={setShowAnswers}
                trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
              />
            </View>
          </View>

          {/* Questions */}
          <Text style={styles.sectionTitle}>{t('createExam.questions')}</Text>
          {questions.map(renderQuestion)}
          <TouchableOpacity style={styles.addQuestion} onPress={addQuestion} activeOpacity={0.8}>
            <Ionicons name="add" size={20} color={theme.colors.primary} />
            <Text style={styles.addQuestionText}>{t('createExam.addQuestion')}</Text>
          </TouchableOpacity>

          {/* Audience */}
          <Text style={styles.sectionTitle}>{t('createExam.audience')}</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t('createExam.sendToAll')}</Text>
              <Switch
                value={sendToAll}
                onValueChange={setSendToAll}
                trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
              />
            </View>
            {!sendToAll && (
              groupsLoading ? (
                <Spinner size="small" />
              ) : groups.length === 0 ? (
                <Text style={styles.hint}>{t('createExam.noGroups')}</Text>
              ) : (
                <View style={styles.chipRow}>
                  {groups.map((group) => {
                    const active = selectedGroups.includes(group.id);
                    return (
                      <TouchableOpacity
                        key={group.id}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: active ? theme.colors.primary : theme.colors.background,
                            borderColor: active ? theme.colors.primary : theme.colors.border,
                          },
                        ]}
                        onPress={() =>
                          setSelectedGroups((prev) =>
                            prev.includes(group.id) ? prev.filter((id) => id !== group.id) : [...prev, group.id],
                          )
                        }
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.chipText, { color: active ? '#fff' : theme.colors.text }]}>
                          {group.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )
            )}
          </View>

          <Button title={t('createExam.create')} onPress={submit} loading={saving} fullWidth size="large" />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: spacing.xl, gap: spacing.md },
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardTitle: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', color: theme.colors.text },
    sectionTitle: {
      fontSize: fontSize.sm,
      fontFamily: 'Cairo_700Bold',
      color: theme.colors.textMuted,
      marginTop: spacing.sm,
    },
    row: { flexDirection: 'row', gap: spacing.md },
    rowItem: { flex: 1 },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    switchLabel: { flex: 1, fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold', color: theme.colors.text },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: borderRadius.full, borderWidth: 1 },
    chipText: { fontSize: fontSize.xs, fontFamily: 'Cairo_600SemiBold' },
    hint: { fontSize: fontSize.xs, fontFamily: 'Cairo_400Regular', color: theme.colors.textMuted },
    answerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    answerInput: { flex: 1 },
    addAnswer: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
    addAnswerText: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold', color: theme.colors.primary },
    scoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    scoreLabel: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold', color: theme.colors.text },
    scoreInput: { width: 90 },
    problem: { fontSize: fontSize.xs, fontFamily: 'Cairo_600SemiBold', color: theme.colors.danger },
    addQuestion: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.colors.primary,
    },
    addQuestionText: { fontSize: fontSize.sm, fontFamily: 'Cairo_700Bold', color: theme.colors.primary },
  });
}

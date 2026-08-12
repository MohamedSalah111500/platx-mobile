import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Audio } from 'expo-av';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Spinner } from '../../components/ui/Spinner';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { spacing } from '../../theme/spacing';
import { typography, fontSize } from '../../theme/typography';
import { API_CONFIG } from '../../config';
import { homeworkApi } from '../../services/api/homework.api';
import type { HomeworkStackParamList } from '../../types/navigation.types';
import {
  HomeworkQuestionType,
  type HomeworkQuestion,
  type HomeworkReview,
} from '../../types/homework.types';

type Props = NativeStackScreenProps<HomeworkStackParamList, 'HomeworkReview'>;

const MAX_FEEDBACK = 250;
const stripHtml = (s?: string | null) => (s || '').replace(/<[^>]*>/g, '');
const absUrl = (url?: string | null) =>
  !url ? '' : url.startsWith('http') ? url : `${API_CONFIG.BASE_URL}${url.replace(/^\//, '')}`;

export default function HomeworkReviewScreen({ navigation, route }: Props) {
  const { submissionId, studentName } = route.params;
  const { theme } = useTheme();
  const { t } = useRTL();

  const [review, setReview] = useState<HomeworkReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [finalGrade, setFinalGrade] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [questionScores, setQuestionScores] = useState<Record<number, string>>({});
  const [audioFileId, setAudioFileId] = useState<number | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await homeworkApi.getSubmissionForReview(submissionId);
      setReview(data);
      const s = data.submission;
      setFinalGrade(String(s.finalGrade ?? s.aiScore ?? ''));
      setFeedbackText(s.teacherFeedbackText ?? s.aiFeedback ?? '');
      setAudioFileId(s.teacherFeedbackAudio?.id ?? null);
      setAudioUri(s.teacherFeedbackAudio?.url ? absUrl(s.teacherFeedbackAudio.url) : null);
      const scores: Record<number, string> = {};
      for (const q of data.questions || []) {
        const prev = s.answers.find(a => a.questionId === q.id)?.score;
        scores[q.id] = String(prev != null ? prev : 0);
      }
      setQuestionScores(scores);
    } catch (err: any) {
      setError(err?.userMessage || err?.message || t('homework.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [submissionId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const hasQuestions = (review?.questions?.length || 0) > 0;

  const questionsTotal = useMemo(
    () => (review?.questions || []).reduce((sum, q) => sum + (Number(questionScores[q.id]) || 0), 0),
    [review, questionScores]
  );

  const setScore = (q: HomeworkQuestion, value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    let v = Number(cleaned);
    const max = q.maxScore ?? 1;
    if (!Number.isNaN(v) && v > max) v = max;
    setQuestionScores(prev => ({ ...prev, [q.id]: cleaned === '' ? '' : String(v) }));
  };

  const publish = async () => {
    if (!review) return;
    const total = review.totalScore ?? 0;
    const grade = hasQuestions ? questionsTotal : Number(finalGrade);
    if (finalGrade === '' && !hasQuestions) {
      Alert.alert(t('common.validation'), t('homework.gradeRequired'));
      return;
    }
    if (grade == null || Number.isNaN(grade) || grade < 0 || grade > total) {
      Alert.alert(t('common.validation'), t('homework.gradeRange', { max: total }));
      return;
    }
    if (feedbackText.length > MAX_FEEDBACK) {
      Alert.alert(t('common.validation'), t('homework.feedbackTooLong'));
      return;
    }
    try {
      setSaving(true);
      await homeworkApi.gradeSubmission({
        submissionId,
        finalGrade: grade,
        teacherFeedbackText: feedbackText || null,
        teacherFeedbackAudioFileId: audioFileId,
        questionScores: hasQuestions
          ? review.questions.map(q => ({ questionId: q.id, score: Number(questionScores[q.id]) || 0 }))
          : [],
      });
      Alert.alert(t('common.success'), t('homework.gradePublished'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || err?.message || t('homework.gradeFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <ScreenHeader title={studentName || t('homework.review')} onBack={() => navigation.goBack()} />
        <Spinner />
      </SafeAreaView>
    );
  }
  if (error || !review) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <ScreenHeader title={studentName || t('homework.review')} onBack={() => navigation.goBack()} />
        <ErrorRetry message={error || t('homework.notFound')} onRetry={load} />
      </SafeAreaView>
    );
  }

  const sub = review.submission;
  const grade = hasQuestions ? questionsTotal : Number(finalGrade) || 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScreenHeader title={studentName || review.homeworkName} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Grade summary */}
        <View style={[styles.gradeCard, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.gradeLabel}>{review.homeworkName}</Text>
          <Text style={styles.gradeValue}>
            {grade} / {review.totalScore} <Text style={styles.gradeUnit}>{t('homework.points')}</Text>
          </Text>
        </View>

        {sub.aiScore != null && (
          <View style={[styles.aiBanner, { backgroundColor: '#7c63fd12' }]}>
            <Ionicons name="sparkles" size={16} color="#7c63fd" />
            <Text style={[styles.aiText, { color: theme.colors.text }]}>
              {t('homework.aiSuggestion')}: {sub.aiScore}/{review.totalScore}
            </Text>
          </View>
        )}

        {/* Answers */}
        {review.questions.map((q, i) => {
          const ans = sub.answers.find(a => a.questionId === q.id);
          const isEssay = q.typeId === HomeworkQuestionType.Essay;
          return (
            <View key={q.id} style={[styles.card, { backgroundColor: theme.colors.card }]}>
              <View style={styles.qHead}>
                <View style={[styles.qNum, { backgroundColor: theme.colors.primary + '15' }]}>
                  <Text style={[styles.qNumText, { color: theme.colors.primary }]}>{i + 1}</Text>
                </View>
                <View style={styles.scoreBox}>
                  <TextInput
                    style={[styles.scoreInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                    value={questionScores[q.id] ?? ''}
                    onChangeText={v => setScore(q, v)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                  <Text style={[styles.scoreMax, { color: theme.colors.textMuted }]}>/ {q.maxScore}</Text>
                </View>
              </View>
              <Text style={[styles.qBody, { color: theme.colors.text }]}>{stripHtml(q.questionBody)}</Text>

              {isEssay ? (
                <View style={[styles.essayBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                  <Text style={[styles.essayText, { color: ans?.textAnswer ? theme.colors.text : theme.colors.textMuted }]}>
                    {ans?.textAnswer || t('homework.noAnswer')}
                  </Text>
                </View>
              ) : (
                <View style={styles.answers}>
                  {q.answers.map(a => {
                    const selected = ans?.selectedAnswerIds?.includes(a.id);
                    const correct = a.isCorrect;
                    return (
                      <View
                        key={a.id}
                        style={[
                          styles.answer,
                          {
                            borderColor: correct ? '#34C38F' : selected ? '#EF4444' : theme.colors.border,
                            backgroundColor: correct ? '#34C38F10' : selected ? '#EF444410' : 'transparent',
                          },
                        ]}
                      >
                        <Ionicons
                          name={correct ? 'checkmark-circle' : selected ? 'close-circle' : 'ellipse-outline'}
                          size={16}
                          color={correct ? '#34C38F' : selected ? '#EF4444' : theme.colors.textMuted}
                        />
                        <Text style={[styles.answerText, { color: theme.colors.text }]}>{stripHtml(a.answerBody)}</Text>
                        {selected && <Text style={styles.selectedTag}>{t('homework.studentChose')}</Text>}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {/* Submitted files (upload homework) */}
        {sub.files?.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>{t('homework.submittedFiles')}</Text>
            {sub.files.map(f => (
              <TouchableOpacity
                key={f.id}
                style={[styles.fileRow, { borderColor: theme.colors.border }]}
                onPress={() => Linking.openURL(absUrl(f.url))}
              >
                <Ionicons name="document-attach-outline" size={18} color={theme.colors.primary} />
                <Text style={[styles.fileName, { color: theme.colors.text }]} numberOfLines={1}>{f.name || `#${f.id}`}</Text>
                <Ionicons name="open-outline" size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Single grade input when there are no per-question scores */}
        {!hasQuestions && (
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>{t('homework.grade')}</Text>
            <View style={styles.gradeInputRow}>
              <TextInput
                style={[styles.gradeInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                value={finalGrade}
                onChangeText={v => setFinalGrade(v.replace(/[^0-9.]/g, ''))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.colors.textMuted}
              />
              <Text style={[styles.gradeInputMax, { color: theme.colors.textMuted }]}>/ {review.totalScore}</Text>
            </View>
          </View>
        )}

        {/* Text feedback */}
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <View style={styles.feedbackHead}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>{t('homework.writtenFeedback')}</Text>
            <Text style={[styles.counter, { color: feedbackText.length > MAX_FEEDBACK ? '#EF4444' : theme.colors.textMuted }]}>
              {feedbackText.length}/{MAX_FEEDBACK}
            </Text>
          </View>
          <TextInput
            style={[styles.feedbackInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
            value={feedbackText}
            onChangeText={setFeedbackText}
            multiline
            placeholder={t('homework.feedbackPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        {/* Voice comment */}
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>{t('homework.voiceFeedback')}</Text>
          <VoiceComment
            theme={theme}
            t={t}
            existingUri={audioUri}
            onUploaded={(id, uri) => { setAudioFileId(id); setAudioUri(uri); }}
            onCleared={() => { setAudioFileId(null); setAudioUri(null); }}
          />
        </View>

        <TouchableOpacity
          style={[styles.publishBtn, { backgroundColor: theme.colors.primary }, saving && { opacity: 0.6 }]}
          onPress={publish}
          disabled={saving}
          activeOpacity={0.7}
        >
          <Ionicons name="checkmark-done" size={18} color="#fff" />
          <Text style={styles.publishText}>{saving ? t('common.loading') : t('homework.publishGrade')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// Record / preview / upload a voice note for the teacher's feedback.
function VoiceComment({
  theme,
  t,
  existingUri,
  onUploaded,
  onCleared,
}: {
  theme: any;
  t: (k: string, o?: any) => string;
  existingUri: string | null;
  onUploaded: (fileId: number, uri: string) => void;
  onCleared: () => void;
}) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uri, setUri] = useState<string | null>(existingUri);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => setUri(existingUri), [existingUri]);
  useEffect(() => () => { sound?.unloadAsync(); }, [sound]);

  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t('common.error'), t('homework.micPermission'));
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      setIsRecording(true);
    } catch {
      Alert.alert(t('common.error'), t('homework.recordFailed'));
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const recUri = recording.getURI();
      setRecording(null);
      if (!recUri) return;
      setUri(recUri);
      // Upload immediately so we have a file id for grading.
      setUploading(true);
      const uploaded = await homeworkApi.uploadFile({
        uri: recUri,
        name: `feedback-${Date.now()}.m4a`,
        type: 'audio/m4a',
      });
      onUploaded(uploaded.id, recUri);
    } catch {
      Alert.alert(t('common.error'), t('homework.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const togglePlay = async () => {
    if (!uri) return;
    try {
      if (sound) {
        if (playing) { await sound.pauseAsync(); setPlaying(false); }
        else { await sound.playAsync(); setPlaying(true); }
        return;
      }
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound: s } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      s.setOnPlaybackStatusUpdate((st: any) => {
        if (st.isLoaded && st.didJustFinish) { setPlaying(false); s.setPositionAsync(0); }
      });
      setSound(s);
      setPlaying(true);
    } catch {
      // ignore
    }
  };

  const remove = async () => {
    await sound?.unloadAsync();
    setSound(null);
    setPlaying(false);
    setUri(null);
    onCleared();
  };

  if (isRecording) {
    return (
      <TouchableOpacity style={[styles.recBtn, { backgroundColor: '#EF444415' }]} onPress={stopRecording} activeOpacity={0.7}>
        <View style={styles.recDot} />
        <Text style={[styles.recText, { color: '#EF4444' }]}>{t('homework.stopRecording')}</Text>
      </TouchableOpacity>
    );
  }

  if (uri) {
    return (
      <View style={styles.voiceRow}>
        <TouchableOpacity style={[styles.playBtn, { backgroundColor: theme.colors.primary + '15' }]} onPress={togglePlay} activeOpacity={0.7}>
          <Ionicons name={playing ? 'pause' : 'play'} size={18} color={theme.colors.primary} />
          <Text style={[styles.playText, { color: theme.colors.primary }]}>
            {uploading ? t('homework.uploading') : t('homework.voiceReady')}
          </Text>
          {uploading && <ActivityIndicator size="small" color={theme.colors.primary} />}
        </TouchableOpacity>
        <TouchableOpacity onPress={remove} hitSlop={8} style={styles.removeVoice}>
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity style={[styles.recBtn, { borderColor: theme.colors.primary }]} onPress={startRecording} activeOpacity={0.7}>
      <Ionicons name="mic" size={18} color={theme.colors.primary} />
      <Text style={[styles.recText, { color: theme.colors.primary }]}>{t('homework.recordVoice')}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 60, gap: spacing.md },
  gradeCard: { borderRadius: 16, padding: spacing.lg },
  gradeLabel: { color: 'rgba(255,255,255,0.85)', fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold', marginBottom: 4 },
  gradeValue: { color: '#fff', fontSize: 28, fontFamily: 'Cairo_700Bold' },
  gradeUnit: { fontSize: fontSize.sm, fontFamily: 'Cairo_500Medium' },
  aiBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: 12 },
  aiText: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold' },
  card: { borderRadius: 16, padding: spacing.lg, gap: spacing.sm },
  sectionLabel: { fontSize: 11, fontFamily: 'Cairo_700Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  qHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qNum: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  qNumText: { fontSize: fontSize.sm, fontFamily: 'Cairo_700Bold' },
  scoreBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scoreInput: { width: 54, borderWidth: 1.5, borderRadius: 10, paddingVertical: 6, textAlign: 'center', fontFamily: 'Cairo_700Bold', fontSize: fontSize.base },
  scoreMax: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold' },
  qBody: { fontSize: fontSize.base, fontFamily: 'Cairo_500Medium', lineHeight: 24 },
  essayBox: { borderWidth: 1, borderRadius: 12, padding: spacing.md },
  essayText: { fontSize: fontSize.sm, fontFamily: 'Cairo_500Medium', lineHeight: 22 },
  answers: { gap: spacing.sm },
  answer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
  answerText: { flex: 1, fontSize: fontSize.sm, fontFamily: 'Cairo_500Medium' },
  selectedTag: { fontSize: 10, fontFamily: 'Cairo_600SemiBold', color: '#EF4444' },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: 10 },
  fileName: { flex: 1, fontSize: fontSize.sm, fontFamily: 'Cairo_500Medium' },
  gradeInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  gradeInput: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: 12, fontFamily: 'Cairo_700Bold', fontSize: fontSize.lg },
  gradeInputMax: { fontSize: fontSize.base, fontFamily: 'Cairo_600SemiBold' },
  feedbackHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counter: { fontSize: 11, fontFamily: 'Cairo_500Medium' },
  feedbackInput: { minHeight: 90, borderWidth: 1.5, borderRadius: 12, padding: spacing.md, fontSize: fontSize.sm, fontFamily: 'Cairo_500Medium', textAlignVertical: 'top' },
  recBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1.5, borderRadius: 12, paddingVertical: 13 },
  recText: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold' },
  recDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444' },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  playBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 12, borderRadius: 12 },
  playText: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold' },
  removeVoice: { padding: 10 },
  publishBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: 14, paddingVertical: 16, marginTop: spacing.sm },
  publishText: { ...typography.button, color: '#fff', fontSize: fontSize.base },
});

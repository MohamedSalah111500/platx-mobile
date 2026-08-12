import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
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
  HomeworkSubmissionStatus,
  HomeworkType,
  type HomeworkQuestion,
  type HomeworkUploadedFile,
  type StudentHomework,
} from '../../types/homework.types';

type Props = NativeStackScreenProps<HomeworkStackParamList, 'HomeworkDetail'>;

const stripHtml = (s?: string | null) => (s || '').replace(/<[^>]*>/g, '');

const absUrl = (url?: string | null) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_CONFIG.BASE_URL}${url.replace(/^\//, '')}`;
};

export default function HomeworkDetailScreen({ navigation, route }: Props) {
  const { homeworkId } = route.params;
  const { theme } = useTheme();
  const { t } = useRTL();

  const [hw, setHw] = useState<StudentHomework | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Answer state
  const [choiceAnswers, setChoiceAnswers] = useState<Record<number, number[]>>({});
  const [textAnswers, setTextAnswers] = useState<Record<number, string>>({});
  const [files, setFiles] = useState<HomeworkUploadedFile[]>([]);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await homeworkApi.getHomeworkForStudent(homeworkId);
      setHw(data);

      // Prefill from an existing submission (draft/submitted/graded).
      const sub = data.submission;
      if (sub) {
        const choice: Record<number, number[]> = {};
        const text: Record<number, string> = {};
        for (const a of sub.answers || []) {
          if (a.selectedAnswerIds?.length) choice[a.questionId] = a.selectedAnswerIds;
          if (a.textAnswer != null) text[a.questionId] = a.textAnswer;
        }
        setChoiceAnswers(choice);
        setTextAnswers(text);
        setFiles(sub.files || []);
      }
    } catch (err: any) {
      setError(err?.userMessage || err?.message || t('homework.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [homeworkId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const status = hw?.submission?.status;
  const isGraded = status === HomeworkSubmissionStatus.Graded;
  const isSubmitted = status === HomeworkSubmissionStatus.Submitted || isGraded;
  // Editable unless the homework is closed or the student already finally submitted.
  const readOnly = !!hw && (hw.isClosed || isSubmitted);

  const hasQuestions =
    !!hw && (hw.homeworkType === HomeworkType.SolveInPlatform || hw.homeworkType === HomeworkType.Mixed);
  const hasUpload =
    !!hw && (hw.homeworkType === HomeworkType.UploadFiles || hw.homeworkType === HomeworkType.Mixed);

  const selectSingle = (qId: number, answerId: number) =>
    setChoiceAnswers(prev => ({ ...prev, [qId]: [answerId] }));

  const toggleMulti = (qId: number, answerId: number) =>
    setChoiceAnswers(prev => {
      const cur = prev[qId] || [];
      return {
        ...prev,
        [qId]: cur.includes(answerId) ? cur.filter(id => id !== answerId) : [...cur, answerId],
      };
    });

  const setEssay = (qId: number, value: string) =>
    setTextAnswers(prev => ({ ...prev, [qId]: value }));

  const pickAndUpload = async () => {
    try {
      // Accept images, PDF and Word documents (copied to cache so the URI is a
      // stable file:// path that uploads reliably on Android).
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'image/*',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      setUploading(true);
      for (const asset of result.assets) {
        const name = asset.name || `homework-${Date.now()}`;
        const type = asset.mimeType || 'application/octet-stream';
        const uploaded = await homeworkApi.uploadFile({ uri: asset.uri, name, type });
        setFiles(prev => [
          ...prev,
          { id: uploaded.id, name, size: asset.size || 0, url: uploaded.url, fileType: 0 },
        ]);
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || err?.message || t('homework.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (id: number) => setFiles(prev => prev.filter(f => f.id !== id));

  const buildPayload = (isDraft: boolean) => ({
    homeworkId,
    isDraft,
    answers: hasQuestions
      ? (hw?.questions || []).map(q => ({
          questionId: q.id,
          answerIds: choiceAnswers[q.id] || [],
          textAnswer: textAnswers[q.id] ?? null,
        }))
      : [],
    uploadedFileIds: hasUpload ? files.map(f => f.id) : [],
  });

  const save = async (isDraft: boolean) => {
    if (!hw) return;
    try {
      setSaving(true);
      await homeworkApi.saveSubmission(buildPayload(isDraft));
      Alert.alert(
        t('common.success'),
        isDraft ? t('homework.draftSaved') : t('homework.submitSuccess'),
        [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || err?.message || t('homework.submitFailed'));
    } finally {
      setSaving(false);
    }
  };

  const confirmSubmit = () => {
    if (hasUpload && files.length === 0 && !hasQuestions) {
      Alert.alert(t('common.info'), t('homework.noFilesYet'));
      return;
    }
    Alert.alert(t('homework.confirmSubmitTitle'), t('homework.confirmSubmitMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('homework.submit'), onPress: () => save(false) },
    ]);
  };

  const dueLabel = useMemo(() => {
    if (!hw || hw.isAlwaysOpen || !hw.dueDate) return null;
    try {
      return new Date(hw.dueDate).toLocaleDateString();
    } catch {
      return null;
    }
  }, [hw]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScreenHeader title={t('homework.title')} onBack={() => navigation.goBack()} />
        <Spinner />
      </SafeAreaView>
    );
  }

  if (error || !hw) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScreenHeader title={t('homework.title')} onBack={() => navigation.goBack()} />
        <ErrorRetry message={error || t('homework.notFound')} onRetry={load} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title={hw.name} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Grade banner */}
        {isGraded && (
          <View style={[styles.banner, { backgroundColor: '#34C38F15' }]}>
            <Ionicons name="ribbon" size={20} color="#34C38F" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: '#34C38F' }]}>{t('homework.graded')}</Text>
              <Text style={[styles.bannerText, { color: theme.colors.text }]}>
                {hw.submission?.finalGrade ?? 0} / {hw.totalScore}
              </Text>
            </View>
          </View>
        )}
        {!isGraded && isSubmitted && (
          <View style={[styles.banner, { backgroundColor: '#3B82F615' }]}>
            <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
            <Text style={[styles.bannerTitle, { color: '#3B82F6' }]}>{t('homework.submittedBanner')}</Text>
          </View>
        )}
        {hw.isClosed && !isSubmitted && (
          <View style={[styles.banner, { backgroundColor: '#EF444415' }]}>
            <Ionicons name="lock-closed" size={18} color="#EF4444" />
            <Text style={[styles.bannerTitle, { color: '#EF4444' }]}>{t('homework.closed')}</Text>
          </View>
        )}

        {/* Meta */}
        <View style={styles.metaRow}>
          <View style={[styles.metaChip, { backgroundColor: theme.colors.card }]}>
            <Ionicons name="star-outline" size={13} color={theme.colors.primary} />
            <Text style={[styles.metaChipText, { color: theme.colors.textSecondary }]}>
              {hw.totalScore} {t('homework.points')}
            </Text>
          </View>
          {dueLabel && (
            <View style={[styles.metaChip, { backgroundColor: theme.colors.card }]}>
              <Ionicons name="calendar-outline" size={13} color={theme.colors.primary} />
              <Text style={[styles.metaChipText, { color: theme.colors.textSecondary }]}>
                {t('homework.due')}: {dueLabel}
              </Text>
            </View>
          )}
        </View>

        {/* Instructions */}
        {stripHtml(hw.instructions) ? (
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>
              {t('homework.instructions')}
            </Text>
            <Text style={[styles.instructions, { color: theme.colors.text }]}>
              {stripHtml(hw.instructions)}
            </Text>
          </View>
        ) : null}

        {/* Teacher feedback (graded): text and/or voice note */}
        {isGraded &&
        (stripHtml(hw.submission?.teacherFeedbackText) || hw.submission?.teacherFeedbackAudio?.url) ? (
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>
              {t('homework.teacherFeedback')}
            </Text>
            {stripHtml(hw.submission?.teacherFeedbackText) ? (
              <Text style={[styles.instructions, { color: theme.colors.text }]}>
                {stripHtml(hw.submission?.teacherFeedbackText)}
              </Text>
            ) : null}
            {hw.submission?.teacherFeedbackAudio?.url ? (
              <AudioFeedback url={absUrl(hw.submission.teacherFeedbackAudio.url)} theme={theme} t={t} />
            ) : null}
          </View>
        ) : null}

        {/* Questions */}
        {hasQuestions &&
          hw.questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              q={q}
              index={i}
              theme={theme}
              t={t}
              readOnly={readOnly}
              selected={choiceAnswers[q.id] || []}
              textValue={textAnswers[q.id] || ''}
              onSelectSingle={id => selectSingle(q.id, id)}
              onToggleMulti={id => toggleMulti(q.id, id)}
              onEssay={val => setEssay(q.id, val)}
            />
          ))}

        {/* File upload */}
        {hasUpload && (
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>
              {t('homework.attachments')}
            </Text>

            {files.map(f => (
              <View key={f.id} style={[styles.fileRow, { borderColor: theme.colors.border }]}>
                <Ionicons name="document-attach-outline" size={18} color={theme.colors.primary} />
                <Text style={[styles.fileName, { color: theme.colors.text }]} numberOfLines={1}>
                  {f.name || `#${f.id}`}
                </Text>
                {!readOnly && (
                  <TouchableOpacity onPress={() => removeFile(f.id)} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {files.length === 0 && (
              <Text style={[styles.emptyFiles, { color: theme.colors.textMuted }]}>
                {t('homework.noAttachments')}
              </Text>
            )}

            {!readOnly && (
              <TouchableOpacity
                style={[styles.uploadBtn, { borderColor: theme.colors.primary }]}
                onPress={pickAndUpload}
                disabled={uploading}
                activeOpacity={0.7}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.primary} />
                )}
                <Text style={[styles.uploadBtnText, { color: theme.colors.primary }]}>
                  {uploading ? t('homework.uploading') : t('homework.addFiles')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Actions */}
        {!readOnly && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.draftBtn, { borderColor: theme.colors.border }, saving && { opacity: 0.6 }]}
              onPress={() => save(true)}
              disabled={saving}
              activeOpacity={0.7}
            >
              <Ionicons name="save-outline" size={18} color={theme.colors.text} />
              <Text style={[styles.draftBtnText, { color: theme.colors.text }]}>{t('homework.saveDraft')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: theme.colors.primary }, saving && { opacity: 0.6 }]}
              onPress={confirmSubmit}
              disabled={saving}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>{saving ? t('common.loading') : t('homework.submit')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Plays the teacher's voice-note feedback (expo-av).
function AudioFeedback({
  url,
  theme,
  t,
}: {
  url: string;
  theme: any;
  t: (k: string) => string;
}) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      sound?.unloadAsync();
    };
  }, [sound]);

  const toggle = async () => {
    try {
      if (sound) {
        if (playing) {
          await sound.pauseAsync();
          setPlaying(false);
        } else {
          await sound.playAsync();
          setPlaying(true);
        }
        return;
      }
      setLoading(true);
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound: s } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
      s.setOnPlaybackStatusUpdate((st: any) => {
        if (st.isLoaded && st.didJustFinish) {
          setPlaying(false);
          s.setPositionAsync(0);
        }
      });
      setSound(s);
      setPlaying(true);
    } catch {
      // playback failed silently
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.audioBtn, { backgroundColor: theme.colors.primary + '12' }]}
      onPress={toggle}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : (
        <Ionicons name={playing ? 'pause' : 'play'} size={18} color={theme.colors.primary} />
      )}
      <Ionicons name="mic-outline" size={16} color={theme.colors.primary} />
      <Text style={[styles.audioBtnText, { color: theme.colors.primary }]}>
        {playing ? t('homework.pauseFeedback') : t('homework.playFeedback')}
      </Text>
    </TouchableOpacity>
  );
}

function QuestionCard({
  q,
  index,
  theme,
  t,
  readOnly,
  selected,
  textValue,
  onSelectSingle,
  onToggleMulti,
  onEssay,
}: {
  q: HomeworkQuestion;
  index: number;
  theme: any;
  t: (k: string) => string;
  readOnly: boolean;
  selected: number[];
  textValue: string;
  onSelectSingle: (id: number) => void;
  onToggleMulti: (id: number) => void;
  onEssay: (val: string) => void;
}) {
  const isEssay = q.typeId === HomeworkQuestionType.Essay;
  const isSingle =
    q.typeId === HomeworkQuestionType.SingleChoice || q.typeId === HomeworkQuestionType.TrueFalse;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
      <View style={styles.qHeader}>
        <View style={[styles.qNum, { backgroundColor: theme.colors.primary + '15' }]}>
          <Text style={[styles.qNumText, { color: theme.colors.primary }]}>{index + 1}</Text>
        </View>
        <Text style={[styles.qScore, { color: theme.colors.textMuted }]}>
          {q.maxScore} {t('homework.points')}
        </Text>
      </View>

      <Text style={[styles.qBody, { color: theme.colors.text }]}>{stripHtml(q.questionBody)}</Text>

      {q.uploadedFile?.url ? (
        <Image source={{ uri: absUrl(q.uploadedFile.url) }} style={styles.qImage} resizeMode="contain" />
      ) : null}

      {isEssay ? (
        <TextInput
          style={[
            styles.essayInput,
            { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
          ]}
          value={textValue}
          onChangeText={onEssay}
          editable={!readOnly}
          multiline
          placeholder={t('homework.writeAnswer')}
          placeholderTextColor={theme.colors.textMuted}
        />
      ) : (
        <View style={styles.answers}>
          {q.answers.map(a => {
            const isSel = selected.includes(a.id);
            return (
              <TouchableOpacity
                key={a.id}
                style={[
                  styles.answer,
                  { borderColor: isSel ? theme.colors.primary : theme.colors.border },
                  !readOnly && isSel && { backgroundColor: theme.colors.primary + '08' },
                ]}
                onPress={readOnly ? undefined : () => (isSingle ? onSelectSingle(a.id) : onToggleMulti(a.id))}
                disabled={readOnly}
                activeOpacity={readOnly ? 1 : 0.7}
              >
                <View
                  style={[
                    isSingle ? styles.radioOuter : styles.checkboxOuter,
                    { borderColor: isSel ? theme.colors.primary : theme.colors.border },
                    isSel && !isSingle && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                  ]}
                >
                  {isSel &&
                    (isSingle ? (
                      <View style={[styles.radioInner, { backgroundColor: theme.colors.primary }]} />
                    ) : (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    ))}
                </View>
                <Text style={[styles.answerText, { color: theme.colors.text }]}>
                  {stripHtml(a.answerBody)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 60, gap: spacing.md },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
  },
  bannerTitle: { fontSize: fontSize.sm, fontFamily: 'Cairo_700Bold' },
  bannerText: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold' },
  metaRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  metaChipText: { fontSize: 11, fontFamily: 'Cairo_600SemiBold' },
  card: { borderRadius: 16, padding: spacing.lg, gap: spacing.sm },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Cairo_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  instructions: { ...typography.body, lineHeight: 22 },
  audioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  audioBtnText: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold' },
  qHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  qNum: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  qNumText: { fontSize: fontSize.sm, fontFamily: 'Cairo_700Bold' },
  qScore: { fontSize: 11, fontFamily: 'Cairo_600SemiBold' },
  qBody: { fontSize: fontSize.base, fontFamily: 'Cairo_500Medium', lineHeight: 24 },
  qImage: { width: '100%', height: 180, borderRadius: 12 },
  essayInput: {
    minHeight: 100,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_500Medium',
    textAlignVertical: 'top',
  },
  answers: { gap: spacing.sm },
  answer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
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
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  checkboxOuter: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  answerText: { flex: 1, fontSize: fontSize.sm, fontFamily: 'Cairo_500Medium', lineHeight: 22 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  fileName: { flex: 1, fontSize: fontSize.sm, fontFamily: 'Cairo_500Medium' },
  emptyFiles: { fontSize: fontSize.sm, fontFamily: 'Cairo_500Medium' },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 4,
  },
  uploadBtnText: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  draftBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 15,
  },
  draftBtnText: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold' },
  submitBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: 14,
    paddingVertical: 15,
  },
  submitBtnText: { ...typography.button, color: '#fff', fontSize: fontSize.base },
});

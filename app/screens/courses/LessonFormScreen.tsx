import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useAuth } from '../../hooks/useAuth';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { Spinner } from '../../components/ui/Spinner';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { SelectField } from '../../components/ui/SelectField';
import { SwitchField } from '../../components/ui/SwitchField';
import { ImageUploadField } from '../../components/ui/ImageUploadField';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { SearchPickerSheet } from '../../components/ui/SearchPickerSheet';
import { spacing } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { courseManageApi } from '../../services/api/courseManage.api';
import { libraryApi, VIDEO_STORAGE_KEY, FILE_STORAGE_KEY, type UploadAsset } from '../../services/api/library.api';
import { REQUEST_ONLY } from '../../config/storePolicy';
import { LESSON_TYPE, type LessonFormValues, type LessonType } from '../../types/course.types';
import type { HomeStackParamList } from '../../types/navigation.types';
import { LESSON_ICON } from './CourseContentScreen';

type Props = NativeStackScreenProps<HomeStackParamList, 'LessonForm'>;

const PRICE_MAX = 1_000_000;
const LINK_PATTERN = /^https?:\/\/.+/i;
const BYTES_PER_MB = 1024 * 1024;
const TYPES: LessonType[] = [
  LESSON_TYPE.Video,
  LESSON_TYPE.Document,
  LESSON_TYPE.File,
  LESSON_TYPE.Link,
  LESSON_TYPE.Exam,
  LESSON_TYPE.Divider,
];

const EMPTY: LessonFormValues = {
  title: '',
  description: '',
  type: LESSON_TYPE.Video,
  durationInSeconds: 0,
  freePreview: false,
  price: 0,
  coverImageUrl: '',
  videoUrl: '',
  attachementId: null,
  linkUrl: '',
  openInNewTab: false,
  isInternalExam: false,
  examId: null,
};

type Picker = 'attachment' | 'exam' | null;

function sizeLabel(bytes?: number | null) {
  if (!bytes) return '';
  return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`;
}

export default function LessonFormScreen({ navigation, route }: Props) {
  const { courseId, sectionId, lessonId } = route.params;
  const editing = !!lessonId;
  const { theme } = useTheme();
  const { t } = useRTL();
  const { canModule, domain } = useAuth();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<LessonFormValues>(EMPTY);
  const [duration, setDuration] = useState('0');
  const [price, setPrice] = useState('');
  const [video, setVideo] = useState<UploadAsset | null>(null);
  const [attachment, setAttachment] = useState<UploadAsset | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [examName, setExamName] = useState<string | null>(null);
  const [picker, setPicker] = useState<Picker>(null);
  const [stage, setStage] = useState<'idle' | 'uploading'>('idle');
  const [progress, setProgress] = useState(0);

  const set = <K extends keyof LessonFormValues>(key: K, value: LessonFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const load = async () => {
    if (!lessonId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const lesson = await courseManageApi.getLesson(lessonId, sectionId);
      setValues({
        title: lesson.title,
        description: lesson.description,
        type: lesson.type,
        durationInSeconds: lesson.durationInSeconds,
        freePreview: lesson.freePreview,
        price: Number(lesson.price) || 0,
        coverImageUrl: lesson.coverImageUrl,
        videoUrl: lesson.videoUrl,
        attachementId: lesson.attachementId,
        linkUrl: lesson.linkUrl,
        openInNewTab: lesson.openInNewTab,
        isInternalExam: lesson.isInternalExam,
        examId: lesson.examId,
      });
      setDuration(String(lesson.durationInSeconds || 0));
      setPrice(lesson.price ? String(lesson.price) : '');
      setAttachmentName(lesson.attachmentName);
      if (lesson.examId) {
        libraryApi
          .searchExams('', lesson.examId)
          .then((items) => setExamName(items.find((e) => e.id === lesson.examId)?.name ?? null))
          .catch(() => undefined);
      }
    } catch (err: any) {
      setLoadError(err?.userMessage || t('courseManage.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [lessonId]);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (stage !== 'uploading') return;
        event.preventDefault();
        Alert.alert(t('courseManage.lesson.leaveTitle'), t('courseManage.lesson.leaveConfirm'), [
          { text: t('courseManage.lesson.stay'), style: 'cancel' },
          { text: t('courseManage.lesson.leave'), style: 'destructive', onPress: () => navigation.dispatch(event.data.action) },
        ]);
      }),
    [navigation, stage, t]
  );

  const isDivider = values.type === LESSON_TYPE.Divider;
  const durationValue = Number(duration);
  const priceValue = price.trim() ? Number(price.replace(',', '.')) : 0;

  const errors = {
    title: !values.title.trim() ? t('validation.required') : undefined,
    video: values.type === LESSON_TYPE.Video && !values.videoUrl && !video ? t('courseManage.lesson.videoRequired') : undefined,
    attachment:
      (values.type === LESSON_TYPE.Document || values.type === LESSON_TYPE.File) && !values.attachementId && !attachment
        ? t('courseManage.lesson.fileRequired')
        : undefined,
    link:
      values.type === LESSON_TYPE.Link
        ? !values.linkUrl.trim()
          ? t('validation.required')
          : !LINK_PATTERN.test(values.linkUrl.trim())
          ? t('courseManage.lesson.invalidLink')
          : undefined
        : undefined,
    exam: values.type === LESSON_TYPE.Exam && !values.examId ? t('courseManage.lesson.examRequired') : undefined,
    duration: !isDivider && (!Number.isInteger(durationValue) || durationValue < 0) ? t('courseManage.invalidAmount') : undefined,
    price: !isDivider && (!Number.isFinite(priceValue) || priceValue < 0 || priceValue > PRICE_MAX) ? t('courseManage.invalidAmount') : undefined,
  };
  const shown = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      videoExportPreset: ImagePicker.VideoExportPreset.H264_1920x1080,
      quality: 1,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    setVideo({
      uri: asset.uri,
      name: asset.fileName || `video-${Date.now()}.mp4`,
      type: asset.mimeType || 'video/mp4',
      size: asset.fileSize ?? null,
    });
    if (asset.duration && (!durationValue || durationValue <= 0)) setDuration(String(Math.round(asset.duration / 1000)));
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    setAttachment({
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType || 'application/octet-stream',
      size: asset.size ?? null,
    });
    setAttachmentName(asset.name);
  };

  const changeType = (type: LessonType) => {
    setValues((prev) => ({ ...prev, type }));
    setSubmitted(false);
  };

  const ensureRoom = async (file: UploadAsset, key: typeof VIDEO_STORAGE_KEY | typeof FILE_STORAGE_KEY) => {
    if (!file.size) return true;
    const room = await libraryApi.checkStorage(key, file.size);
    if (room.hasRoom) return true;
    Alert.alert(
      t('courseManage.lesson.storageFullTitle'),
      t('courseManage.lesson.storageFull', { remaining: sizeLabel(room.remainingBytes) || '0 MB', needed: sizeLabel(file.size) })
    );
    return false;
  };

  const save = async () => {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean) || saving) return;
    setSaving(true);
    try {
      const payload: LessonFormValues = {
        ...values,
        durationInSeconds: isDivider ? 0 : durationValue,
        price: isDivider ? 0 : priceValue,
      };
      if (payload.type === LESSON_TYPE.Video && video) {
        if (!(await ensureRoom(video, VIDEO_STORAGE_KEY))) return;
        setStage('uploading');
        setProgress(0);
        payload.videoUrl = await libraryApi.uploadVideo(video, domain ?? '', setProgress);
        setStage('idle');
        if (!payload.videoUrl) throw new Error();
        set('videoUrl', payload.videoUrl);
        setVideo(null);
      }
      if ((payload.type === LESSON_TYPE.Document || payload.type === LESSON_TYPE.File) && attachment) {
        if (!(await ensureRoom(attachment, FILE_STORAGE_KEY))) return;
        const uploaded = await libraryApi.uploadAttachment(attachment);
        payload.attachementId = uploaded.id;
        set('attachementId', uploaded.id);
        setAttachment(null);
      }
      if (lessonId) await courseManageApi.updateLesson(lessonId, sectionId, payload);
      else await courseManageApi.createLesson(sectionId, payload);
      navigation.goBack();
    } catch (err: any) {
      setStage('idle');
      Alert.alert(t('common.error'), err?.userMessage || t('courseManage.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert(t('courseManage.lesson.deleteTitle'), t('courseManage.lesson.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await courseManageApi.removeLesson(lessonId!);
            navigation.goBack();
          } catch (err: any) {
            Alert.alert(t('common.error'), err?.userMessage || t('courseManage.deleteFailed'));
          }
        },
      },
    ]);

  const internalOptions = useMemo(
    () => [
      { value: 'true', label: t('common.yes') },
      { value: 'false', label: t('common.no') },
    ],
    [t]
  );

  const screenTitle = editing ? t('courseManage.lesson.edit') : t('courseManage.lesson.add');

  if (loading || loadError) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={screenTitle} onBack={() => navigation.goBack()} />
        {loading ? <Spinner /> : <ErrorRetry message={loadError ?? ''} onRetry={load} />}
      </View>
    );
  }

  const pickerRow = (label: string, value: string | null, onPress: () => void, error?: string) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.pickerRow, { borderColor: error ? theme.colors.danger : theme.colors.inputBorder }]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={[styles.pickerText, { color: value ? theme.colors.inputText : theme.colors.inputPlaceholder }]} numberOfLines={2}>
          {value || t('courseManage.lesson.choose')}
        </Text>
        <Ionicons name="search" size={18} color={theme.colors.textMuted} />
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title={screenTitle} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing['3xl'] }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.label}>{t('courseManage.lesson.type')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.types}>
            {TYPES.map((type) => (
              <Chip
                key={type}
                label={t(`courseManage.lessonTypes.${type}`)}
                icon={LESSON_ICON[type]}
                active={values.type === type}
                onPress={() => changeType(type)}
              />
            ))}
          </ScrollView>

          <Input
            label={isDivider ? t('courseManage.lesson.dividerTitle') : t('courseManage.lesson.title')}
            value={values.title}
            onChangeText={(v) => set('title', v)}
            error={shown('title')}
          />
          <Input
            label={isDivider ? t('courseManage.lesson.dividerSubtitle') : t('courseManage.lesson.description')}
            value={values.description}
            onChangeText={(v) => set('description', v)}
            multiline
          />

          {!isDivider ? (
            <ImageUploadField label={t('courseManage.lesson.cover')} value={values.coverImageUrl} onChange={(v) => set('coverImageUrl', v)} />
          ) : null}

          {values.type === LESSON_TYPE.Video ? (
            <View style={styles.field}>
              <Text style={styles.label}>{t('courseManage.lesson.video')}</Text>
              <View style={[styles.box, { borderColor: shown('video') ? theme.colors.danger : theme.colors.inputBorder }]}>
                <Ionicons name="videocam-outline" size={24} color={theme.colors.primary} />
                <View style={styles.boxBody}>
                  <Text style={styles.boxTitle} numberOfLines={2}>
                    {video ? video.name : values.videoUrl ? t('courseManage.lesson.videoUploaded') : t('courseManage.lesson.noVideo')}
                  </Text>
                  {video?.size ? <Text style={styles.boxHint}>{sizeLabel(video.size)}</Text> : null}
                </View>
                <TouchableOpacity onPress={pickVideo} disabled={saving} accessibilityRole="button">
                  <Text style={styles.link}>{values.videoUrl || video ? t('courseManage.lesson.changeVideo') : t('courseManage.lesson.pickVideo')}</Text>
                </TouchableOpacity>
              </View>
              {stage === 'uploading' ? (
                <View style={styles.progress}>
                  <Text style={styles.boxHint}>{t('courseManage.lesson.uploading', { progress })}</Text>
                  <ProgressBar value={progress} />
                </View>
              ) : null}
              {Platform.OS === 'ios' ? <Text style={styles.boxHint}>{t('courseManage.lesson.videoCompressHint')}</Text> : null}
              {shown('video') ? <Text style={styles.error}>{shown('video')}</Text> : null}
            </View>
          ) : null}

          {values.type === LESSON_TYPE.Document || values.type === LESSON_TYPE.File ? (
            <>
              {pickerRow(t('courseManage.lesson.libraryFile'), attachmentName, () => setPicker('attachment'), shown('attachment'))}
              <Button
                title={t('courseManage.lesson.uploadFile')}
                variant="secondary"
                onPress={pickFile}
                icon={<Ionicons name="cloud-upload-outline" size={18} color={theme.colors.primary} />}
                fullWidth
                style={styles.spaced}
              />
              {attachment ? (
                <Text style={[styles.boxHint, styles.spaced]}>
                  {t('courseManage.lesson.fileWillUpload', { name: attachment.name, size: sizeLabel(attachment.size) })}
                </Text>
              ) : null}
            </>
          ) : null}

          {values.type === LESSON_TYPE.Link ? (
            <>
              <Input
                label={t('courseManage.lesson.link')}
                value={values.linkUrl}
                onChangeText={(v) => set('linkUrl', v)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholder="https://www.youtube.com/watch?v=..."
                hint={t('courseManage.lesson.linkHint')}
                error={shown('link')}
              />
              <SwitchField label={t('courseManage.lesson.openInNewTab')} value={values.openInNewTab} onChange={(v) => set('openInNewTab', v)} />
            </>
          ) : null}

          {values.type === LESSON_TYPE.Exam ? (
            <>
              {pickerRow(t('courseManage.lesson.exam'), examName, () => setPicker('exam'), shown('exam'))}
              <SelectField
                label={t('courseManage.lesson.internalExam')}
                placeholder={t('courseManage.lesson.internalExam')}
                value={String(values.isInternalExam)}
                options={internalOptions}
                onChange={(v) => set('isInternalExam', v === 'true')}
              />
            </>
          ) : null}

          {!isDivider ? (
            <>
              <Input
                label={t('courseManage.lesson.duration')}
                value={duration}
                onChangeText={setDuration}
                keyboardType="number-pad"
                hint={durationValue >= 60 ? t('courseManage.lesson.minutes', { minutes: Math.floor(durationValue / 60) }) : undefined}
                error={shown('duration')}
              />
              <SwitchField label={t('courseManage.lesson.freePreview')} value={values.freePreview} onChange={(v) => set('freePreview', v)} />
              {!REQUEST_ONLY ? (
                <Input
                  label={t('courseManage.partPrice')}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                  placeholder={t('courseManage.partPricePlaceholder')}
                  hint={t('courseManage.lesson.priceHint')}
                  error={shown('price')}
                />
              ) : null}
            </>
          ) : null}

          <Button title={editing ? t('common.save') : t('courseManage.lesson.add')} onPress={save} loading={saving} fullWidth />
          {editing && canModule('OnlineCourses', 'delete') ? (
            <Button title={t('courseManage.lesson.delete')} variant="danger" onPress={confirmDelete} fullWidth style={styles.delete} />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <SearchPickerSheet
        visible={picker === 'attachment'}
        title={t('courseManage.lesson.libraryFile')}
        confirmLabel={t('common.confirm')}
        search={async (term) => (await libraryApi.searchAttachments(term)).map((f) => ({ id: f.id, label: f.name }))}
        onClose={() => setPicker(null)}
        onConfirm={async (ids) => {
          const items = await libraryApi.searchAttachments('', ids);
          set('attachementId', ids[0]);
          setAttachment(null);
          setAttachmentName(items.find((f) => f.id === ids[0])?.name ?? null);
          setPicker(null);
        }}
      />
      <SearchPickerSheet
        visible={picker === 'exam'}
        title={t('courseManage.lesson.exam')}
        confirmLabel={t('common.confirm')}
        search={async (term) => (await libraryApi.searchExams(term, values.examId)).map((e) => ({ id: e.id, label: e.name }))}
        onClose={() => setPicker(null)}
        onConfirm={async (ids) => {
          const items = await libraryApi.searchExams('', ids[0]);
          set('examId', ids[0]);
          setExamName(items.find((e) => e.id === ids[0])?.name ?? null);
          setPicker(null);
        }}
      />
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
    label: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold', color: theme.colors.text, marginBottom: spacing.sm, textAlign: 'left' },
    types: { gap: spacing.sm, paddingBottom: spacing.lg },
    field: { marginBottom: spacing.lg },
    box: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderWidth: 1,
      borderRadius: 14,
      padding: spacing.md,
      backgroundColor: theme.colors.card,
    },
    boxBody: { flex: 1 },
    boxTitle: { fontSize: fontSize.base, fontFamily: 'Cairo_600SemiBold', color: theme.colors.text, textAlign: 'left' },
    boxHint: { fontSize: fontSize.sm, fontFamily: 'Cairo_400Regular', color: theme.colors.textMuted, textAlign: 'left', marginTop: spacing.xs },
    link: { fontSize: fontSize.sm, fontFamily: 'Cairo_700Bold', color: theme.colors.primary },
    progress: { marginTop: spacing.sm, gap: spacing.xs },
    pickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 50,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: spacing.lg,
      backgroundColor: theme.colors.card,
    },
    pickerText: { flex: 1, fontSize: fontSize.base, fontFamily: 'Cairo_400Regular', textAlign: 'left' },
    error: { fontSize: fontSize.sm, fontFamily: 'Cairo_400Regular', color: theme.colors.danger, marginTop: spacing.xs, textAlign: 'left' },
    spaced: { marginBottom: spacing.lg },
    delete: { marginTop: spacing.md },
  });
}

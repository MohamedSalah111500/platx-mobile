import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { WebView } from 'react-native-webview';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { Spinner } from '../../components/ui/Spinner';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography, fontSize } from '../../theme/typography';
import { coursesApi } from '../../services/api/courses.api';
import type { CoursesStackParamList } from '../../types/navigation.types';
import type { Lesson } from '../../types/course.types';
import { useRTL } from '../../i18n/RTLProvider';
import { useSound } from '../../hooks/useSound';

type Props = NativeStackScreenProps<CoursesStackParamList, 'LessonPlayer'>;

const ACCENT = '#7c63fd';

export default function LessonPlayerScreen({ navigation, route }: Props) {
  const { lessonId, courseId } = route.params;
  const { theme } = useTheme();
  const { t } = useRTL();
  const { play } = useSound();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    loadLesson();
  }, [lessonId]);

  const loadLesson = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await coursesApi.getLessonVideo(lessonId);
      console.log('[Lesson] Loaded:', data?.id, 'libraryId:', data?.libraryId, 'videoUrl:', data?.videoUrl);
      setLesson(data);
      setCompleted(data?.isCompleted ?? false);
    } catch (err: any) {
      const msg = err?.userMessage || err?.message || 'Failed to load lesson.';
      console.log('[Lesson] Error:', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      await coursesApi.completeLesson(lessonId);
      setCompleted(true);
      play('success');
      Alert.alert(t('common.success'), t('lessons.lessonCompleted'));
    } catch {
      // Silently fail - not critical
    }
  };

  // Build Bunny CDN player URL (matches web: iframe.mediadelivery.net/embed/{libraryId}/{videoId})
  const getVideoUrl = (): string | null => {
    if (!lesson) return null;
    if (lesson.libraryId && lesson.videoUrl) {
      return `https://iframe.mediadelivery.net/embed/${lesson.libraryId}/${lesson.videoUrl}?autoplay=true&muted=false&preload=true&responsive=true`;
    }
    if (lesson.videoUrl) {
      if (lesson.videoUrl.startsWith('http')) {
        return lesson.videoUrl;
      }
    }
    return null;
  };

  const videoUrl = loading ? null : getVideoUrl();

  const getLessonTypeInfo = () => {
    if (!lesson) return { icon: 'play-circle', label: 'Video', color: ACCENT, bg: '#F0EDFF' };
    switch (lesson.type) {
      case 2:
        return { icon: 'document-text', label: t('courses.document'), color: '#3B82F6', bg: '#EFF6FF' };
      case 3:
        return { icon: 'clipboard', label: t('courses.exam'), color: '#F59E0B', bg: '#FFFBEB' };
      default:
        return { icon: 'play-circle', label: 'Video', color: ACCENT, bg: '#F0EDFF' };
    }
  };

  const typeInfo = getLessonTypeInfo();

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.colors.card }]} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('lessons.loadingLesson')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <Spinner />
      </SafeAreaView>
    );
  }

  if (error || !lesson) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.colors.card }]} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('lessons.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <View style={[styles.errorIconWrap, { backgroundColor: theme.colors.danger + '15' }]}>
            <Ionicons name="alert-circle" size={40} color={theme.colors.danger} />
          </View>
          <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error || t('lessons.lessonNotFound')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadLesson} activeOpacity={0.7}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#000' }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: 'rgba(255,255,255,0.12)' }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: '#fff' }]} numberOfLines={1}>
          {lesson.title}
        </Text>
        {/* Mark Complete */}
        <TouchableOpacity
          style={[
            styles.completeButton,
            completed && styles.completedButton,
          ]}
          onPress={!completed ? handleComplete : undefined}
          activeOpacity={completed ? 1 : 0.7}
        >
          <Ionicons
            name={completed ? 'checkmark-circle' : 'checkmark'}
            size={16}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      {/* Video Player */}
      {videoUrl ? (
        <View style={styles.videoContainer}>
          <WebView
            source={{ uri: videoUrl }}
            style={styles.webview}
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={styles.videoLoading}>
                <ActivityIndicator size="large" color={ACCENT} />
              </View>
            )}
          />
        </View>
      ) : (
        <View style={styles.noVideoContainer}>
          <View style={styles.noVideoIcon}>
            <Ionicons name="videocam-off-outline" size={40} color="#666" />
          </View>
          <Text style={styles.noVideoText}>{t('lessons.noVideo')}</Text>
        </View>
      )}

      {/* Lesson Info Section */}
      <ScrollView
        style={[styles.infoScroll, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.infoContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Lesson Info Card */}
        <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.infoCardHeader}>
            <View style={[styles.typeBadge, { backgroundColor: theme.dark ? theme.colors.surface : typeInfo.bg }]}>
              <Ionicons name={typeInfo.icon as any} size={14} color={typeInfo.color} />
              <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>{typeInfo.label}</Text>
            </View>
            {completed && (
              <View style={styles.completedTag}>
                <Ionicons name="checkmark-circle" size={14} color="#34C38F" />
                <Text style={styles.completedTagText}>{t('courses.completed')}</Text>
              </View>
            )}
          </View>

          <Text style={[styles.lessonTitle, { color: theme.colors.text }]}>{lesson.title}</Text>

          {/* Meta row */}
          <View style={styles.metaRow}>
            {lesson.duration != null && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color={theme.colors.textMuted} />
                <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>
                  {lesson.duration} min
                </Text>
              </View>
            )}
            {lesson.order != null && (
              <View style={styles.metaItem}>
                <Ionicons name="list-outline" size={14} color={theme.colors.textMuted} />
                <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>
                  {t('courses.lessonN', { n: lesson.order })}
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          {lesson.description ? (
            <View style={[styles.descriptionWrap, { borderTopColor: theme.colors.divider }]}>
              <Text style={[styles.lessonDescription, { color: theme.colors.textSecondary }]}>
                {lesson.description}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Mark complete card (when not yet completed) */}
        {!completed && (
          <TouchableOpacity
            style={[styles.completeCard, { backgroundColor: theme.colors.card }]}
            onPress={handleComplete}
            activeOpacity={0.7}
          >
            <View style={[styles.completeCardIcon, { backgroundColor: '#E8F8F0' }]}>
              <Ionicons name="checkmark-done" size={20} color="#34C38F" />
            </View>
            <View style={styles.completeCardInfo}>
              <Text style={[styles.completeCardTitle, { color: theme.colors.text }]}>
                {t('lessons.markComplete')}
              </Text>
              <Text style={[styles.completeCardSub, { color: theme.colors.textMuted }]}>
                {t('lessons.lessonCompleted')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    flex: 1,
  },
  completeButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedButton: {
    backgroundColor: '#34C38F',
  },
  // Video
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  noVideoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noVideoIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  noVideoText: {
    fontSize: fontSize.sm,
    color: '#666',
  },
  // Info section
  infoScroll: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -16,
  },
  infoContent: {
    padding: spacing.xl,
    paddingBottom: 40,
  },
  infoCard: {
    borderRadius: 20,
    padding: spacing.xl,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  completedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34C38F',
  },
  lessonTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.sm,
    lineHeight: 26,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  descriptionWrap: {
    borderTopWidth: 1,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
  },
  lessonDescription: {
    ...typography.body,
    lineHeight: 24,
  },
  // Complete card
  completeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  completeCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeCardInfo: {
    flex: 1,
  },
  completeCardTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: 2,
  },
  completeCardSub: {
    fontSize: 11,
  },
  // Error
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['3xl'],
  },
  errorIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: ACCENT,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 14,
  },
  retryText: { ...typography.button, color: '#fff' },
});

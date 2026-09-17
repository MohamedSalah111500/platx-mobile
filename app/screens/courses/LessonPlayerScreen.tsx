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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { WebView } from 'react-native-webview';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { usePreventScreenCapture } from 'expo-screen-capture';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../../components/ui/Spinner';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography, fontSize } from '../../theme/typography';
import { coursesApi } from '../../services/api/courses.api';
import { getToken } from '../../services/api/client';
import { FILE_MANAGER_URLS } from '../../services/api/endpoints';
import type { CoursesStackParamList } from '../../types/navigation.types';
import type { CourseAvailability } from '../../types/course.types';
import { isCourseLocked, resolveCourseAvailability } from '../../utils/courseAvailability';
import { CourseLockedNotice } from '../../components/course/CourseLockedNotice';
import type { Lesson } from '../../types/course.types';
import { useRTL } from '../../i18n/RTLProvider';
import { useSound } from '../../hooks/useSound';
import LessonQuiz from './LessonQuiz';

type Props = NativeStackScreenProps<CoursesStackParamList, 'LessonPlayer'>;

// Origin used for the WebView wrapper page. Must be a domain that is in the Bunny
// Stream library's "Allowed Referrers" list (same domains the web app is served from),
// otherwise the video stream is rejected with 403.
const PLAYER_REFERER = 'https://platx.net/';

// Wrap the Bunny embed in an iframe hosted by an allowed-referrer page so the stream
// requests carry an allowed referrer (mirrors how the web embeds the player).
function buildPlayerHtml(embedUrl: string): string {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;background:#000;overflow:hidden}iframe{position:absolute;inset:0;width:100%;height:100%;border:0}</style></head><body><iframe src="${embedUrl}" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></body></html>`;
}

const MIME_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'text/plain': 'txt',
  'application/zip': 'zip',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
};

// Pick a safe local file name for a downloaded attachment: prefer the server's
// Content-Disposition name (keeps the real extension), else derive one from the
// MIME type. Non-ASCII is stripped so file:// / content:// URIs stay valid.
function pickFileName(disposition: string | undefined, id: number, mimeType: string): string {
  const star = disposition?.match(/filename\*=(?:UTF-8'')?([^;]+)/i)?.[1];
  const plain = disposition?.match(/filename="?([^";]+)"?/i)?.[1];
  let name = '';
  try {
    name = star ? decodeURIComponent(star.trim()) : (plain?.trim() ?? '');
  } catch {
    name = plain?.trim() ?? '';
  }
  const extFromName = name.includes('.') ? name.split('.').pop() : undefined;
  const ext = (extFromName && /^[A-Za-z0-9]{1,6}$/.test(extFromName) ? extFromName : MIME_EXT[mimeType]) || 'bin';
  const base = (name ? name.replace(/\.[^.]*$/, '') : '').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
  return `${base || `lesson-file-${id}`}.${ext.toLowerCase()}`;
}

export default function LessonPlayerScreen({ navigation, route }: Props) {
  // Completion/enrollment come from CourseDetail's section data: CheckForStudent
  // never fills IsCompleated, and the complete endpoint is a toggle.
  const { lessonId, courseId, isCompleted: routeCompleted, isEnrolled: routeEnrolled } =
    route.params;
  const { theme } = useTheme();
  const { t, isRTL } = useRTL();
  const { play } = useSound();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(routeCompleted ?? false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoResolving, setVideoResolving] = useState(false);
  const [quizPolicy, setQuizPolicy] = useState(0);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [docViewerOpen, setDocViewerOpen] = useState(false);
  // Attachment downloaded into the app cache (authenticated), reused by open/download.
  const [localFile, setLocalFile] = useState<{ uri: string; mimeType: string } | null>(null);
  const [fileBusy, setFileBusy] = useState<'open' | 'download' | null>(null);

  // Block screenshots/screen recording while a lesson video is open, to protect
  // paid course content from being captured.
  usePreventScreenCapture('lesson-player');

  const { isStudent, user } = useAuth();
  // Only enrolled students have progress; the complete endpoint rejects anyone else.
  const canComplete = isStudent && (routeEnrolled ?? (lesson as any)?.isEnrolled === true);
  const [lockedAvailability, setLockedAvailability] = useState<CourseAvailability | null>(null);

  const isQuiz = lesson?.type === 3;
  const isDocOrFile = lesson?.type === 2 || lesson?.type === 4;
  const isLink = lesson?.type === 5;

  useEffect(() => {
    loadLesson();
  }, [lessonId]);

  const loadLesson = async () => {
    try {
      setError(null);
      setLoading(true);
      const [data, course] = await Promise.all([
        coursesApi.getLessonVideo(lessonId),
        courseId ? coursesApi.getOnlineCourseSingle(courseId).catch(() => null) : Promise.resolve(null),
      ]);

      if (course && isStudent && isCourseLocked(course)) {
        setLockedAvailability(resolveCourseAvailability(course));
        return;
      }

      setLockedAvailability(null);
      setLesson(data);
      setCompleted(routeCompleted ?? (data as any)?.isCompleted ?? (data as any)?.isCompleated ?? false);
      if (data?.type === 3) setQuizPolicy((course as any)?.quizPolicy ?? 0);
      if (data?.type === 2 || data?.type === 4) {
        try {
          setAuthToken(await getToken());
        } catch {}
      }
    } catch (err: any) {
      const msg = err?.userMessage || err?.message || 'Failed to load lesson.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    // The backend toggles completion, so never call it for a finished lesson.
    if (completed || !canComplete) return;
    if (!user?.studentId) {
      Alert.alert(t('common.error'), t('courses.missingStudentId'));
      return;
    }
    try {
      await coursesApi.completeLesson(lessonId, user.studentId);
      setCompleted(true);
      play('success');
      Alert.alert(t('common.success'), t('lessons.lessonCompleted'));
    } catch {
      // Silently fail - not critical
    }
  };

  const openLink = async () => {
    const target = lesson?.linkUrl;
    if (!target) return;
    play('tap');
    try {
      await WebBrowser.openBrowserAsync(target);
    } catch {}
  };

  const onQuizFinished = async (r: { score: number; total: number; passed: boolean }) => {
    const satisfied = quizPolicy === 2 ? r.passed : true;
    if (!satisfied || completed || !canComplete || !user?.studentId) return;
    try {
      await coursesApi.completeLesson(lessonId, user.studentId);
      setCompleted(true);
      play('success');
    } catch {}
  };

  // ── Lesson files (type 2 = document, 4 = file) ─────────────────────────────
  // Download once into the app cache with the auth header (a WebView can't send
  // it reliably, and the old FileManager route doesn't exist), then either open
  // with the system viewer or hand it to the share sheet ("Save to Files/Drive").
  const ensureLocalFile = async (): Promise<{ uri: string; mimeType: string } | null> => {
    if (localFile) return localFile;
    const attachmentId = lesson?.attachementId;
    if (!attachmentId) {
      Alert.alert(t('common.info'), t('lessons.noVideo'));
      return null;
    }
    const token = authToken ?? (await getToken().catch(() => null));
    const tmpUri = `${FileSystem.cacheDirectory}lesson-${attachmentId}.download`;
    const res = await FileSystem.downloadAsync(FILE_MANAGER_URLS.DOWNLOAD_FILE(attachmentId), tmpUri, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`HTTP ${res.status}`);
    }
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(res.headers ?? {})) headers[k.toLowerCase()] = String(v);
    const mimeType = (headers['content-type'] || 'application/octet-stream').split(';')[0].trim();
    const finalUri = `${FileSystem.cacheDirectory}${pickFileName(headers['content-disposition'], attachmentId, mimeType)}`;
    await FileSystem.deleteAsync(finalUri, { idempotent: true }).catch(() => {});
    await FileSystem.moveAsync({ from: tmpUri, to: finalUri });
    const file = { uri: finalUri, mimeType };
    setLocalFile(file);
    return file;
  };

  const openDocument = async () => {
    if (fileBusy) return;
    play('tap');
    setFileBusy('open');
    try {
      const file = await ensureLocalFile();
      if (!file) return;
      if (Platform.OS === 'android') {
        // Android WebView can't render PDFs/Office files — use the system viewer.
        try {
          const contentUri = await FileSystem.getContentUriAsync(file.uri);
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
            type: file.mimeType,
          });
        } catch {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(file.uri, { mimeType: file.mimeType });
          } else {
            Alert.alert(t('common.info'), t('lessons.noAppToOpen'));
          }
        }
      } else {
        // iOS WKWebView renders PDF, images and Office docs from a local file.
        setDocViewerOpen(true);
      }
    } catch {
      Alert.alert(t('common.error'), t('lessons.downloadFailed'));
    } finally {
      setFileBusy(null);
    }
  };

  const downloadDocument = async () => {
    if (fileBusy) return;
    play('tap');
    setFileBusy('download');
    try {
      const file = await ensureLocalFile();
      if (!file) return;
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: file.mimeType, dialogTitle: lesson?.title });
      } else {
        Alert.alert(t('common.info'), t('lessons.noAppToOpen'));
      }
    } catch {
      Alert.alert(t('common.error'), t('lessons.downloadFailed'));
    } finally {
      setFileBusy(null);
    }
  };

  // Resolve the video URL. Bunny videos need a short-lived signed embed URL from
  // the backend (token auth is on, so the plain embed URL 403s). Mirrors the web
  // BunnyPlayer: fetch playback token, fall back to the plain URL if it fails.
  useEffect(() => {
    let cancelled = false;
    const PLAYER_PARAMS = 'autoplay=true&muted=false&preload=true&responsive=true';

    const resolveVideoUrl = async () => {
      if (!lesson) {
        setVideoUrl(null);
        return;
      }

      // Non-Bunny direct URL (already a full http link, no library) — use as-is.
      if (lesson.videoUrl && lesson.videoUrl.startsWith('http') && !lesson.libraryId) {
        if (!cancelled) setVideoUrl(lesson.videoUrl);
        return;
      }

      // Bunny video: fetch the signed embed URL.
      if (lesson.libraryId && lesson.videoUrl) {
        const plain = `https://iframe.mediadelivery.net/embed/${lesson.libraryId}/${lesson.videoUrl}`;
        setVideoResolving(true);
        try {
          const res = await coursesApi.getVideoPlaybackToken(lesson.videoUrl);
          const base = res?.embedUrl || plain;
          const sep = base.includes('?') ? '&' : '?';
          if (!cancelled) setVideoUrl(`${base}${sep}${PLAYER_PARAMS}`);
        } catch {
          // Token endpoint failed or token auth is off — fall back to plain URL.
          if (!cancelled) setVideoUrl(`${plain}?${PLAYER_PARAMS}`);
        } finally {
          if (!cancelled) setVideoResolving(false);
        }
        return;
      }

      if (!cancelled) setVideoUrl(null);
    };

    resolveVideoUrl();
    return () => {
      cancelled = true;
    };
  }, [lesson]);

  const getLessonTypeInfo = () => {
    if (!lesson) return { icon: 'play-circle', label: t('lessons.video'), color: theme.colors.primary };
    switch (lesson.type) {
      case 2:
        return { icon: 'document-text', label: t('courses.document'), color: '#3B82F6' };
      case 3:
        return { icon: 'clipboard', label: t('courses.exam'), color: '#F59E0B' };
      case 4:
        return { icon: 'document-attach', label: t('courses.file'), color: '#8B5CF6' };
      case 5:
        return { icon: 'link', label: t('courses.link'), color: '#0EA5E9' };
      default:
        return { icon: 'play-circle', label: t('lessons.video'), color: theme.colors.primary };
    }
  };

  const typeInfo = getLessonTypeInfo();
  const durationSec = Number((lesson as any)?.durationInSeconds ?? 0);
  const durationMin = durationSec > 0 ? Math.max(1, Math.round(durationSec / 60)) : null;
  const rawOrder = (lesson as any)?.orderIndex;
  const orderIndex = rawOrder != null && Number(rawOrder) > 0 ? Number(rawOrder) : null;
  // Tinted chip/icon backgrounds that read on both light and dark cards.
  const tintAlpha = theme.dark ? '26' : '1A';

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.colors.card }]} onPress={() => navigation.goBack()}>
            <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('lessons.loadingLesson')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <Spinner />
      </SafeAreaView>
    );
  }

  if (lockedAvailability) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.colors.card }]} onPress={() => navigation.goBack()}>
            <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('lessons.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ padding: 20 }}>
          <CourseLockedNotice availability={lockedAvailability} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !lesson) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.colors.card }]} onPress={() => navigation.goBack()}>
            <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('lessons.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <View style={[styles.errorIconWrap, { backgroundColor: theme.colors.danger + '15' }]}>
            <Ionicons name="alert-circle" size={40} color={theme.colors.danger} />
          </View>
          <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error || t('lessons.lessonNotFound')}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: theme.colors.primary }]} onPress={loadLesson} activeOpacity={0.7}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isQuiz ? theme.colors.background : '#000' }]} edges={['top']}>
      {/* Header — dark over the media area; quizzes have no media, so follow the theme */}
      <View style={[styles.header, { backgroundColor: isQuiz ? theme.colors.background : '#000' }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: isQuiz ? theme.colors.card : 'rgba(255,255,255,0.12)' }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={20} color={isQuiz ? theme.colors.text : '#fff'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isQuiz ? theme.colors.text : '#fff' }]} numberOfLines={1}>
          {lesson.title}
        </Text>
        {/* Mark Complete — read-only for quizzes (completed by solving) */}
        {!canComplete ? (
          <View style={{ width: 40 }} />
        ) : isQuiz || completed ? (
          completed ? (
            <View style={[styles.completeButton, styles.completedButton]}>
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
            </View>
          ) : (
            <View style={{ width: 40 }} />
          )
        ) : (
          <TouchableOpacity style={styles.completeButton} onPress={handleComplete} activeOpacity={0.7}>
            <Ionicons name="checkmark" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {isQuiz ? (
        lesson.examId ? (
          <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <LessonQuiz examId={lesson.examId} onFinished={onQuizFinished} />
          </View>
        ) : (
          <View style={[styles.noVideoContainer, { flex: 1, aspectRatio: undefined, backgroundColor: theme.colors.background }]}>
            <Ionicons name="clipboard-outline" size={40} color={theme.colors.textMuted} />
            <Text style={[styles.noVideoText, { color: theme.colors.textMuted }]}>{t('lessons.noVideo')}</Text>
          </View>
        )
      ) : (
        <>
          {/* Media area */}
          {isLink ? (
            lesson.openInNewTab || !(lesson.embedUrl || lesson.linkUrl) ? (
              <View style={styles.docPanel}>
                <View style={[styles.docIconBig, { backgroundColor: '#0EA5E9' }]}>
                  <Ionicons name="link" size={38} color="#fff" />
                </View>
                <Text style={styles.docPanelTitle} numberOfLines={2}>{lesson.title}</Text>
                <TouchableOpacity
                  style={[styles.docOpenBtn, { backgroundColor: '#0EA5E9' }]}
                  onPress={openLink}
                  activeOpacity={0.85}
                >
                  <Ionicons name="open-outline" size={18} color="#fff" />
                  <Text style={styles.docOpenBtnText}>{t('lessons.openLink')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.videoContainer}>
                <WebView
                  source={{ uri: (lesson.embedUrl || lesson.linkUrl) as string }}
                  style={styles.webview}
                  originWhitelist={['*']}
                  allowsFullscreenVideo
                  allowsInlineMediaPlayback
                  mediaPlaybackRequiresUserAction={false}
                  javaScriptEnabled
                  domStorageEnabled
                  startInLoadingState
                  renderLoading={() => (
                    <View style={styles.videoLoading}>
                      <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                  )}
                />
              </View>
            )
          ) : isDocOrFile ? (
            <View style={styles.docPanel}>
              <View style={[styles.docIconBig, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name={lesson.type === 4 ? 'document-attach' : 'document-text'} size={38} color="#fff" />
              </View>
              <Text style={styles.docPanelTitle} numberOfLines={2}>{lesson.title}</Text>
              <View style={styles.docActions}>
                <TouchableOpacity
                  style={[styles.docOpenBtn, { backgroundColor: theme.colors.primary, opacity: fileBusy ? 0.7 : 1 }]}
                  onPress={openDocument}
                  disabled={!!fileBusy}
                  activeOpacity={0.85}
                >
                  {fileBusy === 'open' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="open-outline" size={18} color="#fff" />
                  )}
                  <Text style={styles.docOpenBtnText}>
                    {fileBusy === 'open' ? t('lessons.downloading') : t('lessons.openDocument')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.docOpenBtn, styles.docSecondaryBtn, { opacity: fileBusy ? 0.7 : 1 }]}
                  onPress={downloadDocument}
                  disabled={!!fileBusy}
                  activeOpacity={0.85}
                >
                  {fileBusy === 'download' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="download-outline" size={18} color="#fff" />
                  )}
                  <Text style={styles.docOpenBtnText}>
                    {fileBusy === 'download' ? t('lessons.downloading') : t('lessons.downloadFile')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : videoUrl ? (
            <View style={styles.videoContainer}>
              <WebView
                source={{ html: buildPlayerHtml(videoUrl), baseUrl: PLAYER_REFERER }}
                style={styles.webview}
                originWhitelist={['*']}
                allowsFullscreenVideo
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState
                renderLoading={() => (
                  <View style={styles.videoLoading}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                  </View>
                )}
              />
            </View>
          ) : videoResolving ? (
            <View style={styles.noVideoContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
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
            <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
              <View style={styles.infoCardHeader}>
                <View style={[styles.typeBadge, { backgroundColor: typeInfo.color + tintAlpha }]}>
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

              <View style={styles.metaRow}>
                {durationMin != null && (
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={14} color={theme.colors.textMuted} />
                    <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>{durationMin} {t('exams.min')}</Text>
                  </View>
                )}
                {orderIndex != null && (
                  <View style={styles.metaItem}>
                    <Ionicons name="list-outline" size={14} color={theme.colors.textMuted} />
                    <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>{t('courses.lessonN', { n: orderIndex })}</Text>
                  </View>
                )}
              </View>

              {lesson.description ? (
                <View style={[styles.descriptionWrap, { borderTopColor: theme.dark ? theme.colors.border : theme.colors.divider }]}>
                  <Text style={[styles.lessonDescription, { color: theme.colors.textSecondary }]}>{lesson.description}</Text>
                </View>
              ) : null}
            </View>

            {canComplete && !completed && (
              <TouchableOpacity
                style={[styles.completeCard, { backgroundColor: theme.colors.card }]}
                onPress={handleComplete}
                activeOpacity={0.7}
              >
                <View style={[styles.completeCardIcon, { backgroundColor: '#34C38F' + tintAlpha }]}>
                  <Ionicons name="checkmark-done" size={20} color="#34C38F" />
                </View>
                <View style={styles.completeCardInfo}>
                  <Text style={[styles.completeCardTitle, { color: theme.colors.text }]}>{t('lessons.markComplete')}</Text>
                  <Text style={[styles.completeCardSub, { color: theme.colors.textMuted }]}>{t('lessons.lessonCompleted')}</Text>
                </View>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
          </ScrollView>
        </>
      )}

      {/* Document viewer */}
      <Modal visible={docViewerOpen} animationType="slide" onRequestClose={() => setDocViewerOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity style={[styles.backButton, { backgroundColor: 'rgba(255,255,255,0.12)' }]} onPress={() => setDocViewerOpen(false)}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: '#fff' }]} numberOfLines={1}>{lesson.title}</Text>
            <View style={{ width: 40 }} />
          </View>
          {localFile ? (
            <WebView
              source={{ uri: localFile.uri }}
              originWhitelist={['*']}
              allowFileAccess
              allowingReadAccessToURL={FileSystem.cacheDirectory ?? undefined}
              style={{ flex: 1, backgroundColor: '#fff' }}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.videoLoading}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
              )}
            />
          ) : null}
        </SafeAreaView>
      </Modal>
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
    ...typography.headerTitle,
    flex: 1,
    textAlign: 'center',
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
  // Document / file panel
  docPanel: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  docIconBig: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docPanelTitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_600SemiBold',
    color: '#fff',
    textAlign: 'center',
  },
  docActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  docOpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginTop: spacing.xs,
  },
  docSecondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  docOpenBtnText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_700Bold',
  },
  // Info section
  infoScroll: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 0,
  },
  infoContent: {
    padding: spacing.xl,
    paddingBottom: 40,
  },
  infoCard: {
    borderRadius: 20,
    padding: spacing.xl,
    
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
    fontFamily: 'Cairo_600SemiBold',
  },
  completedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedTagText: {
    fontSize: 12,
    fontFamily: 'Cairo_600SemiBold',
    color: '#34C38F',
  },
  lessonTitle: {
    fontSize: fontSize.lg,
    fontFamily: 'Cairo_700Bold',
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
    fontFamily: 'Cairo_500Medium',
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
    fontFamily: 'Cairo_600SemiBold',
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 14,
  },
  retryText: { ...typography.button, color: '#fff' },
});

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Share,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography, fontSize } from '../../theme/typography';
import * as WebBrowser from 'expo-web-browser';
import { coursesApi } from '../../services/api/courses.api';
import { CERTIFICATE_URLS } from '../../services/api/endpoints';
import type { Course, Section, Lesson } from '../../types/course.types';
import { getFullImageUrl } from '../../utils/imageUrl';
import { useRTL } from '../../i18n/RTLProvider';
import { useSound } from '../../hooks/useSound';
import { ErrorRetry } from '../../components/ui/ErrorRetry';

type Props = {
  navigation: NativeStackScreenProps<any, any>['navigation'];
  route: { params: { courseId: number } };
};

const { width: SCREEN_W } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_W * 0.56;

export default function CourseDetailScreen({ navigation, route }: Props) {
  const { courseId } = route.params;
  const { theme } = useTheme();
  const { user, isStudent, isAdmin, isStaff, domain } = useAuth();
  const { t, isRTL } = useRTL();
  const { play } = useSound();
  const insets = useSafeAreaInsets();

  const isOwner = isAdmin || isStaff;

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [certificateCode, setCertificateCode] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<number> | 'all'>('all');

  useEffect(() => { loadCourse(); }, [courseId]);

  const loadCourse = async () => {
    try {
      setError(null);
      setLoading(true);
      let data: Course | null = null;
      try {
        data = await coursesApi.getOnlineCourseSingle(courseId);
      } catch {
        data = await coursesApi.getSingle(courseId);
      }

      if (data && !data.sections) {
        const raw = data as any;
        if (Array.isArray(raw.courseSections)) data.sections = raw.courseSections;
        else if (Array.isArray(raw.onlineCourseSections)) data.sections = raw.onlineCourseSections;
      }

      if (data?.sections) {
        data.sections = data.sections.map((s: any) => ({
          ...s,
          lessons: s.lessons || s.courseLessons || s.onlineCourseLessons || [],
        }));
      }

      if (!data?.sections || data.sections.length === 0 || data.sections.every((s: any) => !s.lessons?.length)) {
        try {
          const sections = await coursesApi.getCourseSections(courseId);
          if (Array.isArray(sections) && sections.length > 0) {
            data = {
              ...data!,
              sections: sections.map((s: any) => ({
                ...s,
                title: s.title || s.name || `Section ${s.order ?? 0}`,
                lessons: s.lessons || s.courseLessons || s.onlineCourseLessons || [],
              })),
            };
          }
        } catch {}

      }

      setCourse(data);

      if (user?.studentId) {
        try {
          const enrollments = await coursesApi.getStudentEnrollments(user.studentId);
          const numCourseId = Number(courseId);
          let found = false;
          if (Array.isArray(enrollments)) {
            for (const e of enrollments) {
              const eCourseId = (e as any).courseId;
              if ((typeof eCourseId === 'number' ? eCourseId : Number(String(eCourseId).trim())) === numCourseId) {
                found = true;
                setCertificateCode((e as any).certificateCode ?? null);
                break;
              }
            }
          }
          setIsEnrolled(found);
        } catch {}
      }
    } catch (err: any) {
      setError(err?.userMessage || err?.message || 'Failed to load course details.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!user || !user.studentId) {
      Alert.alert(t('common.error'), t('courses.missingStudentId'));
      return;
    }
    setEnrolling(true);
    try {
      await coursesApi.enrollFree(courseId, user.studentId);
      setIsEnrolled(true);
      play('success');
      Alert.alert(t('common.success'), t('courses.enrolledSuccess'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('courses.enrollFailed'));
    } finally {
      setEnrolling(false);
    }
  };

  const handlePurchase = () => {
    play('tap');
    navigation.navigate('Checkout', {
      courseId,
      title: course?.title || course?.name,
      price: course?.price,
      discountPrice: course?.discountPrice,
      image: course?.previewImageUrl,
    });
  };

  const handleShare = async () => {
    if (!course) return;
    const title = course.title || course.name || '';
    const desc = course.description ? `\n${course.description.substring(0, 120)}...` : '';
    const shareUrl = domain
      ? `https://platx.net/${domain}/pages/online-courses/${courseId}/details`
      : `https://platx.net/pages/online-courses/${courseId}/details`;
    try {
      await Share.share({ message: `${title}${desc}\n\n${shareUrl}`, title });
    } catch {}
  };

  const getFirstLesson = (): Lesson | null => {
    if (!course?.sections) return null;
    for (const section of course.sections) {
      if (section.lessons?.length > 0) return section.lessons[0];
    }
    return null;
  };

  const handleWatch = () => {
    if (isStudent && !user?.studentId) {
      Alert.alert(t('common.error'), t('courses.missingStudentId'));
      return;
    }
    const firstLesson = getFirstLesson();
    if (firstLesson) {
      play('swoosh');
      navigation.navigate('LessonPlayer', { lessonId: firstLesson.id, courseId });
    } else {
      Alert.alert(t('common.info'), t('courses.noLessonsYet'));
    }
  };

  const hasLessons = course?.sections?.some((s) => s.lessons?.length > 0) ?? false;

  const toggleSection = (sectionId: number) => {
    setExpandedSections((prev) => {
      if (prev === 'all') {
        const allIds = new Set(course?.sections?.map(s => s.id) || []);
        allIds.delete(sectionId);
        return allIds;
      }
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const totalLessons = course?.sections?.reduce((n, s) => n + (s.lessons?.length || 0), 0) ?? 0;
  const isFree = course?.isFree || course?.price === 0;

  const lessonDone = (l: any): boolean => l?.isCompleated ?? l?.isCompleted ?? false;

  const lockedLessonIds = (): number[] => {
    if (!course?.quizPolicy) return [];
    const lessons = (course?.sections || []).flatMap((s) => s.lessons || []);
    const quizIdx = lessons.findIndex((l) => l.type === 3 && !lessonDone(l));
    if (quizIdx < 0) return [];
    return lessons.slice(quizIdx + 1).map((l) => l.id);
  };

  const openLesson = (lesson: Lesson) => {
    if (lockedIds.includes(lesson.id)) {
      play('pop');
      Alert.alert(t('common.info'), t('quiz.completeToContinue'));
      return;
    }
    play('tap');
    navigation.navigate('LessonPlayer', { lessonId: lesson.id, courseId });
  };

  const handleViewCertificate = async () => {
    if (!certificateCode) return;
    play('tap');
    try {
      await WebBrowser.openBrowserAsync(CERTIFICATE_URLS.WEB_VERIFY(certificateCode));
    } catch {}
  };

  const lockedIds = lockedLessonIds();

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <TouchableOpacity style={[styles.backBtnFloat, { backgroundColor: theme.colors.card, top: insets.top + spacing.sm }]} onPress={() => navigation.goBack()}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Spinner />
      </View>
    );
  }

  if (error || !course) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <TouchableOpacity style={[styles.backBtnFloat, { backgroundColor: theme.colors.card, top: insets.top + spacing.sm }]} onPress={() => navigation.goBack()}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <ErrorRetry message={error || t('courses.courseNotFound')} onRetry={loadCourse} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── Hero ── */}
        <View style={{ height: HERO_HEIGHT }}>
          {getFullImageUrl(course.previewImageUrl) ? (
            <Image source={{ uri: getFullImageUrl(course.previewImageUrl)! }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.primary + '22', justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="book" size={64} color={theme.colors.primary} />
            </View>
          )}
          <LinearGradient colors={['rgba(0,0,0,0.55)', 'transparent', 'rgba(0,0,0,0.6)']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />

          {/* Nav buttons */}
          <View style={[styles.heroNav, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity style={styles.heroNavBtn} onPress={() => navigation.goBack()}>
              <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.heroNavBtn} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Play button — only the button itself is tappable, not the whole hero */}
          {hasLessons && (
            <View style={styles.playCenter} pointerEvents="box-none">
              <TouchableOpacity onPress={handleWatch} activeOpacity={0.8}>
                <View style={[styles.playRing, { borderColor: 'rgba(255,255,255,0.4)' }]}>
                  <View style={[styles.playBtnLarge, { backgroundColor: theme.colors.primary }]}>
                    <Ionicons name="play" size={28} color="#fff" style={{ marginLeft: 3 }} />
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom labels */}
          <View style={styles.heroBottom}>
            {isFree ? (
              <View style={styles.freeBadgeHero}>
                <Text style={styles.freeBadgeHeroText}>{t('courses.free')}</Text>
              </View>
            ) : (
              <View style={styles.priceBadgeHero}>
                <Text style={styles.priceHeroMain}>${course.discountPrice || course.price || 0}</Text>
                {course.discountPrice != null && course.discountPrice < (course.price || 0) && (
                  <Text style={styles.priceHeroOld}>${course.price}</Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* ── Info card ── */}
        <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.courseTitle, { color: theme.colors.text }]}>
            {course.title || course.name || t('courses.untitled')}
          </Text>

          {course.instructorName ? (
            <View style={styles.instructorRow}>
              <View style={[styles.instructorDot, { backgroundColor: theme.colors.primary + '22' }]}>
                <Ionicons name="person" size={13} color={theme.colors.primary} />
              </View>
              <Text style={[styles.instructorName, { color: theme.colors.textSecondary }]}>{course.instructorName}</Text>
            </View>
          ) : null}

          {/* Stats row */}
          <View style={[styles.statsRow, { borderColor: theme.colors.divider }]}>
            {course.totalHours != null && (
              <View style={styles.statItem}>
                <Ionicons name="time-outline" size={16} color="#F5A623" />
                <Text style={[styles.statValue, { color: theme.colors.text }]}>{course.totalHours}h</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>{t('courses.total')}</Text>
              </View>
            )}
            <View style={[styles.statDivider, { backgroundColor: theme.colors.divider }]} />
            <View style={styles.statItem}>
              <Ionicons name="layers-outline" size={16} color={theme.colors.primary} />
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{totalLessons}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>{t('courses.lessons')}</Text>
            </View>
            {course.language ? (
              <>
                <View style={[styles.statDivider, { backgroundColor: theme.colors.divider }]} />
                <View style={styles.statItem}>
                  <Ionicons name="globe-outline" size={16} color="#3B82F6" />
                  <Text style={[styles.statValue, { color: theme.colors.text }]}>{course.language}</Text>
                  <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>{t('courses.lang')}</Text>
                </View>
              </>
            ) : null}
          </View>

          {/* Extra info: certificate + last updated */}
          {(course.hasCertificate || course.updateTime) && (
            <View style={styles.extraMetaRow}>
              {course.hasCertificate && (
                <View style={styles.metaPill}>
                  <Ionicons name="ribbon-outline" size={14} color={theme.colors.primary} />
                  <Text style={[styles.metaPillText, { color: theme.colors.textSecondary }]}>{t('courses.certificateIncluded')}</Text>
                </View>
              )}
              {course.updateTime && (
                <View style={styles.metaPill}>
                  <Ionicons name="calendar-outline" size={14} color={theme.colors.textMuted} />
                  <Text style={[styles.metaPillText, { color: theme.colors.textSecondary }]}>
                    {t('courses.updated')} {new Date(course.updateTime).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
          )}

          {course.description ? (
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{course.description}</Text>
          ) : null}
        </View>

        {/* ── Certificate card ── */}
        {certificateCode ? (
          <TouchableOpacity
            style={[styles.certCard, { backgroundColor: theme.colors.card }]}
            onPress={handleViewCertificate}
            activeOpacity={0.85}
          >
            <View style={[styles.certIcon, { backgroundColor: theme.colors.primary + '18' }]}>
              <Ionicons name="ribbon" size={22} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.certTitle, { color: theme.colors.text }]}>{t('courses.viewCertificate')}</Text>
              <Text style={[styles.certSub, { color: theme.colors.textMuted }]} numberOfLines={1}>{certificateCode}</Text>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        ) : null}

        {/* ── Sections & Lessons ── */}
        {course.sections && course.sections.length > 0 && (
          <View style={styles.sectionsWrap}>
            <View style={styles.sectionsHeadRow}>
              <Text style={[styles.sectionsHeading, { color: theme.colors.text }]}>{t('courses.lessons')}</Text>
              <Text style={[styles.sectionsCount, { color: theme.colors.textMuted }]}>
                {totalLessons} {t('courses.lessons')}
              </Text>
            </View>

            {course.sections.map((section: Section, sIdx: number) => {
              const isExpanded = expandedSections === 'all' || expandedSections.has(section.id);
              const lessonCount = section.lessons?.length || 0;
              return (
                <View key={section.id} style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}>
                  <TouchableOpacity
                    style={[styles.sectionHeader, { borderBottomColor: theme.colors.divider, borderBottomWidth: isExpanded && lessonCount > 0 ? 1 : 0 }]}
                    onPress={() => { play('pop'); toggleSection(section.id); }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.sectionNumBadge, { backgroundColor: theme.colors.primary }]}>
                      <Text style={styles.sectionNumText}>{sIdx + 1}</Text>
                    </View>
                    <View style={styles.sectionMeta}>
                      <Text style={[styles.sectionTitle, { color: theme.colors.text }]} numberOfLines={1}>{section.title}</Text>
                      <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>
                        {lessonCount} {t('courses.lessons')}
                      </Text>
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={theme.colors.textMuted}
                    />
                  </TouchableOpacity>

                  {isExpanded && section.lessons?.map((lesson, lIdx) => {
                    const isDoc = lesson.type === 2;
                    const isQuiz = lesson.type === 3;
                    const isFile = lesson.type === 4;
                    const isLink = lesson.type === 5;
                    const done = lessonDone(lesson);
                    const locked = lockedIds.includes(lesson.id);

                    const iconName = done ? 'checkmark-circle' : isLink ? 'link' : isFile ? 'download' : isDoc ? 'document-text' : isQuiz ? 'clipboard' : 'play-circle';
                    const iconColor = done ? '#34C38F' : isLink ? '#0EA5E9' : isFile ? '#8B5CF6' : isDoc ? '#3B82F6' : isQuiz ? '#F59E0B' : theme.colors.primary;
                    const iconBg = done ? '#E8F8F0' : isLink ? '#E8F6FE' : isFile ? '#F3EEFF' : isDoc ? '#EFF6FF' : isQuiz ? '#FFFBEB' : theme.colors.primary + '15';

                    return (
                      <TouchableOpacity
                        key={lesson.id}
                        style={[
                          styles.lessonRow,
                          locked && { opacity: 0.55 },
                          lIdx < lessonCount - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
                        ]}
                        onPress={() => openLesson(lesson)}
                        activeOpacity={0.65}
                      >
                        {/* Lesson number */}
                        <Text style={[styles.lessonNum, { color: theme.colors.textMuted }]}>{lIdx + 1}</Text>

                        {/* Icon */}
                        <View style={[styles.lessonIconWrap, { backgroundColor: theme.dark ? theme.colors.surface : iconBg }]}>
                          <Ionicons name={iconName as any} size={17} color={iconColor} />
                        </View>

                        {/* Info */}
                        <View style={styles.lessonInfo}>
                          <Text style={[styles.lessonTitle, { color: theme.colors.text }]} numberOfLines={2}>
                            {lesson.title}
                          </Text>
                          <View style={styles.lessonMeta}>
                            {lesson.duration != null && (
                              <View style={styles.lessonMetaChip}>
                                <Ionicons name="time-outline" size={11} color={theme.colors.textMuted} />
                                <Text style={[styles.lessonMetaText, { color: theme.colors.textMuted }]}> {lesson.duration}m</Text>
                              </View>
                            )}
                            {isDoc && <View style={[styles.lessonTypePill, { backgroundColor: '#EFF6FF' }]}><Text style={[styles.lessonTypePillText, { color: '#3B82F6' }]}>{t('courses.document')}</Text></View>}
                            {isFile && <View style={[styles.lessonTypePill, { backgroundColor: '#F3EEFF' }]}><Text style={[styles.lessonTypePillText, { color: '#8B5CF6' }]}>{t('courses.file')}</Text></View>}
                            {isLink && <View style={[styles.lessonTypePill, { backgroundColor: '#E8F6FE' }]}><Text style={[styles.lessonTypePillText, { color: '#0EA5E9' }]}>{t('courses.link')}</Text></View>}
                            {isQuiz && <View style={[styles.lessonTypePill, { backgroundColor: '#FFFBEB' }]}><Text style={[styles.lessonTypePillText, { color: '#F59E0B' }]}>{t('courses.exam')}</Text></View>}
                          </View>
                        </View>

                        {/* Lock or play arrow */}
                        <View style={[styles.lessonArrow, { backgroundColor: theme.dark ? theme.colors.surface : (locked ? theme.colors.textMuted + '18' : theme.colors.primary + '12') }]}>
                          <Ionicons
                            name={locked ? 'lock-closed' : (isRTL ? 'chevron-back' : 'chevron-forward')}
                            size={14}
                            color={locked ? theme.colors.textMuted : theme.colors.primary}
                          />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── Sticky Action Bar ── */}
      <View style={[styles.stickyBar, { backgroundColor: theme.colors.card, paddingBottom: insets.bottom + spacing.md, borderTopColor: theme.colors.divider }]}>
        {isEnrolled || isOwner ? (
          <View style={styles.stickyActions}>
            <Button
              title={t('courses.watch')}
              onPress={handleWatch}
              size="large"
              icon={<Ionicons name="play-circle" size={22} color="#fff" />}
              style={{ borderRadius: 16, flex: isOwner && !isFree ? 1 : undefined }}
              fullWidth={!(isOwner && !isFree)}
            />
            {isOwner && !isFree && (
              <Button
                title={t('enrollStudent.title')}
                onPress={() => navigation.navigate('EnrollStudent', { courseId, courseName: course.title || course.name })}
                size="large"
                variant="outline"
                icon={<Ionicons name="person-add-outline" size={20} color={theme.colors.primary} />}
                style={{ borderRadius: 16, flex: 1 }}
              />
            )}
          </View>
        ) : (
          <View style={styles.stickyActions}>
            {hasLessons && (
              <Button
                title={t('courses.watch')}
                onPress={handleWatch}
                size="large"
                variant="outline"
                icon={<Ionicons name="play-circle" size={20} color={theme.colors.primary} />}
                style={{ borderRadius: 16, flex: 1 }}
              />
            )}
            <Button
              title={isFree ? t('courses.enrollForFree') : t('courses.buyNow')}
              onPress={isFree ? handleEnroll : handlePurchase}
              loading={enrolling}
              size="large"
              style={{ borderRadius: 16, flex: hasLessons ? 1.5 : undefined }}
              fullWidth={!hasLessons}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  backBtnFloat: {
    position: 'absolute',
    left: spacing.xl,
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  // Hero
  heroNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  heroNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtnLarge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBottom: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.xl,
    right: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  freeBadgeHero: {
    backgroundColor: '#34C38F',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 10,
  },
  freeBadgeHeroText: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_700Bold',
    color: '#fff',
  },
  priceBadgeHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priceHeroMain: {
    fontSize: fontSize.xl,
    fontFamily: 'Cairo_700Bold',
    color: '#fff',
  },
  priceHeroOld: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_500Medium',
    color: 'rgba(255,255,255,0.6)',
    textDecorationLine: 'line-through',
  },

  // Info card
  infoCard: {
    marginTop: -20,
    marginHorizontal: spacing.xl,
    borderRadius: 22,
    padding: spacing.xl,
    
  },
  courseTitle: {
    fontSize: fontSize.xl,
    fontFamily: 'Cairo_700Bold',
    lineHeight: 30,
    marginBottom: spacing.sm,
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  instructorDot: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructorName: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_500Medium',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statDivider: {
    width: 1,
    height: 36,
  },
  statValue: {
    fontSize: fontSize.base,
    fontFamily: 'Cairo_700Bold',
    marginTop: 2,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Cairo_500Medium',
  },
  description: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_400Regular',
    lineHeight: 22,
  },
  extraMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaPillText: {
    fontSize: 12,
    fontFamily: 'Cairo_500Medium',
  },

  // Certificate card
  certCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    marginHorizontal: spacing.xl,
    borderRadius: 18,
    padding: spacing.lg,
  },
  certIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  certTitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_700Bold',
  },
  certSub: {
    fontSize: 11,
    fontFamily: 'Cairo_500Medium',
    marginTop: 2,
  },

  // Sections
  sectionsWrap: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  sectionsHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sectionsHeading: {
    fontSize: fontSize.lg,
    fontFamily: 'Cairo_700Bold',
  },
  sectionsCount: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_500Medium',
  },
  sectionCard: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionNumBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionNumText: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_700Bold',
    color: '#fff',
  },
  sectionMeta: { flex: 1 },
  sectionTitle: {
    fontSize: fontSize.base,
    fontFamily: 'Cairo_600SemiBold',
  },
  sectionSubtitle: {
    fontSize: 11,
    fontFamily: 'Cairo_400Regular',
    marginTop: 1,
  },

  // Lessons
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  lessonNum: {
    width: 18,
    fontSize: 11,
    fontFamily: 'Cairo_600SemiBold',
    textAlign: 'center',
  },
  lessonIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lessonInfo: { flex: 1 },
  lessonTitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_500Medium',
    lineHeight: 20,
  },
  lessonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 3,
  },
  lessonMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lessonMetaText: {
    fontSize: 11,
    fontFamily: 'Cairo_400Regular',
  },
  lessonTypePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lessonTypePillText: {
    fontSize: 10,
    fontFamily: 'Cairo_600SemiBold',
  },
  lessonArrow: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Sticky bar
  stickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    borderTopWidth: 1,
    
  },
  stickyActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});

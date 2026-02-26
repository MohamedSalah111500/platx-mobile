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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography, fontSize } from '../../theme/typography';
import { coursesApi } from '../../services/api/courses.api';
import type { CoursesStackParamList } from '../../types/navigation.types';
import type { Course, Section, Lesson } from '../../types/course.types';
import { getFullImageUrl } from '../../utils/imageUrl';
import { useRTL } from '../../i18n/RTLProvider';
import { useSound } from '../../hooks/useSound';

type Props = NativeStackScreenProps<CoursesStackParamList, 'CourseDetail'>;

const ACCENT = '#7c63fd';
const BG = '#FFFFFF';

export default function CourseDetailScreen({ navigation, route }: Props) {
  const { courseId } = route.params;
  const { theme } = useTheme();
  const { user, isStudent, domain } = useAuth();
  const { t } = useRTL();
  const { play } = useSound();

  if (isStudent && !user?.studentId) {
    console.warn('[CourseDetail] student without studentId, enroll/watch may not work');
  }
  const insets = useSafeAreaInsets();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<number> | 'all'>('all');

  const bgColor = theme.dark ? theme.colors.background : BG;

  useEffect(() => {
    loadCourse();
  }, [courseId]);

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

      console.log('[Course] Raw keys:', data ? Object.keys(data) : 'null');

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

      console.log('[Course] sections:', data?.sections?.length, 'lessons:', data?.sections?.reduce((n: number, s: any) => n + (s.lessons?.length || 0), 0));

      if (!data?.sections || data.sections.length === 0 || data.sections.every((s: any) => !s.lessons?.length)) {
        console.log('[Course] No sections/lessons in standard response, trying CourseSection endpoint...');

        // Try the CourseSection endpoint first (this is what the web app uses)
        try {
          const sections = await coursesApi.getCourseSections(courseId);
          console.log('[Course] CourseSection response:', sections?.length);
          if (Array.isArray(sections) && sections.length > 0) {
            data = {
              ...data!,
              sections: sections.map((s: any) => ({
                ...s,
                title: s.title || s.name || `Section ${s.order ?? 0}`,
                lessons: s.lessons || s.courseLessons || s.onlineCourseLessons || [],
              })),
            };
            console.log('[Course] Got sections from CourseSection:', data.sections!.length, 'lessons:', data.sections!.reduce((n: number, s: any) => n + (s.lessons?.length || 0), 0));
          }
        } catch (secErr) {
          console.log('[Course] CourseSection fetch failed:', secErr);
        }

        // If still no lessons, try OnlineCourse lessons endpoint
        if (!data?.sections || data.sections.length === 0 || data.sections.every((s: any) => !s.lessons?.length)) {
          try {
            const lessons: Lesson[] = await coursesApi.getOnlineCourseLessons(courseId);
            console.log('[Course] Fetched lessons separately:', lessons?.length);
            if (Array.isArray(lessons) && lessons.length > 0) {
              const sectionMap = new Map<number, { id: number; title: string; order: number; lessons: Lesson[] }>();
              lessons.forEach((lesson) => {
                const sId = lesson.sectionId || 0;
                if (!sectionMap.has(sId)) {
                  sectionMap.set(sId, {
                    id: sId,
                    title: sId === 0 ? t('courses.lessons') : `Section ${sectionMap.size + 1}`,
                    order: sectionMap.size,
                    lessons: [],
                  });
                }
                sectionMap.get(sId)!.lessons.push(lesson);
              });
              data = { ...data!, sections: Array.from(sectionMap.values()) };
            }
          } catch (lessonErr) {
            console.log('[Course] Lessons fetch failed:', lessonErr);
          }
        }
      }

      setCourse(data);
      console.log('[CourseDetail] Course loaded, sections:', data?.sections?.length, 'lessons total:', data?.sections?.reduce((n: number, s: any) => n + (s.lessons?.length || 0), 0));

      // Check if user is already enrolled — robust type-safe comparison
      if (user?.studentId) {
        try {
          const enrollments = await coursesApi.getStudentEnrollments(user.studentId);
          console.log('[CourseDetail] Raw enrollments response:', JSON.stringify(enrollments).substring(0, 500));
          const numCourseId = Number(courseId);
          console.log('[CourseDetail] Looking for courseId:', numCourseId);
          
          let found = false;
          if (Array.isArray(enrollments)) {
            for (const e of enrollments) {
              const eCourseId = (e as any).courseId;
              const eCoursIdNum = typeof eCourseId === 'number' ? eCourseId : Number(String(eCourseId).trim());
              console.log('[CourseDetail] Enrollment item - courseId:', eCourseId, '(type:', typeof eCourseId, ')', 'numericized:', eCoursIdNum, 'matches?', eCoursIdNum === numCourseId);
              if (eCoursIdNum === numCourseId) {
                found = true;
                console.log('[CourseDetail] ✓ FOUND MATCHING ENROLLMENT');
                break;
              }
            }
          }
          console.log('[CourseDetail] Final enrollment result: found=', found, 'will setIsEnrolled to', Boolean(found));
          setIsEnrolled(found);
        } catch (err: any) {
          console.error('[CourseDetail] Enrollment check failed:', err?.message || err);
        }
      } else {
        console.log('[CourseDetail] No studentId, skipping enrollment check');
      }
    } catch (err: any) {
      const msg = err?.userMessage || err?.message || 'Failed to load course details.';
      setError(msg);
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

  const handleShare = async () => {
    if (!course) return;
    const title = course.title || course.name || '';
    const desc = course.description ? `\n${course.description.substring(0, 120)}...` : '';
    const shareUrl = domain
      ? `https://platx.net/${domain}/pages/online-courses/${courseId}/details`
      : `https://platx.net/pages/online-courses/${courseId}/details`;
    try {
      await Share.share({
        message: `${title}${desc}\n\n${shareUrl}`,
        title,
      });
    } catch {}
  };

  const getFirstLesson = (): Lesson | null => {
    if (!course?.sections) return null;
    for (const section of course.sections) {
      if (section.lessons?.length > 0) {
        return section.lessons[0];
      }
    }
    return null;
  };

  const handleWatch = () => {
    if (isStudent && !user?.studentId) {
      Alert.alert(t('common.error'), t('courses.missingStudentId'));
      return;
    }
    const firstLesson = getFirstLesson();
    console.log('[CourseDetail] handleWatch: firstLesson=', firstLesson);
    if (firstLesson) {
      play('swoosh');
      navigation.navigate('LessonPlayer', { lessonId: firstLesson.id, courseId });
    } else {
      Alert.alert(t('common.info'), t('courses.noLessonsYet'));
    }
  };

  const hasLessons = course?.sections?.some((s) => s.lessons?.length > 0) ?? false;
  console.log('[CourseDetail] isEnrolled=', isEnrolled, 'hasLessons=', hasLessons, 'will show Watch?', isEnrolled && hasLessons);

  const toggleSection = (sectionId: number) => {
    setExpandedSections((prev) => {
      if (prev === 'all') {
        const allIds = new Set(course?.sections?.map(s => s.id) || []);
        allIds.delete(sectionId);
        return allIds;
      }
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bgColor, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: theme.colors.card }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        <Spinner />
      </View>
    );
  }

  if (error || !course) {
    return (
      <View style={[styles.container, { backgroundColor: bgColor, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: theme.colors.card }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('courses.courseDetails')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <View style={[styles.errorIcon, { backgroundColor: theme.colors.danger + '15' }]}>
            <Ionicons name="alert-circle" size={40} color={theme.colors.danger} />
          </View>
          <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error || t('courses.courseNotFound')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadCourse} activeOpacity={0.7}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isFree = course.isFree || course.price === 0;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Hero image */}
        <TouchableOpacity
          style={styles.heroWrap}
          onPress={hasLessons ? handleWatch : undefined}
          activeOpacity={hasLessons ? 0.8 : 1}
        >
          {getFullImageUrl(course.previewImageUrl) ? (
            <Image source={{ uri: getFullImageUrl(course.previewImageUrl)! }} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder, { backgroundColor: ACCENT + '15' }]}>
              <Ionicons name="book" size={48} color={ACCENT} />
            </View>
          )}
          {hasLessons && (
            <View style={styles.playOverlay}>
              <View style={styles.playBtn}>
                <Ionicons name="play" size={30} color="#fff" />
              </View>
            </View>
          )}
          {/* Back + Share overlay buttons */}
          <View style={[styles.heroNav, { paddingTop: insets.top + spacing.sm }]}>
            <TouchableOpacity
              style={styles.heroNavBtn}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroNavBtn}
              onPress={handleShare}
            >
              <Ionicons name="share-social" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* Content card */}
        <View style={[styles.contentCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.courseTitle, { color: theme.colors.text }]}>
            {course.title || course.name || t('courses.untitled')}
          </Text>

          {course.instructorName ? (
            <View style={styles.instructorRow}>
              <View style={[styles.instructorAvatar, { backgroundColor: '#F0EDFF' }]}>
                <Ionicons name="person" size={16} color={ACCENT} />
              </View>
              <Text style={[styles.instructorName, { color: theme.colors.textSecondary }]}>
                {course.instructorName}
              </Text>
            </View>
          ) : null}

          {/* Meta pills */}
          <View style={styles.metaPills}>
            {course.totalHours != null && (
              <View style={[styles.metaPill, { backgroundColor: theme.dark ? theme.colors.surface : '#FFF4E5' }]}>
                <Ionicons name="time" size={14} color="#F5A623" />
                <Text style={[styles.metaPillText, { color: '#F5A623' }]}>
                  {t('courses.hTotal', { hours: course.totalHours })}
                </Text>
              </View>
            )}
            {course.totalLessons != null && (
              <View style={[styles.metaPill, { backgroundColor: theme.dark ? theme.colors.surface : '#F0EDFF' }]}>
                <Ionicons name="layers" size={14} color={ACCENT} />
                <Text style={[styles.metaPillText, { color: ACCENT }]}>
                  {t('courses.nLessons', { count: course.totalLessons })}
                </Text>
              </View>
            )}
            {course.language ? (
              <View style={[styles.metaPill, { backgroundColor: theme.dark ? theme.colors.surface : '#E8F4FD' }]}>
                <Ionicons name="globe" size={14} color="#3B82F6" />
                <Text style={[styles.metaPillText, { color: '#3B82F6' }]}>
                  {course.language}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            {isFree ? (
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>{t('courses.free')}</Text>
              </View>
            ) : (
              <View style={styles.priceWrap}>
                <Text style={styles.priceMain}>
                  ${course.discountPrice || course.price || 0}
                </Text>
                {course.discountPrice != null &&
                  course.discountPrice < (course.price || 0) && (
                    <Text style={[styles.priceOld, { color: theme.colors.textMuted }]}>${course.price}</Text>
                  )}
              </View>
            )}
          </View>

          {course.description ? (
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              {course.description}
            </Text>
          ) : null}
        </View>

        {/* Sections & Lessons */}
        {course.sections && course.sections.length > 0 && (
          <View style={styles.sectionsWrap}>
            <Text style={[styles.sectionsHeading, { color: theme.colors.text }]}>
              {t('courses.lessons')}
            </Text>
            {course.sections.map((section: Section) => (
              <View key={section.id} style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}>
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => { play('pop'); toggleSection(section.id); }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.sectionIcon, { backgroundColor: '#F0EDFF' }]}>
                    <Ionicons name="folder" size={16} color={ACCENT} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{section.title}</Text>
                  <Ionicons
                    name={expandedSections === 'all' || expandedSections.has(section.id) ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={theme.colors.textMuted}
                  />
                </TouchableOpacity>

                {(expandedSections === 'all' || expandedSections.has(section.id)) &&
                  section.lessons?.map((lesson, lIdx) => {
                    const lessonIcon = lesson.isCompleted
                      ? 'checkmark-circle'
                      : lesson.type === 2
                        ? 'document-text'
                        : lesson.type === 3
                          ? 'clipboard'
                          : 'play-circle';
                    const lessonIconColor = lesson.isCompleted
                      ? '#34C38F'
                      : lesson.type === 2
                        ? '#3B82F6'
                        : lesson.type === 3
                          ? '#F59E0B'
                          : ACCENT;
                    const lessonIconBg = lesson.isCompleted
                      ? '#E8F8F0'
                      : lesson.type === 2
                        ? '#EFF6FF'
                        : lesson.type === 3
                          ? '#FFFBEB'
                          : '#F0EDFF';
                    return (
                      <TouchableOpacity
                        key={lesson.id}
                        style={[
                          styles.lessonRow,
                          lIdx < (section.lessons?.length || 0) - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
                        ]}
                        onPress={() => { play('tap'); navigation.navigate('LessonPlayer', { lessonId: lesson.id, courseId }); }}
                        activeOpacity={0.6}
                      >
                        <View style={[styles.lessonIconWrap, { backgroundColor: theme.dark ? theme.colors.surface : lessonIconBg }]}>
                          <Ionicons name={lessonIcon as any} size={18} color={lessonIconColor} />
                        </View>
                        <View style={styles.lessonInfo}>
                          <Text style={[styles.lessonTitle, { color: theme.colors.text }]} numberOfLines={1}>
                            {lesson.title}
                          </Text>
                          <View style={styles.lessonMeta}>
                            <Text style={[styles.lessonNumber, { color: theme.colors.textMuted }]}>
                              {t('courses.lessonN', { n: lIdx + 1 })}
                            </Text>
                            {lesson.duration != null && (
                              <>
                                <Text style={[styles.lessonMetaDot, { color: theme.colors.textMuted }]}>{' · '}</Text>
                                <Ionicons name="time-outline" size={11} color={theme.colors.textMuted} />
                                <Text style={[styles.lessonDuration, { color: theme.colors.textMuted }]}>
                                  {' '}{lesson.duration}m
                                </Text>
                              </>
                            )}
                            {lesson.type === 2 && (
                              <>
                                <Text style={[styles.lessonMetaDot, { color: theme.colors.textMuted }]}>{' · '}</Text>
                                <Text style={[styles.lessonTypeBadge, { color: '#3B82F6' }]}>{t('courses.document')}</Text>
                              </>
                            )}
                            {lesson.type === 3 && (
                              <>
                                <Text style={[styles.lessonMetaDot, { color: theme.colors.textMuted }]}>{' · '}</Text>
                                <Text style={[styles.lessonTypeBadge, { color: '#F59E0B' }]}>{t('courses.exam')}</Text>
                              </>
                            )}
                          </View>
                        </View>
                        {lesson.isCompleted && (
                          <View style={styles.completedBadge}>
                            <Ionicons name="checkmark" size={10} color="#fff" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionWrap}>
          {isEnrolled ? (
            // Enrolled — always show Watch button
            <Button
              title={t('courses.watch')}
              onPress={handleWatch}
              fullWidth
              size="large"
              icon={<Ionicons name="play-circle" size={22} color="#fff" />}
              style={{ borderRadius: 16 }}
            />
          ) : (
            // Not enrolled — show Watch preview + Enroll
            <>
              {hasLessons && (
                <Button
                  title={t('courses.watch')}
                  onPress={handleWatch}
                  fullWidth
                  size="large"
                  icon={<Ionicons name="play-circle" size={22} color="#fff" />}
                  style={{ borderRadius: 16 }}
                />
              )}
              <View style={{ height: spacing.sm }} />
              <Button
                title={isFree ? t('courses.enrollForFree') : t('courses.enroll')}
                onPress={handleEnroll}
                loading={enrolling}
                fullWidth
                size="large"
                variant={hasLessons ? 'outline' : 'primary'}
                style={{ borderRadius: 16 }}
              />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h3,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  // Hero
  heroWrap: {
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: 240,
  },
  heroPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 3,
  },
  // Content
  contentCard: {
    marginTop: -24,
    marginHorizontal: spacing.xl,
    borderRadius: 22,
    padding: spacing.xl,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  courseTitle: {
    ...typography.h3,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  instructorAvatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  instructorName: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  metaPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  metaPillText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  priceRow: {
    marginBottom: spacing.lg,
  },
  freeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  freeBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: '#34C38F',
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  priceMain: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: ACCENT,
  },
  priceOld: {
    fontSize: fontSize.base,
    textDecorationLine: 'line-through',
  },
  description: {
    ...typography.body,
    lineHeight: 24,
  },
  // Sections
  sectionsWrap: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  sectionsHeading: {
    ...typography.h4,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  sectionCard: {
    borderRadius: 18,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
      },
      android: { elevation: 1 },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    flex: 1,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginLeft: spacing.sm,
    gap: spacing.sm,
  },
  lessonIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginBottom: 2,
  },
  lessonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lessonNumber: {
    fontSize: 11,
    fontWeight: '500',
  },
  lessonMetaDot: {
    fontSize: 11,
  },
  lessonDuration: {
    fontSize: 11,
  },
  lessonTypeBadge: {
    fontSize: 11,
    fontWeight: '600',
  },
  completedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#34C38F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Actions
  actionWrap: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  // Error
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['3xl'],
  },
  errorIcon: {
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

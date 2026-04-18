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
import { coursesApi } from '../../services/api/courses.api';
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
  const { user, isStudent, domain } = useAuth();
  const { t, isRTL } = useRTL();
  const { play } = useSound();
  const insets = useSafeAreaInsets();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
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

        if (!data?.sections || data.sections.length === 0 || data.sections.every((s: any) => !s.lessons?.length)) {
          try {
            const lessons: Lesson[] = await coursesApi.getOnlineCourseLessons(courseId);
            if (Array.isArray(lessons) && lessons.length > 0) {
              const sectionMap = new Map<number, { id: number; title: string; order: number; lessons: Lesson[] }>();
              lessons.forEach((lesson) => {
                const sId = lesson.sectionId || 0;
                if (!sectionMap.has(sId)) {
                  sectionMap.set(sId, { id: sId, title: sId === 0 ? t('courses.lessons') : `Section ${sectionMap.size + 1}`, order: sectionMap.size, lessons: [] });
                }
                sectionMap.get(sId)!.lessons.push(lesson);
              });
              data = { ...data!, sections: Array.from(sectionMap.values()) };
            }
          } catch {}
        }
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

          {course.description ? (
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{course.description}</Text>
          ) : null}
        </View>

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
                    const isVideo = lesson.type !== 2 && lesson.type !== 3;
                    const isDoc = lesson.type === 2;
                    const isQuiz = lesson.type === 3;

                    const iconName = lesson.isCompleted ? 'checkmark-circle' : isDoc ? 'document-text' : isQuiz ? 'clipboard' : 'play-circle';
                    const iconColor = lesson.isCompleted ? '#34C38F' : isDoc ? '#3B82F6' : isQuiz ? '#F59E0B' : theme.colors.primary;
                    const iconBg = lesson.isCompleted ? '#E8F8F0' : isDoc ? '#EFF6FF' : isQuiz ? '#FFFBEB' : theme.colors.primary + '15';

                    return (
                      <TouchableOpacity
                        key={lesson.id}
                        style={[
                          styles.lessonRow,
                          lIdx < lessonCount - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
                        ]}
                        onPress={() => { play('tap'); navigation.navigate('LessonPlayer', { lessonId: lesson.id, courseId }); }}
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
                            {isQuiz && <View style={[styles.lessonTypePill, { backgroundColor: '#FFFBEB' }]}><Text style={[styles.lessonTypePillText, { color: '#F59E0B' }]}>{t('courses.exam')}</Text></View>}
                          </View>
                        </View>

                        {/* Play arrow */}
                        <View style={[styles.lessonArrow, { backgroundColor: theme.dark ? theme.colors.surface : theme.colors.primary + '12' }]}>
                          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={14} color={theme.colors.primary} />
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
        {isEnrolled ? (
          <Button
            title={t('courses.watch')}
            onPress={handleWatch}
            fullWidth
            size="large"
            icon={<Ionicons name="play-circle" size={22} color="#fff" />}
            style={{ borderRadius: 16 }}
          />
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
              title={isFree ? t('courses.enrollForFree') : t('courses.enroll')}
              onPress={handleEnroll}
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

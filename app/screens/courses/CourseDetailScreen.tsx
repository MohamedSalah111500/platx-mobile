import React, { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
import { reservationsApi } from '../../services/api/reservations.api';
import { CERTIFICATE_URLS } from '../../services/api/endpoints';
import { RESERVATION_STATUS, type StudentReservation } from '../../types/reservation.types';
import { COURSE_AVAILABILITY, type Course, type Section, type Lesson } from '../../types/course.types';
import { resolveCourseAvailability } from '../../utils/courseAvailability';
import { CourseLockedNotice } from '../../components/course/CourseLockedNotice';
import { CourseAvailabilityBadge } from '../../components/course/CourseAvailabilityBadge';
import { CoursePrice } from '../../components/course/CoursePrice';
import { REQUEST_ONLY } from '../../config/storePolicy';
import { getFullImageUrl } from '../../utils/imageUrl';
import { useRTL } from '../../i18n/RTLProvider';
import { useDisplayFormat } from '../../hooks/useDisplayFormat';
import { useSound } from '../../hooks/useSound';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { PartPurchaseSheet, type PartPurchase } from '../../components/course/PartPurchaseSheet';
import { formatAmount } from '../../utils/price';

import { appDateLocale } from '../../utils/dateLocale';
type Props = {
  navigation: NativeStackScreenProps<any, any>['navigation'];
  route: { params: { courseId: number } };
};

const { width: SCREEN_W } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_W * 0.56;

type RequestStatus = 'none' | 'pending' | 'rejected';

// Backend may serialize ReservationStatus as a number or as its name.
function reservationStatusOf(r: StudentReservation | undefined): RequestStatus {
  const s = r?.status;
  if (s === RESERVATION_STATUS.Pending || String(s).toLowerCase() === 'pending') return 'pending';
  if (s === RESERVATION_STATUS.Rejected || String(s).toLowerCase() === 'rejected') return 'rejected';
  return 'none';
}

export default function CourseDetailScreen({ navigation, route }: Props) {
  const { courseId } = route.params;
  const { theme } = useTheme();
  const { user, isStudent, isAdmin, isStaff, domain } = useAuth();
  const { t, isRTL } = useRTL();
  const format = useDisplayFormat();
  const { play } = useSound();
  const insets = useSafeAreaInsets();

  const isOwner = isAdmin || isStaff;
  // In dark mode `divider` equals the card colour, so lines drawn on cards vanish.
  const lineColor = theme.dark ? theme.colors.border : theme.colors.divider;

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [certificateCode, setCertificateCode] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<number> | 'all'>('all');
  const [requestStatus, setRequestStatus] = useState<RequestStatus>('none');
  const [purchase, setPurchase] = useState<PartPurchase | null>(null);

  // Load on first focus, then refresh silently every time the screen regains
  // focus (back from Checkout, or after staff approved the purchase request) so
  // the CTA flips from "Buy now" to "Watch" without leaving the app.
  const hasLoadedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      loadCourse(hasLoadedRef.current);
      hasLoadedRef.current = true;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courseId, user?.studentId])
  );

  // Guards against an older in-flight load (e.g. before studentId resolved)
  // finishing after a newer one and overwriting its enrollment/request state.
  const loadSeq = useRef(0);

  const loadCourse = async (silent = false) => {
    const seq = ++loadSeq.current;
    const stale = () => seq !== loadSeq.current;
    try {
      setError(null);
      if (!silent) setLoading(true);
      let data: Course | null = await coursesApi.getOnlineCourseSingle(courseId);

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

      if (isStudent || !data?.sections || data.sections.length === 0 || data.sections.every((s: any) => !s.lessons?.length)) {
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

      if (stale()) return;
      setCourse(data);

      // The course endpoint's isEnrolled flag is also true for Suspended/Cancelled
      // enrollments, so once studentId is known the (status-filtered) enrollments
      // list is the source of truth; the flag is only a fallback without it.
      // The enrollments list is also where the certificate code lives.
      const serverEnrolled = (data as any)?.isEnrolled === true;
      let found = false;
      // Stays true when the enrollments call fails, so we fall back to the flag.
      let useServerFlag = !user?.studentId;
      let status: RequestStatus = 'none';
      const numCourseId = Number(courseId);

      if (user?.studentId) {
        try {
          const enrollments = await coursesApi.getStudentEnrollments(user.studentId);
          for (const e of enrollments) {
            const raw = (e as any).courseId ?? (e as any).course?.id;
            if (Number(String(raw ?? '').trim()) === numCourseId) {
              found = true;
              setCertificateCode((e as any).certificateCode ?? null);
              break;
            }
          }
          useServerFlag = false;
        } catch {
          useServerFlag = true;
        }

        // Not enrolled yet → is there a purchase request in flight?
        if ((!found && !(useServerFlag && serverEnrolled)) || data?.hasFullAccess === false) {
          try {
            const mine = (await reservationsApi.getMine(user.studentId))
              .filter((r) => Number(r.courseId) === numCourseId)
              .sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
            status = reservationStatusOf(mine[0]);
          } catch {}
        }
      }

      if (stale()) return;
      if (!found) setCertificateCode(null);
      setIsEnrolled(useServerFlag ? serverEnrolled || found : found);
      setRequestStatus(status);
    } catch (err: any) {
      if (stale()) return;
      setError(err?.userMessage || t('courses.failedToLoadCourseDetails'));
    } finally {
      if (!stale()) setLoading(false);
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
    navigation.navigate('Checkout', {
      upgrade: isPartial,
      courseId,
      title: course?.title || course?.name,
      price: course?.price,
      discountPrice: course?.discountPrice,
      currencyCode: course?.currencyCode,
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
    for (const section of course?.sections || []) {
      const first = section.lessons?.find((l) => !isDivider(l) && isOwned(l));
      if (first) return first;
    }
    return null;
  };

  // Lessons without enrollment only play when marked as free preview (the lesson
  // endpoint strips the video/attachment otherwise).
  const getFreePreviewLesson = (): Lesson | null => {
    for (const section of course?.sections || []) {
      const preview = section.lessons?.find((l: any) => l?.freePreview === true);
      if (preview) return preview;
    }
    return null;
  };

  const handleWatch = () => {
    if (isLockedForStudent) return;
    if (isStudent && !user?.studentId) {
      Alert.alert(t('common.error'), t('courses.missingStudentId'));
      return;
    }
    const firstLesson = isEnrolled || isOwner ? getFirstLesson() : getFreePreviewLesson();
    if (firstLesson) {
      navigation.navigate('LessonPlayer', {
        lessonId: firstLesson.id,
        courseId,
        isCompleted: lessonDone(firstLesson),
        isEnrolled: isEnrolled && isOwned(firstLesson),
      });
    } else {
      Alert.alert(t('common.info'), t('courses.noLessonsYet'));
    }
  };

  const hasLessons = course?.sections?.some((s) => s.lessons?.length > 0) ?? false;
  const hasFreePreview = course?.sections?.some((s) => s.lessons?.some((l: any) => l?.freePreview === true)) ?? false;
  const canWatch = isEnrolled || isOwner ? hasLessons : hasFreePreview;

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

  const isDivider = (l: Lesson): boolean => l.type === 6;
  const totalLessons = course?.sections?.reduce((n, s) => n + (s.lessons?.filter((l) => !isDivider(l)).length || 0), 0) ?? 0;
  const isFree = course?.isFree || course?.price === 0;
  const availability = resolveCourseAvailability(course);
  const isLockedForStudent = !isOwner && availability !== COURSE_AVAILABILITY.Available;

  const lessonDone = (l: any): boolean => l?.isCompleated ?? l?.isCompleted ?? false;

  const isPartial = isStudent && isEnrolled && course?.hasFullAccess === false;
  const owns = (item: Section | Lesson): boolean => item.isEnrolled === true && !item.isSessionUnlocked;
  const isOwned = (l: Lesson): boolean => !isPartial || (l.isEnrolled !== false && !l.isSessionUnlocked);
  const isNotOwned = (l: Lesson): boolean => isPartial && l.isEnrolled === false && !l.isSessionUnlocked && !l.freePreview;
  const canBuyParts = isStudent && !REQUEST_ONLY && !isFree && !isLockedForStudent && course?.hasFullAccess !== true;
  const sectionForSale = (s: Section): boolean => canBuyParts && !!course?.sellSectionsSeparately && !owns(s) && Number(s.price) > 0;
  const lessonForSale = (s: Section, l: Lesson): boolean =>
    canBuyParts && !!course?.sellLessonsSeparately && !owns(s) && !owns(l) && Number(l.price) > 0;

  const buySection = (s: Section) => setPurchase({ kind: 'section', id: s.id, title: s.title, price: Number(s.price) });
  const buyLesson = (l: Lesson) => setPurchase({ kind: 'lesson', id: l.id, title: l.title, price: Number(l.price) });

  const onPartPaid = (bought: PartPurchase) => {
    setPurchase(null);
    play('success');
    Alert.alert(t('common.success'), t(bought.kind === 'section' ? 'courses.parts.sectionBought' : 'courses.parts.lessonBought'));
    loadCourse(true);
  };

  // Mirrors web course-learning lockedLessonIds. Only students are gated —
  // teachers/admins have no progress, so every quiz would look unsolved.
  const lockedLessonIds = (): number[] => {
    if (!isStudent || isOwner || !isEnrolled || !course?.quizPolicy) return [];
    if (Number((course as any).quizPolicyScope) === 1) {
      // Current-section-only: each section is gated by its own first unsolved quiz.
      return (course.sections || []).flatMap((s) => {
        const sectionLessons = s.lessons || [];
        const idx = sectionLessons.findIndex((l) => l.type === 3 && !lessonDone(l) && isOwned(l));
        return idx < 0 ? [] : sectionLessons.slice(idx + 1).map((l) => l.id);
      });
    }
    const lessons = (course?.sections || []).flatMap((s) => s.lessons || []);
    const quizIdx = lessons.findIndex((l) => l.type === 3 && !lessonDone(l) && isOwned(l));
    if (quizIdx < 0) return [];
    return lessons.slice(quizIdx + 1).map((l) => l.id);
  };

  const openLesson = (section: Section, lesson: Lesson) => {
    if (isLockedForStudent) return;
    if (isNotOwned(lesson) || (!isEnrolled && !isOwner && !lesson.freePreview && !lesson.isSessionUnlocked && (lessonForSale(section, lesson) || sectionForSale(section)))) {
      if (lessonForSale(section, lesson)) buyLesson(lesson);
      else if (sectionForSale(section)) buySection(section);
      else Alert.alert(t('common.info'), t('courses.parts.notIncluded'));
      return;
    }
    if (lockedIds.includes(lesson.id)) {
      Alert.alert(t('common.info'), t('quiz.completeToContinue'));
      return;
    }
    navigation.navigate('LessonPlayer', {
      lessonId: lesson.id,
      courseId,
      isCompleted: lessonDone(lesson),
      isEnrolled: isEnrolled && isOwned(lesson),
    });
  };

  const handleViewCertificate = async () => {
    if (!certificateCode) return;
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
        <ErrorRetry message={error || t('courses.courseNotFound')} onRetry={() => loadCourse()} />
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
          {canWatch && !isLockedForStudent && (
            <View style={styles.playCenter} pointerEvents="box-none">
              <TouchableOpacity onPress={handleWatch} activeOpacity={0.8}>
                <View style={[styles.playRing, { borderColor: 'rgba(255,255,255,0.4)' }]}>
                  <View style={[styles.playBtnLarge, { backgroundColor: theme.colors.primary }]}>
                    <Ionicons name="play" size={28} color="#fff" style={{ transform: [{ translateX: 2 }] }} />
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom labels */}
          {/* Price moved into the info card (see below) so the artwork stays clean. */}
          <View style={styles.heroBottom}>
            <CourseAvailabilityBadge availability={availability} forManager={isOwner} style={styles.availabilityBadge} />
          </View>
        </View>

        {/* ── Info card ── */}
        <View style={[styles.infoCard, { backgroundColor: theme.colors.card, borderColor: lineColor }]}>
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
          <View style={[styles.statsRow, { borderColor: lineColor }]}>
            {Math.round(course.totalHours ?? 0) > 0 && (
              <>
                <View style={styles.statItem}>
                  <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
                  <Text style={[styles.statValue, { color: theme.colors.text }]}>{Math.round(course.totalHours ?? 0)}</Text>
                  <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>{t('courses.hours')}</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: lineColor }]} />
              </>
            )}
            <View style={styles.statItem}>
              <Ionicons name="layers-outline" size={16} color={theme.colors.primary} />
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{totalLessons}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>{t('courses.lessons')}</Text>
            </View>
            {course.language ? (
              <>
                <View style={[styles.statDivider, { backgroundColor: lineColor }]} />
                <View style={styles.statItem}>
                  <Ionicons name="globe-outline" size={16} color={theme.colors.primary} />
                  <Text style={[styles.statValue, { color: theme.colors.text }]}>{format.language(course.language)}</Text>
                  <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>{t('courses.lang')}</Text>
                </View>
              </>
            ) : null}
          </View>

          {/* Price */}
          <CoursePrice
            price={course.price}
            discountPrice={course.discountPrice}
            currencyCode={course.currencyCode}
            isFree={isFree}
            style={styles.priceRow}
          />

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
                    {t('courses.updated')} {new Date(course.updateTime).toLocaleDateString(appDateLocale())}
                  </Text>
                </View>
              )}
            </View>
          )}

          {isPartial && (
            <View style={[styles.partChip, styles.partialPill, { backgroundColor: theme.colors.info + '1A' }]}>
              <Ionicons name="pie-chart-outline" size={14} color={theme.colors.info} />
              <Text style={[styles.partChipText, { color: theme.colors.info }]}>{t('courses.parts.partial')}</Text>
            </View>
          )}

          {course.description ? (
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{course.description}</Text>
          ) : null}
        </View>

        {isLockedForStudent && (
          <CourseLockedNotice availability={availability} style={styles.lockedNotice} />
        )}

        {isOwner && (
          <View style={[styles.manageCard, { backgroundColor: theme.colors.card, borderColor: lineColor }]}>
            <Text style={[styles.manageHeading, { color: theme.colors.textMuted }]}>{t('courses.manage.title')}</Text>
            {[
              { key: 'settings', icon: 'options-outline', label: t('courses.manage.settings'), sub: t('courses.manage.settingsSub'), screen: 'CourseSettings' as const },
              { key: 'students', icon: 'people-outline', label: t('courses.manage.students'), sub: t('courses.manage.studentsSub'), screen: 'CourseStudents' as const },
              { key: 'requests', icon: 'mail-unread-outline', label: t('courses.manage.requests'), sub: t(REQUEST_ONLY ? 'courses.manage.joinRequestsSub' : 'courses.manage.requestsSub'), screen: 'EnrollmentRequests' as const },
            ].map((row) => (
              <TouchableOpacity
                key={row.key}
                style={styles.manageRow}
                activeOpacity={0.7}
                onPress={() => {
                  navigation.navigate(row.screen, { courseId, courseName: course.title || course.name });
                }}
              >
                <View style={[styles.manageIcon, { backgroundColor: theme.colors.primary + '18' }]}>
                  <Ionicons name={row.icon as any} size={18} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.manageTitle, { color: theme.colors.text }]}>{row.label}</Text>
                  <Text style={[styles.manageSub, { color: theme.colors.textMuted }]} numberOfLines={1}>{row.sub}</Text>
                </View>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Certificate card ── */}
        {certificateCode ? (
          <TouchableOpacity
            style={[styles.certCard, { backgroundColor: theme.colors.card, borderColor: lineColor }]}
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
                {t('home.lessonsCount', { count: totalLessons })}
              </Text>
            </View>

            {course.sections.map((section: Section, sIdx: number) => {
              const isExpanded = expandedSections === 'all' || expandedSections.has(section.id);
              const lessonCount = section.lessons?.filter((l) => !isDivider(l)).length || 0;
              const rowCount = section.lessons?.length || 0;
              return (
                <View key={section.id} style={[styles.sectionCard, { backgroundColor: theme.colors.card, borderColor: lineColor }]}>
                  <TouchableOpacity
                    style={[styles.sectionHeader, { borderBottomColor: lineColor, borderBottomWidth: isExpanded && rowCount > 0 ? 1 : 0 }]}
                    onPress={() => { toggleSection(section.id); }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.sectionNumBadge, { backgroundColor: theme.colors.primary }]}>
                      <Text style={styles.sectionNumText}>{sIdx + 1}</Text>
                    </View>
                    <View style={styles.sectionMeta}>
                      <Text style={[styles.sectionTitle, { color: theme.colors.text }]} numberOfLines={1}>{section.title}</Text>
                      <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>
                        {t('home.lessonsCount', { count: lessonCount })}
                      </Text>
                    </View>
                    {canBuyParts && owns(section) ? (
                      <View style={[styles.partChip, { backgroundColor: theme.colors.success + '1A' }]}>
                        <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} />
                        <Text style={[styles.partChipText, { color: theme.colors.success }]}>{t('courses.parts.owned')}</Text>
                      </View>
                    ) : sectionForSale(section) ? (
                      <TouchableOpacity
                        style={[styles.partChip, { backgroundColor: theme.colors.primary + '1A' }]}
                        onPress={() => buySection(section)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                      >
                        <Ionicons name="cart-outline" size={14} color={theme.colors.primary} />
                        <Text style={[styles.partChipText, { color: theme.colors.primary }]}>
                          {t('courses.parts.buySection')} · {`${formatAmount(Number(section.price))} ${t('wallet.points')}`}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={theme.colors.textMuted}
                    />
                  </TouchableOpacity>

                  {isExpanded && section.lessons?.map((lesson, lIdx) => {
                    const rowBorder = lIdx < rowCount - 1 && { borderBottomWidth: 1, borderBottomColor: lineColor };
                    if (isDivider(lesson)) {
                      return (
                        <View key={lesson.id} style={[styles.dividerRow, rowBorder]}>
                          <View style={[styles.dividerLine, { backgroundColor: lineColor }]} />
                          <Text style={[styles.dividerTitle, { color: theme.colors.textMuted }]} numberOfLines={2}>{lesson.title}</Text>
                          <View style={[styles.dividerLine, { backgroundColor: lineColor }]} />
                        </View>
                      );
                    }
                    const lessonNumber = section.lessons.slice(0, lIdx).filter((l) => !isDivider(l)).length + 1;
                    const isDoc = lesson.type === 2;
                    const isQuiz = lesson.type === 3;
                    const isFile = lesson.type === 4;
                    const isLink = lesson.type === 5;
                    const done = lessonDone(lesson);
                    const locked = lockedIds.includes(lesson.id) || isNotOwned(lesson);
                    const forSale = lessonForSale(section, lesson);
                    const durationSec = Number((lesson as any).durationInSeconds ?? 0);
                    const durationMin = durationSec > 0 ? Math.max(1, Math.round(durationSec / 60)) : null;

                    const iconName = done ? 'checkmark-circle' : isLink ? 'link' : isFile ? 'download' : isDoc ? 'document-text' : isQuiz ? 'clipboard' : 'play-circle';
                    const iconColor = done ? theme.colors.success : theme.colors.primary;
                    const iconBg = iconColor + (theme.dark ? '26' : '18');
                    const pillAlpha = theme.dark ? '26' : '1A';

                    return (
                      <TouchableOpacity
                        key={lesson.id}
                        style={[
                          styles.lessonRow,
                          locked && { opacity: 0.55 },
                          rowBorder,
                        ]}
                        onPress={() => openLesson(section, lesson)}
                        activeOpacity={0.65}
                      >
                        {/* Lesson number */}
                        <Text style={[styles.lessonNum, { color: theme.colors.textMuted }]}>{lessonNumber}</Text>

                        {/* Icon */}
                        <View style={[styles.lessonIconWrap, { backgroundColor: iconBg }]}>
                          <Ionicons name={iconName as any} size={17} color={iconColor} />
                        </View>

                        {/* Info */}
                        <View style={styles.lessonInfo}>
                          <Text style={[styles.lessonTitle, { color: theme.colors.text }]} numberOfLines={2}>
                            {lesson.title}
                          </Text>
                          <View style={styles.lessonMeta}>
                            {durationMin != null && (
                              <View style={styles.lessonMetaChip}>
                                <Ionicons name="time-outline" size={11} color={theme.colors.textMuted} />
                                <Text style={[styles.lessonMetaText, { color: theme.colors.textMuted }]}>{durationMin} {t('exams.min')}</Text>
                              </View>
                            )}
                            {isDoc && <View style={[styles.lessonTypePill, { backgroundColor: theme.colors.primary + pillAlpha }]}><Text style={[styles.lessonTypePillText, { color: theme.colors.primary }]}>{t('courses.document')}</Text></View>}
                            {isFile && <View style={[styles.lessonTypePill, { backgroundColor: theme.colors.primary + pillAlpha }]}><Text style={[styles.lessonTypePillText, { color: theme.colors.primary }]}>{t('courses.file')}</Text></View>}
                            {isLink && <View style={[styles.lessonTypePill, { backgroundColor: theme.colors.primary + pillAlpha }]}><Text style={[styles.lessonTypePillText, { color: theme.colors.primary }]}>{t('courses.link')}</Text></View>}
                            {isQuiz && <View style={[styles.lessonTypePill, { backgroundColor: '#F59E0B' + pillAlpha }]}><Text style={[styles.lessonTypePillText, { color: '#F59E0B' }]}>{t('courses.exam')}</Text></View>}
                          </View>
                          {forSale && (
                            <TouchableOpacity
                              style={[styles.partChip, styles.lessonPartChip, { backgroundColor: theme.colors.primary + '1A' }]}
                              onPress={() => buyLesson(lesson)}
                              activeOpacity={0.7}
                              accessibilityRole="button"
                            >
                              <Ionicons name="cart-outline" size={14} color={theme.colors.primary} />
                              <Text style={[styles.partChipText, { color: theme.colors.primary }]}>
                                {t('courses.parts.buyLesson')} · {`${formatAmount(Number(lesson.price))} ${t('wallet.points')}`}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* Lock or play arrow */}
                        <View style={styles.lessonArrow}>
                          <Ionicons
                            name={locked ? 'lock-closed' : (isRTL ? 'chevron-back' : 'chevron-forward')}
                            size={18}
                            color={theme.colors.textMuted}
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
      {!isLockedForStudent && (
      <View style={[styles.stickyBar, { backgroundColor: theme.colors.card, paddingBottom: insets.bottom + spacing.md, borderTopColor: lineColor }]}>
        {isPartial ? (
          <>
            {requestStatus === 'rejected' && (
              <Text style={[styles.requestNotice, { color: theme.colors.danger }]}>{t('courses.requestRejected')}</Text>
            )}
            <View style={styles.stickyActions}>
              <Button
                title={t('courses.parts.continue')}
                onPress={handleWatch}
                size="large"
                icon={<Ionicons name="play-circle" size={22} color={theme.colors.onPrimary} />}
                style={{ borderRadius: 16, flex: 1 }}
              />
              {requestStatus === 'pending' ? (
                <Button
                  title={t(REQUEST_ONLY ? 'courses.joinRequestPending' : 'courses.pendingRequest')}
                  onPress={() => {}}
                  disabled
                  size="large"
                  variant="outline"
                  style={{ borderRadius: 16, flex: 1 }}
                />
              ) : (
                <Button
                  title={t(REQUEST_ONLY ? 'courses.requestToJoin' : 'courses.parts.buyFullCourse')}
                  onPress={handlePurchase}
                  size="large"
                  variant="outline"
                  style={{ borderRadius: 16, flex: 1 }}
                />
              )}
            </View>
            {!REQUEST_ONLY && (
              <Text style={[styles.upgradeNote, { color: theme.colors.textMuted }]}>{t('courses.parts.upgradeNote')}</Text>
            )}
          </>
        ) : isEnrolled || isOwner ? (
          <View style={styles.stickyActions}>
            <Button
              title={t('courses.watch')}
              onPress={handleWatch}
              size="large"
              icon={<Ionicons name="play-circle" size={22} color={theme.colors.onPrimary} />}
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
          <>
            {!isFree && requestStatus === 'rejected' && (
              <Text style={[styles.requestNotice, { color: theme.colors.danger }]}>{t('courses.requestRejected')}</Text>
            )}
            <View style={styles.stickyActions}>
              {hasFreePreview && (
                <Button
                  title={t('courses.watch')}
                  onPress={handleWatch}
                  size="large"
                  variant="outline"
                  icon={<Ionicons name="play-circle" size={20} color={theme.colors.primary} />}
                  style={{ borderRadius: 16, flex: 1 }}
                />
              )}
              {!isFree && requestStatus === 'pending' ? (
                // Request already sent — waiting for staff approval.
                <Button
                  title={t(REQUEST_ONLY ? 'courses.joinRequestPending' : 'courses.pendingRequest')}
                  onPress={() => {}}
                  disabled
                  size="large"
                  variant="outline"
                  icon={<Ionicons name="time-outline" size={20} color={theme.colors.primary} />}
                  style={{ borderRadius: 16, flex: hasFreePreview ? 1.5 : undefined }}
                  fullWidth={!hasFreePreview}
                />
              ) : (
                <Button
                  title={
                    isFree
                      ? t('courses.enrollForFree')
                      : t(REQUEST_ONLY ? 'courses.requestToJoin' : 'courses.buyNow')
                  }
                  onPress={isFree ? handleEnroll : handlePurchase}
                  loading={enrolling}
                  size="large"
                  style={{ borderRadius: 16, flex: hasFreePreview ? 1.5 : undefined }}
                  fullWidth={!hasFreePreview}
                />
              )}
            </View>
          </>
        )}
      </View>
      )}

      <PartPurchaseSheet
        purchase={purchase}
        currencyCode={course.currencyCode}
        onClose={() => setPurchase(null)}
        onPaid={onPartPaid}
        onError={(message) => Alert.alert(t('common.error'), message)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  availabilityBadge: { marginTop: 8 },
  requestNotice: {
    fontSize: fontSize.xs,
    fontFamily: 'Cairo_600SemiBold',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  lockedNotice: { marginHorizontal: spacing.lg, marginBottom: spacing.lg },
  manageCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.xs,
  },
  manageHeading: {
    fontSize: fontSize.xs,
    fontFamily: 'Cairo_600SemiBold',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    textAlign: 'left',
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  manageIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  manageTitle: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', textAlign: 'left' },
  manageSub: { fontSize: fontSize.sm, fontFamily: 'Cairo_400Regular', textAlign: 'left' },

  backBtnFloat: {
    position: 'absolute',
    start: spacing.xl,
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
    start: 0,
    end: 0,
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
    ...StyleSheet.absoluteFill,
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
    start: spacing.xl,
    end: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceRow: {
    marginBottom: spacing.lg,
  },

  // Info card
  // Card and background are both pure white in the light theme, so the cards on
  // this screen need a hairline border to read as cards at all.
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
    textAlign: 'left',
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
    textAlign: 'left',
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
    textAlign: 'left',
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Cairo_500Medium',
    textAlign: 'left',
  },
  description: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_400Regular',
    lineHeight: 22,
    textAlign: 'left',
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
    fontSize: 14,
    fontFamily: 'Cairo_500Medium',
    textAlign: 'left',
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
    textAlign: 'left',
  },
  certSub: {
    fontSize: 14,
    fontFamily: 'Cairo_500Medium',
    marginTop: 2,
    textAlign: 'left',
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
    ...typography.sectionTitle,
  },
  sectionsCount: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_500Medium',
    textAlign: 'left',
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
    textAlign: 'left',
  },
  sectionMeta: { flex: 1 },
  sectionTitle: {
    fontSize: fontSize.base,
    fontFamily: 'Cairo_600SemiBold',
    textAlign: 'left',
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    marginTop: 1,
    textAlign: 'left',
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
    fontSize: 14,
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
    textAlign: 'left',
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
    gap: 3,
  },
  lessonMetaText: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    textAlign: 'left',
  },
  lessonTypePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lessonTypePillText: {
    fontSize: 14,
    fontFamily: 'Cairo_600SemiBold',
    textAlign: 'left',
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
    start: 0,
    end: 0,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    borderTopWidth: 1,
    
  },
  stickyActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  upgradeNote: {
    fontSize: fontSize.xs,
    fontFamily: 'Cairo_500Medium',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerTitle: {
    fontSize: fontSize.xs,
    fontFamily: 'Cairo_600SemiBold',
    flexShrink: 1,
    textAlign: 'center',
  },
  partChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  partChipText: {
    fontSize: fontSize.xs,
    fontFamily: 'Cairo_600SemiBold',
    textAlign: 'left',
  },
  lessonPartChip: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  partialPill: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
});

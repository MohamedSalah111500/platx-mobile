import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { useRTL } from '../../i18n/RTLProvider';
import { useDisplayFormat } from '../../hooks/useDisplayFormat';
import { spacing } from '../../theme/spacing';
import { typography, fontFamily, fontSize } from '../../theme/typography';
import { newsApi } from '../../services/api/news.api';
import { eventsApi, CALENDAR_VIEW_TYPE } from '../../services/api/events.api';
import { coursesApi } from '../../services/api/courses.api';
import { dashboardApi, type DashboardStats } from '../../services/api/dashboard.api';
import { honorBoardApi, type HonorBoardEntry } from '../../services/api/honor-board.api';
import { reportsApi } from '../../services/api/reports.api';
import type { HomeStackParamList } from '../../types/navigation.types';
import type { NewsItem } from '../../types/news.types';
import type { EventItem } from '../../types/event.types';
import type { Course, Enrollment } from '../../types/course.types';
import { getFullImageUrl } from '../../utils/imageUrl';
import { toLocalDateString } from '../../utils/date';
import { effectivePrice, formatPrice } from '../../utils/price';
import { Avatar } from '../../components/ui/Avatar';
import SectionHeader from '../../components/ui/SectionHeader';
import { SearchBar } from '../../components/ui/SearchBar';
import { Spinner } from '../../components/ui/Spinner';
import { Chip } from '../../components/ui/Chip';
import { MediaCard } from '../../components/ui/MediaCard';
import { RowCard } from '../../components/ui/RowCard';
import { PlayCircle } from '../../components/ui/PlayCircle';
import { useNotificationsStore } from '../../store/notifications.store';
import { useTabBarSpace } from '../../navigation/tabBar';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

type EnrolledCourse = Course & { progressPct: number };

type QuickAction = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

type ReportsSummary = { avgAttendance: number; avgExamScore: number };

const average = (values: number[]) =>
  values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : 0;

export default function HomeScreen({ navigation }: Props) {
  const { theme, isDark } = useTheme();
  const { user, domain, isStudent, isStaff, isAdmin, can } = useAuth();
  const { t, locale } = useRTL();
  const format = useDisplayFormat();
  const insets = useSafeAreaInsets();
  const tabBarSpace = useTabBarSpace();
  const { width: windowWidth } = useWindowDimensions();

  const [news, setNews] = useState<NewsItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [honorTop3, setHonorTop3] = useState<HonorBoardEntry[]>([]);
  const [reportsSummary, setReportsSummary] = useState<ReportsSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  const isTeacherOrAdmin = isStaff || isAdmin;
  const canReports = can('REPORTS');
  const canManageNews = can('MANAGE_NEWS');
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const fetchUnreadCount = useNotificationsStore((s) => s.fetchUnreadCount);
  const isWide = windowWidth >= 600;

  useEffect(() => {
    if (isStudent) fetchUnreadCount();
  }, [isStudent, fetchUnreadCount]);

  const loadStats = async () => {
    if (!isTeacherOrAdmin) return;
    try {
      setStats(await dashboardApi.getStats());
    } catch {
      setStats(null);
    }
  };

  const loadReports = async () => {
    if (!canReports) return;
    try {
      const [attendance, exams] = await Promise.all([
        reportsApi.getAttendanceReports(),
        reportsApi.getExamReports(),
      ]);
      setReportsSummary({
        avgAttendance: average(attendance.map((r) => r.attendancePercentage)),
        avgExamScore: average(exams.map((r) => r.successRate)),
      });
    } catch {
      setReportsSummary(null);
    }
  };

  const loadNews = async () => {
    try {
      const res = await newsApi.getAll(1, 3, undefined, domain ?? undefined);
      setNews(res.items || []);
      setNewsError(null);
    } catch (err: any) {
      setNewsError(err?.userMessage || t('errors.failedToLoad'));
      setNews([]);
    }
  };

  const loadCourses = async () => {
    try {
      const res = isTeacherOrAdmin || !domain
        ? await coursesApi.getAll(1, 6)
        : await coursesApi.getPublic(domain, 1, 6);
      setCourses(res.items || []);
      setCoursesError(null);
    } catch (err: any) {
      setCoursesError(err?.userMessage || t('courses.failedToLoadCoursesList'));
      setCourses([]);
    }
  };

  const loadEvents = async () => {
    try {
      const today = toLocalDateString(new Date());
      const res = isTeacherOrAdmin
        ? await eventsApi.getAll(today, CALENDAR_VIEW_TYPE.Month)
        : await eventsApi.getAllForStudent(today, CALENDAR_VIEW_TYPE.Month);
      setEvents(Array.isArray(res) ? res.slice(0, 3) : []);
    } catch {
      setEvents([]);
    }
  };

  const loadHonorBoard = async () => {
    try {
      const now = new Date();
      const entries = await honorBoardApi.getRankings(now.getMonth() + 1, now.getFullYear());
      setHonorTop3([...entries].sort((a, b) => a.rank - b.rank).slice(0, 3));
    } catch {
      setHonorTop3([]);
    }
  };

  const loadEnrollments = async () => {
    if (!isStudent || !user?.studentId) {
      setEnrollments([]);
      return;
    }
    try {
      setEnrollments(await coursesApi.getStudentEnrollments(user.studentId));
    } catch {
      setEnrollments([]);
    }
  };

  const loadAll = () =>
    Promise.all([loadStats(), loadReports(), loadNews(), loadCourses(), loadEvents(), loadHonorBoard()]);

  useEffect(() => {
    loadAll().finally(() => setInitialLoading(false));
  }, []);

  useEffect(() => {
    loadEnrollments();
  }, [isStudent, user?.studentId]);

  const skipFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (skipFirstFocus.current) {
        skipFirstFocus.current = false;
        return;
      }
      loadNews();
    }, [domain]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadAll(), loadEnrollments()]);
    setRefreshing(false);
  };

  const enrolledCourses = useMemo<EnrolledCourse[]>(
    () =>
      enrollments
        .filter((e) => e.course)
        .map((e) => ({
          ...(e.course as Course),
          id: e.courseId,
          totalLessons: e.course?.totalLessons ?? e.totalLessons,
          progressPct: Math.max(0, Math.min(100, Math.round(e.progressPercentage ?? e.progress ?? 0))),
        })),
    [enrollments],
  );

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.goodMorning');
    if (hour < 18) return t('home.goodAfternoon');
    return t('home.goodEvening');
  })();

  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const goProfile = () => navigation.getParent()?.navigate('ProfileTab');
  const openCourse = (courseId: number) => navigation.navigate('CourseDetail', { courseId });

  const coursePrice = (course: Course) => {
    if (course.isFree || course.price === 0) return t('courses.free');
    if (course.price == null) return null;
    return formatPrice(effectivePrice(course.price, course.discountPrice), course.currencyCode, locale);
  };

  const quickActions: QuickAction[] = [
    { key: 'courses', icon: 'book-outline', label: t('courses.title'), onPress: () => navigation.navigate('CoursesList') },
    { key: 'homework', icon: 'document-text-outline', label: t('homework.title'), onPress: () => navigation.navigate('Homework') },
    ...(isStudent
      ? [{ key: 'exams', icon: 'ribbon-outline' as const, label: t('myExams.title'), onPress: () => navigation.navigate('MyExams') }]
      : []),
    { key: 'live', icon: 'videocam-outline', label: t('home.live'), onPress: () => navigation.navigate('LiveSessions') },
    { key: 'groups', icon: 'people-outline', label: t('groups.title'), onPress: () => navigation.navigate('Groups') },
    { key: 'chat', icon: 'chatbubbles-outline', label: t('chat.title'), onPress: () => navigation.getParent()?.navigate('ChatTab') },
    ...(isTeacherOrAdmin
      ? [
          { key: 'requests', icon: 'mail-unread-outline' as const, label: t('enrollmentRequests.title'), onPress: () => navigation.navigate('EnrollmentRequests') },
          ...(canManageNews
            ? [{ key: 'news', icon: 'newspaper-outline' as const, label: t('createNews.new'), onPress: () => navigation.navigate('CreateNews') }]
            : []),
          { key: 'notify', icon: 'megaphone-outline' as const, label: t('sendNotification.title'), onPress: () => navigation.navigate('SendNotification') },
        ]
      : []),
  ];

  const styles = useMemo(() => {
    const ink = theme.colors.text;
    return StyleSheet.create({
      page: { flex: 1, backgroundColor: theme.colors.background },
      statusMask: { position: 'absolute', top: 0, start: 0, end: 0, height: insets.top, backgroundColor: theme.colors.background },
      scrollContent: { paddingTop: insets.top + spacing.lg, paddingBottom: tabBarSpace },
      gutter: { paddingHorizontal: spacing.xl },

      header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, gap: spacing.md },
      headerText: { flex: 1, alignItems: 'flex-start' },
      headerName: { fontFamily: fontFamily.bold, fontSize: fontSize.lg, lineHeight: 28, color: ink, textAlign: 'left' },
      greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
      greeting: { ...typography.bodySmall, color: theme.colors.textSecondary },
      iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.card,
        justifyContent: 'center',
        alignItems: 'center',
      },
      bellDot: {
        position: 'absolute',
        top: 11,
        end: 12,
        width: 9,
        height: 9,
        borderRadius: 5,
        backgroundColor: theme.colors.danger,
        borderWidth: 2,
        borderColor: theme.colors.card,
      },

      headline: {
        fontFamily: fontFamily.bold,
        fontSize: fontSize['2xl'],
        lineHeight: 36,
        color: ink,
        textAlign: 'left',
        paddingHorizontal: spacing.xl,
        marginTop: spacing.lg,
      },
      search: { marginHorizontal: spacing.xl, marginTop: spacing.md },
      chips: { paddingHorizontal: spacing.xl, gap: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.lg },

      tintCard: {
        marginHorizontal: spacing.xl,
        borderRadius: 28,
        backgroundColor: theme.colors.primaryLight,
        padding: spacing.lg,
        overflow: 'hidden',
      },
      hero: { padding: spacing.md },
      heroStats: { flexDirection: 'row', alignItems: 'center' },
      heroStat: { flex: 1, alignItems: 'center' },
      heroDivider: { width: 1, height: 32, backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' },
      heroValue: { fontFamily: fontFamily.bold, fontSize: fontSize['2xl'], lineHeight: 32, color: ink, textAlign: 'center' },
      heroLabel: { ...typography.bodySmall, lineHeight: 20, color: theme.colors.textSecondary, textAlign: 'center' },

      featuredBody: { flexDirection: 'row', gap: spacing.lg },
      featuredText: { flex: 1, alignItems: 'flex-start' },
      eyebrow: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, color: theme.colors.primaryDark, textAlign: 'left' },
      featuredTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.lg, lineHeight: 28, color: ink, textAlign: 'left', marginTop: spacing.xs },
      featuredSub: { ...typography.bodySmall, color: theme.colors.textSecondary, marginTop: spacing.xs },
      featuredImage: { width: 112, height: 84, borderRadius: 18, backgroundColor: theme.colors.card },
      progressTrack: {
        height: 8,
        borderRadius: 4,
        backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)',
        marginTop: spacing.md,
        overflow: 'hidden',
      },
      progressFill: { height: '100%', borderRadius: 4, backgroundColor: theme.colors.primary },
      progressLabel: { ...typography.bodySmall, color: theme.colors.textSecondary, marginTop: spacing.xs },

      cta: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 52,
        borderRadius: 999,
        backgroundColor: isDark ? theme.colors.background : theme.colors.card,
        paddingStart: spacing.lg,
        paddingEnd: 6,
        paddingVertical: 6,
        gap: spacing.md,
        marginTop: spacing.md,
      },
      ctaText: { flex: 1, justifyContent: 'center', alignItems: 'flex-start' },
      ctaLabel: { fontFamily: fontFamily.semibold, fontSize: fontSize.base, lineHeight: 22, color: ink, textAlign: 'left' },
      ctaSub: { ...typography.bodySmall, lineHeight: 20, color: theme.colors.textSecondary },

      section: { marginTop: spacing['2xl'] },
      list: { paddingHorizontal: spacing.xl, gap: spacing.sm },
      courseRow: { paddingHorizontal: spacing.xl, gap: spacing.sm, flexDirection: isWide ? 'row' : 'column' },
      courseCell: isWide ? { flex: 1 } : { width: '100%' },

      honorAvatars: { flexDirection: 'row', paddingStart: 10 },
      honorAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: theme.colors.card,
        backgroundColor: theme.colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        marginStart: -10,
      },
      honorInitial: { fontFamily: fontFamily.bold, fontSize: fontSize.sm, color: theme.colors.primaryDark, textAlign: 'left' },
      fill: { width: '100%', height: '100%' },
      tile: {
        width: 60,
        height: 60,
        borderRadius: 16,
        backgroundColor: theme.colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
      },
      dateDay: { fontFamily: fontFamily.bold, fontSize: fontSize.lg, lineHeight: 24, color: theme.colors.primaryDark, textAlign: 'left' },
      dateMonth: { fontFamily: fontFamily.semibold, fontSize: fontSize.sm, lineHeight: 20, color: theme.colors.primaryDark, textAlign: 'left' },

      message: { ...typography.bodySmall, textAlign: 'center', marginHorizontal: spacing.xl, paddingVertical: spacing.lg },
    });
  }, [theme, isDark, insets.top, tabBarSpace, isWide]);

  const featured = enrolledCourses[0];
  const otherEnrolled = enrolledCourses.slice(1, 3);
  const featuredImage = featured ? getFullImageUrl(featured.previewImageUrl) : null;

  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerText} activeOpacity={0.7} onPress={goProfile}>
            <Text style={styles.headerName} numberOfLines={1}>{fullName}</Text>
            <View style={styles.greetingRow}>
              <Ionicons name="sunny-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.greeting}>{greeting}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('NotificationsList')}
            accessibilityRole="button"
            accessibilityLabel={t('home.alerts')}
          >
            <Ionicons name="notifications-outline" size={22} color={theme.colors.text} />
            {unreadCount > 0 && <View style={styles.bellDot} />}
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} onPress={goProfile} accessibilityRole="button" accessibilityLabel={fullName}>
            <Avatar self dimension={52} name={fullName} />
          </TouchableOpacity>
        </View>

        <Text style={styles.headline}>{t('home.headline')}</Text>

        <SearchBar
          style={styles.search}
          value={searchText}
          onChangeText={setSearchText}
          placeholder={t('courses.searchCourses')}
          onSubmit={() => {
            const q = searchText.trim();
            navigation.navigate('CoursesList', q ? { search: q } : undefined);
          }}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {quickActions.map((action) => (
            <Chip key={action.key} icon={action.icon} label={action.label} onPress={action.onPress} />
          ))}
        </ScrollView>

        {initialLoading && <Spinner />}

        {isTeacherOrAdmin && (
          <View style={[styles.tintCard, styles.hero]}>
            <View style={styles.heroStats}>
              {[
                { key: 'students', value: stats?.totalStudents, label: t('home.students') },
                { key: 'lecturers', value: stats?.totalLecturers, label: t('home.lecturers') },
                { key: 'courses', value: stats?.totalOnlineCourses, label: t('courses.title') },
              ].map((s, i) => (
                <React.Fragment key={s.key}>
                  {i > 0 && <View style={styles.heroDivider} />}
                  <View style={styles.heroStat}>
                    <Text style={styles.heroValue}>{s.value ?? '–'}</Text>
                    <Text style={styles.heroLabel} numberOfLines={1}>{s.label}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
            {canReports && (
              <TouchableOpacity
                style={styles.cta}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Reports')}
                accessibilityRole="button"
                accessibilityLabel={t('reports.title')}
              >
                <View style={styles.ctaText}>
                  <Text style={styles.ctaLabel}>{t('reports.title')}</Text>
                  {reportsSummary ? (
                    <Text style={styles.ctaSub} numberOfLines={2}>
                      {t('reports.attendanceTab')} {format.percent(reportsSummary.avgAttendance)}  ·  {t('reports.examsTab')} {format.percent(reportsSummary.avgExamScore)}
                    </Text>
                  ) : null}
                </View>
                <PlayCircle icon="forward" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {isStudent && featured && (
          <TouchableOpacity
            style={styles.tintCard}
            activeOpacity={0.9}
            onPress={() => openCourse(featured.id)}
            accessibilityRole="button"
            accessibilityLabel={featured.title || featured.name}
          >
            <View style={styles.featuredBody}>
              <View style={styles.featuredText}>
                <Text style={styles.eyebrow}>{t('home.continueLearning')}</Text>
                <Text style={styles.featuredTitle} numberOfLines={3}>{featured.title || featured.name}</Text>
                {featured.instructorName ? (
                  <Text style={styles.featuredSub} numberOfLines={1}>{t('common.by')} {featured.instructorName}</Text>
                ) : null}
                {format.courseMeta(featured) ? <Text style={styles.featuredSub}>{format.courseMeta(featured)}</Text> : null}
              </View>
              {featuredImage ? <Image source={{ uri: featuredImage }} style={styles.featuredImage} resizeMode="cover" /> : null}
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${featured.progressPct}%` }]} />
            </View>
            <Text style={styles.progressLabel}>{t('home.progressDone', { pct: featured.progressPct })}</Text>
            <View style={styles.cta}>
              <View style={styles.ctaText}>
                <Text style={styles.ctaLabel}>
                  {featured.progressPct > 0 ? t('home.continueLearning') : t('home.startLearning')}
                </Text>
              </View>
              <PlayCircle />
            </View>
          </TouchableOpacity>
        )}

        {isStudent && otherEnrolled.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title={t('home.enrolledCourses')} onSeeAll={() => navigation.navigate('CoursesList')} />
            <View style={styles.list}>
              {otherEnrolled.map((course) => (
                <RowCard
                  key={course.id}
                  title={course.title || course.name || ""}
                  subtitle={t('home.progressDone', { pct: course.progressPct })}
                  imageUrl={getFullImageUrl(course.previewImageUrl)}
                  icon="book-outline"
                  trailing={<PlayCircle size={36} />}
                  onPress={() => openCourse(course.id)}
                />
              ))}
            </View>
          </View>
        )}

        {isStudent && honorTop3.length > 0 && (
          <View style={[styles.list, styles.section]}>
            <RowCard
              title={t('honorBoard.title')}
              subtitle={honorTop3[0].studentName}
              icon="trophy-outline"
              onPress={() => navigation.navigate('HonorBoard')}
              trailing={
                <View style={styles.honorAvatars}>
                  {honorTop3.map((s) => {
                    const image = getFullImageUrl(s.studentProfileImage);
                    return (
                      <View key={s.id} style={styles.honorAvatar}>
                        {image ? (
                          <Image source={{ uri: image }} style={styles.fill} />
                        ) : (
                          <Text style={styles.honorInitial}>{(s.studentName || '').trim().charAt(0).toUpperCase()}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              }
            />
          </View>
        )}

        {coursesError ? (
          <Text style={[styles.message, { color: theme.colors.danger }]}>{coursesError}</Text>
        ) : courses.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader
              title={isTeacherOrAdmin ? t('home.recentCourses') : t('home.popularCourses')}
              onSeeAll={() => navigation.navigate('CoursesList')}
            />
            <View style={styles.courseRow}>
              {courses.slice(0, 2).map((course) => (
                <MediaCard
                  key={course.id}
                  style={styles.courseCell}
                  title={course.title || course.name || ""}
                  meta={format.courseMeta(course)}
                  badge={coursePrice(course)}
                  imageUrl={getFullImageUrl(course.previewImageUrl)}
                  onPress={() => openCourse(course.id)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {events.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title={t('home.upcomingEvents')} />
            <View style={styles.list}>
              {events.map((event) => (
                <RowCard
                  key={event.id}
                  title={event.title}
                  titleLines={1}
                  subtitle={format.time(event.startDate)}
                  onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                  leading={
                    <View style={styles.tile}>
                      <Text style={styles.dateDay}>{new Date(event.startDate).getDate()}</Text>
                      <Text style={styles.dateMonth}>{format.month(event.startDate)}</Text>
                    </View>
                  }
                />
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <SectionHeader title={t('home.latestNews')} />
          {newsError ? (
            <Text style={[styles.message, { color: theme.colors.danger }]}>{newsError}</Text>
          ) : news.length > 0 ? (
            <View style={styles.list}>
              {news.map((item) => (
                <RowCard
                  key={item.id}
                  title={item.title}
                  subtitle={item.subTitle}
                  meta={item.createdAt ? format.date(item.createdAt) : null}
                  imageUrl={getFullImageUrl(item.imageUrl || item.imageURl)}
                  icon="newspaper-outline"
                  onPress={() => navigation.navigate('NewsDetail', { newsId: item.id, newsItem: item })}
                />
              ))}
            </View>
          ) : (
            <Text style={[styles.message, { color: theme.colors.textMuted }]}>{t('home.noNewsAvailable')}</Text>
          )}
        </View>
      </ScrollView>
      <View style={styles.statusMask} />
    </View>
  );
}

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Share,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { SearchBar } from '../../components/ui/SearchBar';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { coursesApi } from '../../services/api/courses.api';
import type { CoursesStackParamList } from '../../types/navigation.types';
import { ACCESS_SCOPE, type Course, type Enrollment } from '../../types/course.types';
import { resolveCourseAvailability } from '../../utils/courseAvailability';
import { CourseAvailabilityBadge } from '../../components/course/CourseAvailabilityBadge';
import { getFullImageUrl } from '../../utils/imageUrl';
import { formatPrice } from '../../utils/price';
import { useDisplayFormat } from '../../hooks/useDisplayFormat';
import { MediaCard } from '../../components/ui/MediaCard';
import { RowCard } from '../../components/ui/RowCard';
import { Chip } from '../../components/ui/Chip';
import { PlayCircle } from '../../components/ui/PlayCircle';
import { ProgressBar } from '../../components/ui/ProgressBar';

// A single character is too short to search; treat it as "no filter" so the
// rendered list, the debounced search and loadMore always use the same query.
function effectiveQuery(q: string): string {
  const s = q.trim();
  return s.length === 1 ? '' : s;
}
import { useRTL } from '../../i18n/RTLProvider';

type Props = NativeStackScreenProps<CoursesStackParamList, 'CoursesList'>;

export default function CoursesListScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { user, domain, isStudent } = useAuth();
  const { t, isRTL, locale } = useRTL();

  const insets = useSafeAreaInsets();
  const format = useDisplayFormat();
  const { width: windowWidth } = useWindowDimensions();
  // A search handed over from Home must land on the tab that actually searches,
  // otherwise the query is silently dropped on the enrolled tab.
  const openedWithSearch = !!route.params?.search;
  const initialTab: 'browse' | 'enrolled' =
    !openedWithSearch && isStudent && user?.studentId ? 'enrolled' : 'browse';
  const [activeTab, setActiveTab] = useState<'browse' | 'enrolled'>(initialTab);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState(route.params?.search || '');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadEnrolledCourses = async () => {
    if (!user?.studentId) {
      // Without a student id the request can't be made — surface it instead of
      // leaving the list on an endless spinner.
      setEnrollments([]);
      setError(t('courses.missingStudentId'));
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setError(null);
      const data = await coursesApi.getStudentEnrollments(user.studentId);
      setEnrollments(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const msg = err?.userMessage || t('courses.failedToLoadEnrolled');
      setError(msg);
      setEnrollments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadCourses = async (pageNum = 1, search?: string) => {
    try {
      setError(null);
      const res: any = domain
        ? await coursesApi.getPublic(domain, pageNum, 10, search)
        : await coursesApi.getAll(pageNum, 10, search);
      const items: Course[] = Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res)
          ? res
          : [];
      if (pageNum === 1) {
        setCourses(items);
      } else {
        setCourses((prev) => [...prev, ...items]);
      }
      setPage(pageNum);
      const totalCount = res?.totalCount;
      if (totalCount != null && totalCount > 0) {
        const loaded = pageNum === 1 ? items.length : courses.length + items.length;
        setHasMore(loaded < totalCount);
      } else {
        setHasMore(items.length >= 10);
      }
    } catch (err: any) {
      const msg = err?.userMessage || t('courses.failedToLoadCoursesList');
      setError(msg);
      setHasMore(false);
      if (pageNum === 1) setCourses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadData = () => {
    setLoading(true);
    if (activeTab === 'enrolled') {
      loadEnrolledCourses();
    } else {
      loadCourses(1, effectiveQuery(searchQuery));
    }
  };

  // Only the enrolled tab depends on the student id (fetched from /Students/me
  // after login), so resolving it must not reload the browse list.
  const tabStudentId = activeTab === 'enrolled' ? user?.studentId : null;
  useEffect(() => {
    loadData();
  }, [activeTab, tabStudentId]);

  // Students land on 'enrolled' once their id resolves, unless they already
  // picked a tab themselves.
  const userPickedTabRef = useRef(openedWithSearch);
  useEffect(() => {
    if (isStudent && user?.studentId && !userPickedTabRef.current) setActiveTab('enrolled');
  }, [isStudent, user?.studentId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (activeTab === 'enrolled') {
      loadEnrolledCourses();
    } else {
      loadCourses(1, effectiveQuery(searchQuery));
    }
  }, [searchQuery, activeTab]);

  const loadingMoreRef = useRef(false);
  const onLoadMore = useCallback(() => {
    if (activeTab === 'enrolled' || !hasMore || loading || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    loadCourses(page + 1, effectiveQuery(searchQuery)).finally(() => {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    });
  }, [activeTab, hasMore, loading, page, searchQuery]);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearch = useCallback((text: string) => {
    setSearchQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const term = effectiveQuery(text);
    searchTimer.current = setTimeout(() => {
      setLoading(true);
      loadCourses(1, term);
    }, 600);
  }, []);

  // Drop a pending debounced search when the tab changes or the screen unmounts,
  // so it can't overwrite the enrolled list or set state after unmount.
  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    },
    [activeTab]
  );

  const handleShare = async (course: Course) => {
    const title = course.title || course.name || '';
    const desc = course.description ? `\n${course.description.substring(0, 100)}...` : '';
    try {
      await Share.share({
        message: `${title}${desc}\n\n${domain ? `https://platx.net/${domain}/pages/online-courses/${course.id}/details` : `https://platx.net/pages/online-courses/${course.id}/details`}`,
        title,
      });
    } catch {}
  };

  const isWide = windowWidth >= 600;
  const columns = isWide && activeTab === 'browse' ? 2 : 1;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        header: { paddingHorizontal: spacing.xl, paddingTop: insets.top + spacing.md, paddingBottom: spacing.md, gap: spacing.md },
        titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
        backBtn: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: theme.colors.card,
          justifyContent: 'center',
          alignItems: 'center',
        },
        title: { ...typography.screenTitle, color: theme.colors.text, flex: 1 },
        tabRow: { flexDirection: 'row', gap: spacing.sm },
        listContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.xs, paddingBottom: spacing.xl, gap: spacing.sm },
        column: { gap: spacing.sm },
        cell: { flex: 1 / columns },
        iconBtn: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(255,255,255,0.95)',
          justifyContent: 'center',
          alignItems: 'center',
        },
        availability: { backgroundColor: 'rgba(255,255,255,0.95)' },
        footerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, alignSelf: 'stretch' },
        progressText: { ...typography.bodySmall, color: theme.colors.textMuted },
      }),
    [theme, insets.top, columns],
  );

  const coursePrice = (item: Course) => {
    if (item.isFree || item.price === 0) return t('courses.free');
    const hasDiscount = item.discountPrice != null && item.discountPrice < (item.price || 0);
    return formatPrice(hasDiscount ? item.discountPrice : item.price, item.currencyCode, locale);
  };

  const renderCourse = ({ item }: { item: Course }) => (
    <View style={styles.cell}>
      <MediaCard
        title={item.title || item.name || t('courses.untitled')}
        meta={format.courseMeta(item)}
        badge={coursePrice(item)}
        imageUrl={getFullImageUrl(item.previewImageUrl)}
        onPress={() => navigation.navigate('CourseDetail', { courseId: item.id })}
        topEnd={
          <>
            <CourseAvailabilityBadge availability={resolveCourseAvailability(item)} style={styles.availability} />
            <TouchableOpacity
              onPress={() => handleShare(item)}
              style={styles.iconBtn}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('common.share')}
            >
              <Ionicons name="share-social-outline" size={18} color="#18181B" />
            </TouchableOpacity>
          </>
        }
      />
    </View>
  );

  const renderEnrolled = ({ item }: { item: Enrollment }) => {
    const course = item.course;
    const progress = item.totalLessons > 0 ? Math.round((item.completedLessons / item.totalLessons) * 100) : 0;
    const partial = item.accessScope === ACCESS_SCOPE.Partial ? t('courses.parts.partial') : null;

    return (
      <RowCard
        title={course?.title || course?.name || t('courses.untitled')}
        subtitle={[course?.instructorName, partial].filter(Boolean).join('  ·  ') || null}
        imageUrl={course ? getFullImageUrl(course.previewImageUrl) : null}
        icon="book-outline"
        trailing={<PlayCircle size={36} />}
        onPress={() => navigation.navigate('CourseDetail', { courseId: item.courseId })}
        footer={
          <View style={styles.footerRow}>
            <ProgressBar value={progress} style={{ flex: 1 }} />
            <Text style={styles.progressText}>{format.percent(progress)}</Text>
          </View>
        }
      />
    );
  };

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={theme.colors.primary}
      colors={[theme.colors.primary]}
      progressBackgroundColor={theme.colors.card}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {navigation.canGoBack() && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
              hitSlop={8}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
            >
              <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color={theme.colors.text} />
            </TouchableOpacity>
          )}
          <Text style={styles.title}>{t('courses.title')}</Text>
        </View>

        {isStudent && (
          <View style={styles.tabRow}>
            <Chip
              label={t('courses.myCourses')}
              active={activeTab === 'enrolled'}
              onPress={() => { userPickedTabRef.current = true; setActiveTab('enrolled'); }}
            />
            <Chip
              label={t('courses.browseCourses')}
              active={activeTab === 'browse'}
              onPress={() => { userPickedTabRef.current = true; setActiveTab('browse'); }}
            />
          </View>
        )}

        {activeTab === 'browse' && (
          <SearchBar value={searchQuery} onChangeText={onSearch} placeholder={t('courses.searchCourses')} />
        )}
      </View>

      {activeTab === 'enrolled' ? (
        <FlatList
          data={enrollments}
          renderItem={renderEnrolled}
          keyExtractor={(item, idx) => (item?.id != null ? item.id.toString() : `enroll-${idx}`)}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={9}
          refreshControl={refreshControl}
          ListEmptyComponent={
            loading ? (
              <Spinner />
            ) : error ? (
              <ErrorRetry message={error} onRetry={loadData} />
            ) : (
              <EmptyState title={t('courses.noEnrolledCourses')} message={t('courses.enrollToStart')} />
            )
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          key={`browse-${columns}`}
          data={courses}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? styles.column : undefined}
          renderItem={renderCourse}
          keyExtractor={(item, idx) => (item?.id != null ? item.id.toString() : `course-${idx}`)}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={9}
          refreshControl={refreshControl}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            loading ? (
              <Spinner />
            ) : error ? (
              <ErrorRetry message={error} onRetry={() => { setLoading(true); loadCourses(1, effectiveQuery(searchQuery)); }} />
            ) : (
              <EmptyState title={t('courses.noCourses')} message={t('courses.noCoursesAvailable')} />
            )
          }
          ListFooterComponent={loadingMore ? <Spinner size="small" /> : null}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

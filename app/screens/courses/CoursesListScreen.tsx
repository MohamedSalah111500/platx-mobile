import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  TextInput,
  Share,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography, fontSize } from '../../theme/typography';
import { coursesApi } from '../../services/api/courses.api';
import type { CoursesStackParamList } from '../../types/navigation.types';
import type { Course, Enrollment } from '../../types/course.types';
import { getFullImageUrl } from '../../utils/imageUrl';
import { useRTL } from '../../i18n/RTLProvider';

const ACCENT = '#7c63fd';
const BG = '#FFFFFF';
const CARD_ACCENT = [ACCENT, '#F5A623', '#34C38F', '#F46A6A', '#9B59B6', '#1ABC9C'];

type Props = NativeStackScreenProps<CoursesStackParamList, 'CoursesList'>;

export default function CoursesListScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { user, domain, isStudent } = useAuth();
  const { t } = useRTL();

  // if the logged‑in account is a student but we don't have an ID, things
  // like enrollments/notifications will not work. log a warning and show an
  // inline message so developers can diagnose the server response.
  if (isStudent && !user?.studentId) {
    console.warn('[CoursesList] student user without studentId, API calls may fail');
  }
  const insets = useSafeAreaInsets();
  const initialTab: 'browse' | 'enrolled' =
    isStudent && user?.studentId ? 'enrolled' : 'browse';
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
    if (!user?.studentId) return;
    try {
      setError(null);
      const data = await coursesApi.getStudentEnrollments(user.studentId);
      setEnrollments(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const msg = err?.userMessage || err?.message || 'Failed to load enrolled courses.';
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
      const res: any = await coursesApi.getPublic(domain || '', pageNum, 10);
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
      const msg = err?.userMessage || err?.message || 'Failed to load courses.';
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
      loadCourses(1, searchQuery);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (activeTab === 'enrolled') {
      loadEnrolledCourses();
    } else {
      loadCourses(1, searchQuery);
    }
  }, [searchQuery, activeTab]);

  const loadingMoreRef = useRef(false);
  const onLoadMore = useCallback(() => {
    if (activeTab === 'enrolled' || !hasMore || loading || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    loadCourses(page + 1, searchQuery).finally(() => {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    });
  }, [activeTab, hasMore, loading, page, searchQuery]);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearch = useCallback((text: string) => {
    setSearchQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setLoading(true);
      loadCourses(1, text);
    }, 400);
  }, []);

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

  const bgColor = theme.dark ? theme.colors.background : BG;

  const renderCourse = ({ item, index }: { item: Course; index: number }) => {
    const accent = CARD_ACCENT[index % CARD_ACCENT.length];
    const imageUrl = getFullImageUrl(item.previewImageUrl);
    const isFree = item.isFree || item.price === 0;
    const hasDiscount = item.discountPrice != null && item.discountPrice < (item.price || 0);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.card }]}
        onPress={() => navigation.navigate('CourseDetail', { courseId: item.id })}
        activeOpacity={0.7}
      >
        {/* Image with accent overlay */}
        <View style={styles.cardImageWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.cardImage} />
          ) : (
            <View style={[styles.cardImage, styles.cardImagePlaceholder, { backgroundColor: accent + '15' }]}>
              <Ionicons name="book-outline" size={32} color={accent} />
            </View>
          )}
          {/* Price badge on image */}
          <View style={[styles.priceBadge, { backgroundColor: isFree ? '#34C38F' : ACCENT }]}>
            <Text style={styles.priceBadgeText}>
              {isFree ? t('courses.free') : `$${hasDiscount ? item.discountPrice : item.price || 0}`}
            </Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={2}>
            {item.title || item.name || t('courses.untitled')}
          </Text>

          {item.instructorName ? (
            <View style={styles.instructorRow}>
              <View style={[styles.instructorDot, { backgroundColor: accent }]} />
              <Text style={[styles.instructorText, { color: theme.colors.textMuted }]} numberOfLines={1}>
                {item.instructorName}
              </Text>
            </View>
          ) : null}

          <View style={styles.metaRow}>
            {item.totalLessons != null && (
              <View style={[styles.metaChip, { backgroundColor: theme.dark ? theme.colors.surface : '#F0EDFF' }]}>
                <Ionicons name="play-circle" size={12} color={ACCENT} />
                <Text style={[styles.metaChipText, { color: ACCENT }]}>{item.totalLessons} {t('courses.lessons')}</Text>
              </View>
            )}
            {item.totalHours != null && (
              <View style={[styles.metaChip, { backgroundColor: theme.dark ? theme.colors.surface : '#FFF4E5' }]}>
                <Ionicons name="time" size={12} color="#F5A623" />
                <Text style={[styles.metaChipText, { color: '#F5A623' }]}>{item.totalHours}h</Text>
              </View>
            )}
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              onPress={() => handleShare(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="share-social-outline" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEnrolled = ({ item, index }: { item: Enrollment; index: number }) => {
    const course = item.course;
    const accent = CARD_ACCENT[index % CARD_ACCENT.length];
    const imageUrl = course ? getFullImageUrl(course.previewImageUrl) : null;
    const progress = item.totalLessons > 0
      ? Math.round((item.completedLessons / item.totalLessons) * 100)
      : 0;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.card }]}
        onPress={() => navigation.navigate('CourseDetail', { courseId: item.courseId })}
        activeOpacity={0.7}
      >
        <View style={styles.enrolledRow}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.enrolledImage} />
          ) : (
            <View style={[styles.enrolledImage, styles.cardImagePlaceholder, { backgroundColor: accent + '15' }]}>
              <Ionicons name="book-outline" size={24} color={accent} />
            </View>
          )}
          <View style={styles.enrolledInfo}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={2}>
              {course?.title || course?.name || t('courses.untitled')}
            </Text>
            {course?.instructorName ? (
              <Text style={[styles.instructorText, { color: theme.colors.textMuted, marginTop: 2, marginBottom: 6 }]} numberOfLines={1}>
                {course.instructorName}
              </Text>
            ) : null}
            <View style={styles.progressWrap}>
              <View style={[styles.progressBar, { backgroundColor: theme.dark ? theme.colors.surface : '#E8E8E8' }]}>
                <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: accent }]} />
              </View>
              <Text style={[styles.progressText, { color: theme.colors.textMuted }]}>
                {item.completedLessons}/{item.totalLessons} ({progress}%)
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{t('courses.title')}</Text>

        {/* Tab toggle */}
        {isStudent && (
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'enrolled' && styles.tabActive]}
              onPress={() => setActiveTab('enrolled')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, { color: theme.colors.textSecondary }, activeTab === 'enrolled' && styles.tabTextActive]}>
                {t('courses.myCourses')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'browse' && styles.tabActive]}
              onPress={() => setActiveTab('browse')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, { color: theme.colors.textSecondary }, activeTab === 'browse' && styles.tabTextActive]}>
                {t('courses.browseCourses')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search */}
        {activeTab === 'browse' && (
          <View style={[styles.searchContainer, { backgroundColor: theme.colors.card, marginTop: spacing.md }]}>
            <Ionicons name="search" size={18} color={theme.colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              value={searchQuery}
              onChangeText={onSearch}
              placeholder={t('courses.searchCourses')}
              placeholderTextColor={theme.colors.textMuted}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => onSearch('')}>
                <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {activeTab === 'enrolled' ? (
        <FlatList
          data={enrollments}
          renderItem={renderEnrolled}
          keyExtractor={(item, idx) => item?.id != null ? item.id.toString() : `enroll-${idx}`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={<View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            loading ? (
              <Spinner />
            ) : error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={theme.colors.danger} />
                <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadData}>
                  <Text style={styles.retryText}>{t('common.retry')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <EmptyState title={t('courses.noEnrolledCourses')} message={t('courses.enrollToStart')} />
            )
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={courses}
          renderItem={renderCourse}
          keyExtractor={(item, idx) => item?.id != null ? item.id.toString() : `course-${idx}`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={<View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            loading ? (
              <Spinner />
            ) : error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={theme.colors.danger} />
                <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); loadCourses(1, searchQuery); }}>
                  <Text style={styles.retryText}>{t('common.retry')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <EmptyState title={t('courses.noCourses')} message={t('courses.noCoursesAvailable')} />
            )
          }
          ListFooterComponent={hasMore && courses.length > 0 ? <Spinner size="small" /> : null}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: fontSize.base,
    marginLeft: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 120,
  },
  card: {
    borderRadius: 18,
    marginBottom: spacing.md,
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
  cardImageWrap: {
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 160,
  },
  cardImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  priceBadgeText: {
    color: '#fff',
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  cardInfo: {
    padding: spacing.lg,
  },
  cardTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
    lineHeight: fontSize.base * 1.4,
    marginBottom: 4,
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  instructorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  instructorText: {
    fontSize: fontSize.xs,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['3xl'],
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: ACCENT,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 14,
  },
  retryText: { ...typography.button, color: '#fff' },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  // Enrolled card
  enrolledRow: {
    flexDirection: 'row',
  },
  enrolledImage: {
    width: 100,
    height: '100%',
    minHeight: 120,
  },
  enrolledInfo: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  progressWrap: {
    marginTop: spacing.xs,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    marginTop: 4,
  },
});

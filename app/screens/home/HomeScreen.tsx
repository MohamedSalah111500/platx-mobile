import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { useRTL } from '../../i18n/RTLProvider';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography, fontSize } from '../../theme/typography';
import { newsApi } from '../../services/api/news.api';
import { eventsApi } from '../../services/api/events.api';
import { coursesApi } from '../../services/api/courses.api';
import { dashboardApi, type DashboardStats } from '../../services/api/dashboard.api';
import type { HomeStackParamList } from '../../types/navigation.types';
import type { NewsItem } from '../../types/news.types';
import type { EventItem } from '../../types/event.types';
import type { Course } from '../../types/course.types';
import { getFullImageUrl } from '../../utils/imageUrl';
import { useSound } from '../../hooks/useSound';
import { studentsApi, type TopStudent } from '../../services/api/students.api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

// Accent palette for cards
const ACCENT_COLORS = [
  { bg: '#EDE8FF', accent: '#7c63fd' },
  { bg: '#FFF3E0', accent: '#F5A623' },
  { bg: '#E8F8F0', accent: '#34C38F' },
  { bg: '#FCE8EC', accent: '#F46A6A' },
];

export default function HomeScreen({ navigation }: Props) {
  const { theme, isDark } = useTheme();
  const { user, role, domain, isStudent, isStaff, isAdmin } = useAuth();
  const { t } = useRTL();
  const { play } = useSound();
  const insets = useSafeAreaInsets();

  const [news, setNews] = useState<NewsItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [topStudents, setTopStudents] = useState<TopStudent[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const isTeacherOrAdmin = isStaff || isAdmin;

  // ------------------------------------------------------------------ data
  const loadData = async () => {
    if (isTeacherOrAdmin) {
      try {
        const statsData = await dashboardApi.getStats();
        setStats(statsData);
      } catch {
        // stats may not be available
      }
    }
    try {
      const newsRes = await newsApi.getAll(1, 3, undefined, domain);
      setNews(newsRes.items || []);
      setNewsError(null);
    } catch (err: any) {
      console.error('[Home] news load failed', err);
      setNewsError(err?.userMessage || err?.message || 'Failed to load news');
      setNews([]);
    }
    try {
      const coursesRes = isTeacherOrAdmin
        ? await coursesApi.getAll(1, 6)
        : await coursesApi.getPublic(domain || '', 1, 6);
      setCourses(coursesRes.items || []);
      setCoursesError(null);
    } catch (err: any) {
      console.error('[Home] courses load failed', err);
      setCoursesError(err?.userMessage || err?.message || 'Failed to load courses');
      setCourses([]);
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      const eventsRes = isTeacherOrAdmin
        ? await eventsApi.getAll(today, 0)
        : await eventsApi.getAllForStudent(today, 0);
      setEvents(Array.isArray(eventsRes) ? eventsRes.slice(0, 3) : []);
    } catch {
      // events may not be available
    }
    try {
      const top = await studentsApi.getTopStudents();
      setTopStudents(top.slice(0, 5));
    } catch {
      // honor board may not be available
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ------------------------------------------------------------------ helpers
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.goodMorning');
    if (hour < 18) return t('home.goodAfternoon');
    return t('home.goodEvening');
  };

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
    : '?';

  const firstName = user?.firstName || '';

  // ------------------------------------------------------------------ palette
  const BG_COLOR = isDark ? theme.colors.background : '#FFFFFF';
  const CARD_BG = isDark ? theme.colors.card : '#FFFFFF';
  const SEARCH_BG = isDark ? theme.colors.surface : '#FFFFFF';
  const PRIMARY = theme.colors.primary;       // #7c63fd
  const DARK_CARD = isDark ? '#3D2196' : '#1B1464';
  const LIGHT_CARD = isDark ? theme.colors.surface : '#F0EDFF';

  const CARD_WIDTH = SCREEN_WIDTH * 0.55;

  // ------------------------------------------------------------------ styles
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: BG_COLOR,
    },
    scrollContent: {
      paddingBottom: insets.bottom + 100,
    },

    /* ── Header ───────────────────────────────────────────────── */
    header: {
      paddingTop: insets.top + spacing.lg,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.md,
      backgroundColor: BG_COLOR,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarCircle: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: PRIMARY,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      color: '#FFFFFF',
      fontSize: fontSize.lg,
      fontWeight: '700',
    },
    headerTextBlock: {
      flex: 1,
      marginLeft: spacing.md,
    },
    headerWelcome: {
      ...typography.caption,
      color: theme.colors.textSecondary,
      letterSpacing: 0.3,
    },
    headerName: {
      ...typography.h4,
      color: theme.colors.text,
      fontWeight: '700',
      marginTop: 1,
    },
    bellButton: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: CARD_BG,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bellDot: {
      position: 'absolute',
      top: 12,
      right: 13,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#F46A6A',
      borderWidth: 1.5,
      borderColor: CARD_BG,
    },

    /* ── Main Heading ─────────────────────────────────────────── */
    mainHeading: {
      fontSize: fontSize['2xl'],
      fontWeight: '800',
      color: theme.colors.text,
      lineHeight: 32,
      paddingHorizontal: spacing.xl,
      marginTop: spacing.lg,
      marginBottom: spacing.lg,
    },

    /* ── Search Bar ───────────────────────────────────────────── */
    searchBarContainer: {
      marginHorizontal: spacing.xl,
      marginBottom: spacing['2xl'],
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: SEARCH_BG,
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.lg,
      height: 50,
      borderWidth: 1,
      borderColor: isDark ? theme.colors.border : '#F0F0F0',
    },
    searchIcon: {
      marginRight: spacing.sm,
    },
    searchInput: {
      flex: 1,
      ...typography.bodySmall,
      color: theme.colors.text,
      paddingVertical: 0,
    },

    /* ── Stat Cards (2 horizontal) ────────────────────────────── */
    statCardsRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
      marginBottom: spacing['2xl'],
    },
    statCardDark: {
      flex: 1,
      backgroundColor: DARK_CARD,
      borderRadius: borderRadius['3xl'],
      padding: spacing.lg,
      minHeight: 130,
      justifyContent: 'space-between',
    },
    statCardLight: {
      flex: 1,
      backgroundColor: LIGHT_CARD,
      borderRadius: borderRadius['3xl'],
      padding: spacing.lg,
      minHeight: 130,
      justifyContent: 'space-between',
    },
    statIconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    statIconCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statValue: {
      fontSize: fontSize['2xl'],
      fontWeight: '800',
      marginTop: spacing.sm,
    },
    statLabel: {
      ...typography.caption,
      fontWeight: '500',
      marginTop: 2,
    },

    /* ── Teacher / Admin 3-column stats ───────────────────────── */
    adminStatsRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
      marginBottom: spacing['2xl'],
    },
    adminStatCard: {
      flex: 1,
      backgroundColor: CARD_BG,
      borderRadius: borderRadius['3xl'],
      padding: spacing.lg,
      alignItems: 'center',
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
    adminStatIconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    adminStatValue: {
      fontSize: fontSize.xl,
      fontWeight: '800',
      color: theme.colors.text,
    },
    adminStatLabel: {
      ...typography.caption,
      color: theme.colors.textSecondary,
      marginTop: 3,
      textAlign: 'center',
    },

    /* ── Quick Actions (pill grid) ────────────────────────────── */
    quickActionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: spacing.xl,
      gap: spacing.sm,
      marginBottom: spacing['2xl'],
    },
    quickActionPill: {
      width: '48%' as any,
      flexGrow: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: CARD_BG,
      borderRadius: borderRadius.full,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      gap: 6,
      borderWidth: 1,
      borderColor: isDark ? theme.colors.border : '#F0F0F0',
    },
    quickActionIconSmall: {
      width: 30,
      height: 30,
      borderRadius: 15,
      justifyContent: 'center',
      alignItems: 'center',
    },
    quickActionText: {
      ...typography.caption,
      fontWeight: '600',
      color: theme.colors.text,
    },

    /* ── Section Header ───────────────────────────────────────── */
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.md,
    },
    sectionTitle: {
      ...typography.h4,
      color: theme.colors.text,
      fontWeight: '700',
    },
    seeAllText: {
      ...typography.bodySmall,
      color: PRIMARY,
      fontWeight: '600',
    },

    /* ── Horizontal Course Cards ──────────────────────────────── */
    courseScrollContent: {
      paddingLeft: spacing.xl,
      paddingRight: spacing.md,
    },
    courseCard: {
      width: CARD_WIDTH,
      backgroundColor: CARD_BG,
      borderRadius: borderRadius['3xl'],
      marginRight: spacing.md,
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
    courseImageWrapper: {
      height: 120,
      backgroundColor: ACCENT_COLORS[0].bg,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    courseImage: {
      width: '100%',
      height: '100%',
    },
    courseImageOverlay: {
      position: 'absolute',
      bottom: spacing.sm,
      right: spacing.sm,
    },
    courseBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: borderRadius.full,
      backgroundColor: 'rgba(255,255,255,0.9)',
    },
    courseBadgeText: {
      ...typography.caption,
      fontWeight: '700',
      color: '#1B1464',
    },
    courseInfo: {
      padding: spacing.md,
    },
    courseTitle: {
      ...typography.bodySmall,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: spacing.xs,
    },
    courseInstructor: {
      ...typography.caption,
      color: theme.colors.textSecondary,
      marginBottom: spacing.sm,
    },
    courseMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    courseMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    courseMetaText: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },

    /* ── News Cards ───────────────────────────────────────────── */
    newsCard: {
      flexDirection: 'row',
      backgroundColor: CARD_BG,
      borderRadius: borderRadius['3xl'],
      overflow: 'hidden',
      marginHorizontal: spacing.xl,
      marginBottom: spacing.md,
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
    newsImageContainer: {
      width: 100,
      height: 100,
    },
    newsImage: {
      width: '100%',
      height: '100%',
    },
    newsImagePlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: ACCENT_COLORS[0].bg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    newsContent: {
      flex: 1,
      padding: spacing.md,
      justifyContent: 'center',
    },
    newsTitle: {
      ...typography.bodySmall,
      fontWeight: '600',
      color: theme.colors.text,
    },
    newsSubtitle: {
      ...typography.caption,
      color: theme.colors.textSecondary,
      marginTop: 3,
    },
    newsDate: {
      ...typography.caption,
      color: theme.colors.textMuted,
      marginTop: spacing.xs,
    },

    /* ── Event Cards ──────────────────────────────────────────── */
    eventCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: CARD_BG,
      borderRadius: borderRadius['3xl'],
      padding: spacing.md,
      marginHorizontal: spacing.xl,
      marginBottom: spacing.sm,
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
    eventDateBox: {
      width: 54,
      height: 54,
      borderRadius: borderRadius.xl,
      backgroundColor: ACCENT_COLORS[0].bg,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    eventDay: {
      fontSize: fontSize.lg,
      fontWeight: '800',
      color: PRIMARY,
    },
    eventMonth: {
      ...typography.caption,
      color: PRIMARY,
      fontWeight: '600',
    },
    eventInfo: {
      flex: 1,
    },
    eventTitle: {
      ...typography.bodySmall,
      color: theme.colors.text,
      fontWeight: '600',
    },
    eventTime: {
      ...typography.caption,
      color: theme.colors.textMuted,
      marginTop: 2,
    },

    /* ── Empty state ──────────────────────────────────────────── */
    emptyText: {
      ...typography.bodySmall,
      color: theme.colors.textMuted,
      textAlign: 'center',
      paddingVertical: spacing['2xl'],
    },
    errorText: {
      ...typography.body,
      textAlign: 'center',
      marginHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
    },

    /* ── Section spacing ──────────────────────────────────────── */
    sectionSpacing: {
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },

    /* ── Honor Board ───────────────────────────────────────────── */
    honorCard: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginHorizontal: spacing.xl,
      marginBottom: spacing.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: 16,
      gap: spacing.sm,
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
    honorRank: {
      width: 28,
      height: 28,
      borderRadius: 9,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    honorRankText: {
      fontSize: 13,
      fontWeight: '800' as const,
    },
    honorAvatar: {
      width: 36,
      height: 36,
      borderRadius: 12,
      overflow: 'hidden' as const,
    },
    honorAvatarImg: {
      width: '100%' as any,
      height: '100%' as any,
    },
    honorAvatarFallback: {
      width: '100%' as any,
      height: '100%' as any,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    honorInitial: {
      fontSize: 15,
      fontWeight: '700' as const,
    },
    honorName: {
      flex: 1,
      fontSize: fontSize.sm,
      fontWeight: '600' as const,
    },
    honorScore: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    honorScoreText: {
      fontSize: 11,
      fontWeight: '700' as const,
      color: '#F5A623',
    },
  });

  // ------------------------------------------------------------------ RENDER
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
      >
        {/* ────────────── HEADER ────────────── */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.headerTextBlock}>
              <Text style={styles.headerWelcome}>{getGreeting()}</Text>
              <Text style={styles.headerName} numberOfLines={1}>
                {firstName} {user?.lastName || ''}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.bellButton}
              activeOpacity={0.7}
              onPress={() => navigation.getParent()?.navigate('NotificationsTab')}
            >
              <Ionicons
                name="notifications-outline"
                size={22}
                color={theme.colors.text}
              />
              <View style={styles.bellDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ────────────── MAIN HEADING ────────────── */}
        <Text style={styles.mainHeading}>
          {t('home.startLearning')}
        </Text>

        {/* ────────────── SEARCH BAR ────────────── */}
        <TouchableOpacity
          style={styles.searchBarContainer}
          activeOpacity={0.8}
          onPress={() => navigation.getParent()?.navigate('CoursesTab')}
        >
          <View style={styles.searchBar}>
            <Ionicons
              name="search"
              size={20}
              color={theme.colors.textMuted}
              style={styles.searchIcon}
            />
            <Text style={[styles.searchInput, { color: theme.colors.inputPlaceholder }]}>
              {t('courses.title')}...
            </Text>
            <Ionicons name="options-outline" size={20} color={theme.colors.textMuted} />
          </View>
        </TouchableOpacity>

        {/* ────────────── STAT CARDS ────────────── */}
        {isTeacherOrAdmin ? (
          /* Teacher / Admin: 3-column stats */
          <View style={styles.adminStatsRow}>
            <View style={styles.adminStatCard}>
              <View style={[styles.adminStatIconCircle, { backgroundColor: ACCENT_COLORS[0].bg }]}>
                <Ionicons name="people" size={22} color={ACCENT_COLORS[0].accent} />
              </View>
              <Text style={styles.adminStatValue}>{stats?.totalStudents ?? '-'}</Text>
              <Text style={styles.adminStatLabel}>{t('home.students')}</Text>
            </View>
            <View style={styles.adminStatCard}>
              <View style={[styles.adminStatIconCircle, { backgroundColor: ACCENT_COLORS[1].bg }]}>
                <Ionicons name="school" size={22} color={ACCENT_COLORS[1].accent} />
              </View>
              <Text style={styles.adminStatValue}>{stats?.totalLecturers ?? '-'}</Text>
              <Text style={styles.adminStatLabel}>{t('home.lecturers')}</Text>
            </View>
            <View style={styles.adminStatCard}>
              <View style={[styles.adminStatIconCircle, { backgroundColor: ACCENT_COLORS[2].bg }]}>
                <Ionicons name="book" size={22} color={ACCENT_COLORS[2].accent} />
              </View>
              <Text style={styles.adminStatValue}>{stats?.totalOnlineCourses ?? '-'}</Text>
              <Text style={styles.adminStatLabel}>{t('courses.title')}</Text>
            </View>
          </View>
        ) : (
          /* Student: 2 horizontal metric cards (dark + light) */
          <View style={styles.statCardsRow}>
            {/* Dark card -- Enrolled Courses */}
            <View style={styles.statCardDark}>
              <View style={styles.statIconRow}>
                <View style={[styles.statIconCircle, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                  <Ionicons name="book" size={20} color="#FFFFFF" />
                </View>
                <Ionicons name="trending-up" size={18} color="rgba(255,255,255,0.5)" />
              </View>
              <View>
                <Text style={[styles.statValue, { color: '#FFFFFF' }]}>
                  {courses.length}
                </Text>
                <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>
                  {t('home.enrolledCourses')}
                </Text>
              </View>
            </View>

            {/* Light card -- Learning Hours */}
            <View style={styles.statCardLight}>
              <View style={styles.statIconRow}>
                <View style={[styles.statIconCircle, { backgroundColor: isDark ? 'rgba(124,99,253,0.2)' : '#EDE8FF' }]}>
                  <Ionicons name="time" size={20} color={PRIMARY} />
                </View>
                <Ionicons name="trending-up" size={18} color={isDark ? theme.colors.textMuted : '#C4B5FD'} />
              </View>
              <View>
                <Text style={[styles.statValue, { color: isDark ? theme.colors.text : '#1B1464' }]}>
                  {courses.reduce((sum, c) => sum + (c.totalHours || 0), 0)}h
                </Text>
                <Text style={[styles.statLabel, { color: isDark ? theme.colors.textSecondary : '#74788D' }]}>
                  {t('courses.duration')}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ────────────── QUICK ACTIONS ────────────── */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={styles.quickActionPill}
            activeOpacity={0.7}
            onPress={() => { play('pop'); navigation.getParent()?.navigate('CoursesTab'); }}
          >
            <View style={[styles.quickActionIconSmall, { backgroundColor: ACCENT_COLORS[0].bg }]}>
              <Ionicons name="book-outline" size={16} color={ACCENT_COLORS[0].accent} />
            </View>
            <Text style={styles.quickActionText}>{t('courses.title')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionPill}
            activeOpacity={0.7}
            onPress={() => { play('pop'); navigation.getParent()?.navigate('ChatTab'); }}
          >
            <View style={[styles.quickActionIconSmall, { backgroundColor: ACCENT_COLORS[1].bg }]}>
              <Ionicons name="chatbubbles-outline" size={16} color={ACCENT_COLORS[1].accent} />
            </View>
            <Text style={styles.quickActionText}>{t('chat.title')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionPill}
            activeOpacity={0.7}
            onPress={() => {
              play('pop');
              navigation.getParent()?.navigate('ProfileTab', { screen: 'Groups' });
            }}
          >
            <View style={[styles.quickActionIconSmall, { backgroundColor: ACCENT_COLORS[2].bg }]}>
              <Ionicons name="people-outline" size={16} color={ACCENT_COLORS[2].accent} />
            </View>
            <Text style={styles.quickActionText}>{t('groups.title')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionPill}
            activeOpacity={0.7}
            onPress={() => {
              play('pop');
              navigation.getParent()?.navigate('ProfileTab', { screen: 'LiveSessions' });
            }}
          >
            <View style={[styles.quickActionIconSmall, { backgroundColor: ACCENT_COLORS[3].bg }]}>
              <Ionicons name="videocam-outline" size={16} color={ACCENT_COLORS[3].accent} />
            </View>
            <Text style={styles.quickActionText}>{t('home.live')}</Text>
          </TouchableOpacity>
        </View>

        {/* ────────────── POPULAR / RECENT COURSES (horizontal) ────────────── */}
        {coursesError ? (
          <Text style={[styles.errorText, { color: theme.colors.danger }]}>{coursesError}</Text>
        ) : courses.length > 0 ? (
          <View style={styles.sectionSpacing}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {isTeacherOrAdmin ? t('home.recentCourses') : t('home.popularCourses')}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.getParent()?.navigate('CoursesTab')}
              >
                <Text style={styles.seeAllText}>{t('common.seeAll')}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.courseScrollContent}
            >
              {courses.slice(0, 6).map((course, idx) => {
                const palette = ACCENT_COLORS[idx % ACCENT_COLORS.length];
                const imageUrl = getFullImageUrl(course.previewImageUrl);
                return (
                  <TouchableOpacity
                    key={course.id}
                    style={styles.courseCard}
                    activeOpacity={0.85}
                    onPress={() => {
                      play('tap');
                      navigation.getParent()?.navigate('CoursesTab', {
                        screen: 'CourseDetail',
                        params: { courseId: course.id },
                      });
                    }}
                  >
                    <View style={[styles.courseImageWrapper, { backgroundColor: palette.bg }]}>
                      {imageUrl ? (
                        <Image
                          source={{ uri: imageUrl }}
                          style={styles.courseImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons name="book" size={36} color={palette.accent} />
                      )}
                      {/* Badge */}
                      {(course.isFree || course.price === 0) ? (
                        <View style={[styles.courseImageOverlay]}>
                          <View style={styles.courseBadge}>
                            <Text style={styles.courseBadgeText}>{t('courses.free')}</Text>
                          </View>
                        </View>
                      ) : course.price != null ? (
                        <View style={[styles.courseImageOverlay]}>
                          <View style={styles.courseBadge}>
                            <Text style={styles.courseBadgeText}>
                              ${course.discountPrice ?? course.price}
                            </Text>
                          </View>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.courseInfo}>
                      <Text style={styles.courseTitle} numberOfLines={2}>
                        {course.title || course.name}
                      </Text>
                      {course.instructorName ? (
                        <Text style={styles.courseInstructor} numberOfLines={1}>
                          {course.instructorName}
                        </Text>
                      ) : null}
                      <View style={styles.courseMetaRow}>
                        {course.totalLessons != null && (
                          <View style={styles.courseMeta}>
                            <Ionicons name="play-circle-outline" size={13} color={theme.colors.textMuted} />
                            <Text style={styles.courseMetaText}>
                              {course.totalLessons} {t('courses.lessons')}
                            </Text>
                          </View>
                        )}
                        {course.totalHours != null && (
                          <View style={styles.courseMeta}>
                            <Ionicons name="time-outline" size={13} color={theme.colors.textMuted} />
                            <Text style={styles.courseMetaText}>{course.totalHours}h</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* ────────────── ENROLLED COURSES (list) ────────────── */}
        {courses.length > 0 && (
          <View style={[styles.sectionSpacing, { marginTop: spacing['2xl'] }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('home.enrolledCourses')}</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.getParent()?.navigate('CoursesTab')}
              >
                <Text style={styles.seeAllText}>{t('common.seeAll')}</Text>
              </TouchableOpacity>
            </View>

            {courses.slice(0, 3).map((course, idx) => {
              const palette = ACCENT_COLORS[idx % ACCENT_COLORS.length];
              const imageUrl = getFullImageUrl(course.previewImageUrl);
              return (
                <TouchableOpacity
                  key={course.id}
                  activeOpacity={0.85}
                  onPress={() => {
                    play('tap');
                    navigation.getParent()?.navigate('CoursesTab', {
                      screen: 'CourseDetail',
                      params: { courseId: course.id },
                    });
                  }}
                  style={{
                    flexDirection: 'row',
                    backgroundColor: CARD_BG,
                    borderRadius: borderRadius['3xl'],
                    overflow: 'hidden',
                    marginHorizontal: spacing.xl,
                    marginBottom: spacing.md,
                    ...Platform.select({
                      ios: {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.03,
                        shadowRadius: 3,
                      },
                      android: { elevation: 1 },
                    }),
                  }}
                >
                  {/* Left image */}
                  <View
                    style={{
                      width: 100,
                      height: 100,
                      backgroundColor: palette.bg,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {imageUrl ? (
                      <Image
                        source={{ uri: imageUrl }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons name="book" size={32} color={palette.accent} />
                    )}
                  </View>
                  {/* Right info */}
                  <View style={{ flex: 1, padding: spacing.md, justifyContent: 'center' }}>
                    <Text
                      style={{
                        ...typography.bodySmall,
                        fontWeight: '700',
                        color: theme.colors.text,
                        marginBottom: 4,
                      }}
                      numberOfLines={2}
                    >
                      {course.title || course.name}
                    </Text>
                    {course.instructorName ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Ionicons name="person-outline" size={12} color={theme.colors.textSecondary} />
                        <Text
                          style={{
                            ...typography.caption,
                            color: theme.colors.textSecondary,
                            marginLeft: 4,
                          }}
                          numberOfLines={1}
                        >
                          {course.instructorName}
                        </Text>
                      </View>
                    ) : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                      {course.totalLessons != null && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Ionicons name="play-circle-outline" size={12} color={theme.colors.textMuted} />
                          <Text style={{ ...typography.caption, color: theme.colors.textMuted }}>
                            {course.totalLessons} {t('courses.lessons')}
                          </Text>
                        </View>
                      )}
                      {course.totalHours != null && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Ionicons name="time-outline" size={12} color={theme.colors.textMuted} />
                          <Text style={{ ...typography.caption, color: theme.colors.textMuted }}>
                            {course.totalHours}h
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {/* Arrow */}
                  <View style={{ justifyContent: 'center', paddingRight: spacing.md }}>
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ────────────── HONOR BOARD (top 5) ────────────── */}
        {topStudents.length > 0 && (
          <View style={[styles.sectionSpacing, { marginTop: spacing['2xl'] }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('honorBoard.title')}</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  play('pop');
                  navigation.getParent()?.navigate('ProfileTab', { screen: 'HonorBoard' });
                }}
              >
                <Text style={styles.seeAllText}>{t('common.seeAll')}</Text>
              </TouchableOpacity>
            </View>
            {topStudents.map((student, idx) => {
              const name = `${student.firstName || ''} ${student.lastName || ''}`.trim();
              const initial = (student.firstName?.[0] || '?').toUpperCase();
              const imageUrl = getFullImageUrl(student.profileImage);
              const medalColor = idx === 0 ? '#FFD54F' : idx === 1 ? '#BDBDBD' : idx === 2 ? '#FFB74D' : ACCENT_COLORS[idx % ACCENT_COLORS.length].accent;
              const medalBg = idx === 0 ? '#FFF8E1' : idx === 1 ? '#F5F5F5' : idx === 2 ? '#FFF3E0' : ACCENT_COLORS[idx % ACCENT_COLORS.length].bg;
              return (
                <TouchableOpacity
                  key={student.id}
                  style={[styles.honorCard, { backgroundColor: CARD_BG }]}
                  activeOpacity={0.85}
                  onPress={() => {
                    play('tap');
                    navigation.getParent()?.navigate('ProfileTab', { screen: 'HonorBoard' });
                  }}
                >
                  <View style={[styles.honorRank, { backgroundColor: isDark ? theme.colors.surface : medalBg }]}>
                    {idx < 3 ? (
                      <Ionicons name="trophy" size={14} color={medalColor} />
                    ) : (
                      <Text style={[styles.honorRankText, { color: theme.colors.text }]}>{idx + 1}</Text>
                    )}
                  </View>
                  <View style={styles.honorAvatar}>
                    {imageUrl ? (
                      <Image source={{ uri: imageUrl }} style={styles.honorAvatarImg} />
                    ) : (
                      <View style={[styles.honorAvatarFallback, { backgroundColor: medalBg }]}>
                        <Text style={[styles.honorInitial, { color: medalColor }]}>{initial}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.honorName, { color: theme.colors.text }]} numberOfLines={1}>{name}</Text>
                  <View style={[styles.honorScore, { backgroundColor: isDark ? theme.colors.surface : '#FFF8E1' }]}>
                    <Ionicons name="star" size={11} color="#F5A623" />
                    <Text style={styles.honorScoreText}>{student.totalPoints ?? student.completedLessons ?? 0}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ────────────── LATEST NEWS ────────────── */}
        <View style={[styles.sectionSpacing, { marginTop: spacing['2xl'] }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('home.latestNews')}</Text>
          </View>
          {newsError ? (
            <Text style={[styles.errorText, { color: theme.colors.danger }]}>{newsError}</Text>
          ) : news.length > 0 ? (

            news.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.newsCard}
                activeOpacity={0.85}
                onPress={() => { play('tap'); navigation.navigate('NewsDetail', { newsId: item.id, newsItem: item }); }}
              >
                <View style={styles.newsImageContainer}>
                  {getFullImageUrl(item.imageUrl || item.imageURl) ? (
                    <Image
                      source={{ uri: getFullImageUrl(item.imageUrl || item.imageURl)! }}
                      style={styles.newsImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.newsImagePlaceholder}>
                      <Ionicons name="newspaper-outline" size={28} color={ACCENT_COLORS[0].accent} />
                    </View>
                  )}
                </View>
                <View style={styles.newsContent}>
                  <Text style={styles.newsTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  {item.subTitle ? (
                    <Text style={styles.newsSubtitle} numberOfLines={1}>
                      {item.subTitle}
                    </Text>
                  ) : null}
                  <Text style={styles.newsDate}>
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString('en', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'N/A'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>{t('home.noNewsAvailable')}</Text>
          )}
        </View>

        {/* ────────────── UPCOMING EVENTS ────────────── */}
        {events.length > 0 && (
          <View style={[styles.sectionSpacing, { marginTop: spacing['2xl'] }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('home.upcomingEvents')}</Text>
            </View>
            {events.map((event) => {
              const date = new Date(event.startDate);
              return (
                <TouchableOpacity
                  key={event.id}
                  style={styles.eventCard}
                  activeOpacity={0.85}
                  onPress={() => {
                    play('tap');
                    navigation.navigate('EventDetail', { eventId: event.id });
                  }}
                >
                  <View style={styles.eventDateBox}>
                    <Text style={styles.eventDay}>{date.getDate()}</Text>
                    <Text style={styles.eventMonth}>
                      {date.toLocaleString('en', { month: 'short' })}
                    </Text>
                  </View>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle} numberOfLines={1}>
                      {event.title}
                    </Text>
                    <Text style={styles.eventTime}>
                      {date.toLocaleTimeString('en', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={theme.colors.textMuted}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { useRTL } from '../../i18n/RTLProvider';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography, fontSize } from '../../theme/typography';
import type { ProfileStackParamList } from '../../types/navigation.types';
import { getFullImageUrl } from '../../utils/imageUrl';
import { GradientBackground } from '../../components/ui/GradientBackground';
import { coursesApi } from '../../services/api/courses.api';
import { chatApi } from '../../services/api/chat.api';
import { dashboardApi, type DashboardStats } from '../../services/api/dashboard.api';
import type { Enrollment } from '../../types/course.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { user, role: authRole, can, isStudent, logout } = useAuth();
  const { t, isRTL } = useRTL();
  const insets = useSafeAreaInsets();

  const role = authRole || 'Student';
  const canManageGroups = can('GROUPS');
  const canMyGroup = can('MY_GROUP');
  const canLive = can('LIVE_CLASSROOM');
  const canReports = can('REPORTS');
  const isStaffOrAdmin = !isStudent;

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [messageThreadsCount, setMessageThreadsCount] = useState(0);
  const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (isStudent && user?.studentId) {
        const [enrollmentsResult, contactsResult] = await Promise.allSettled([
          coursesApi.getStudentEnrollments(user.studentId),
          chatApi.getStaffHasMessages(),
        ]);
        if (!cancelled) {
          if (enrollmentsResult.status === 'fulfilled') setEnrollments(enrollmentsResult.value);
          if (contactsResult.status === 'fulfilled') setMessageThreadsCount(contactsResult.value.length);
        }
      } else if (isStaffOrAdmin) {
        try {
          const stats = await dashboardApi.getStats();
          if (!cancelled) setDashStats(stats);
        } catch {
          // stats may not be available
        }
      }
      if (!cancelled) setStatsLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [isStudent, isStaffOrAdmin, user?.studentId]);

  const totalCompletedLessons = enrollments.reduce((sum, e) => sum + (e.completedLessons || 0), 0);
  const totalLessonsAll = enrollments.reduce((sum, e) => sum + (e.totalLessons || 0), 0);
  const overallPercent = totalLessonsAll > 0 ? Math.round((totalCompletedLessons / totalLessonsAll) * 100) : null;
  const enrollmentPercent = (e: Enrollment) =>
    Math.round(e.progressPercentage ?? (e.totalLessons ? (e.completedLessons / e.totalLessons) * 100 : 0));
  const inProgressCourses = enrollments.filter((e) => enrollmentPercent(e) < 100).slice(0, 4);

  const handleLogout = () => {
    Alert.alert(t('auth.signOut'), t('auth.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.signOut'),
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const firstName = user?.firstName || '';
  const lastName = user?.lastName || '';
  const initials = (firstName?.[0] || '') + (lastName?.[0] || '');
  const photoUri = getFullImageUrl(user?.profileImage);

  const generalMenuItems: { iconName: string; iconBg: string; iconColor: string; label: string; onPress: () => void }[] = [];
  generalMenuItems.push({
    iconName: 'document-text',
    iconBg: theme.colors.primaryLight,
    iconColor: theme.colors.primary,
    label: t('homework.title'),
    onPress: () => navigation.navigate('Homework'),
  });
  if (canManageGroups || canMyGroup) {
    generalMenuItems.push({
      iconName: 'people',
      iconBg: '#E8F4FD',
      iconColor: '#3B82F6',
      label: isStudent ? t('groups.myGroups') : t('groups.title'),
      onPress: () => navigation.navigate('Groups'),
    });
  }
  if (canLive) {
    generalMenuItems.push({
      iconName: 'videocam',
      iconBg: '#E8F8F0',
      iconColor: '#34C38F',
      label: t('live.title'),
      onPress: () => navigation.navigate('LiveSessions'),
    });
  }
  generalMenuItems.push({
    iconName: 'trophy',
    iconBg: '#FFF4E5',
    iconColor: '#F5A623',
    label: t('honorBoard.title'),
    onPress: () => navigation.navigate('HonorBoard'),
  });
  if (canReports) {
    generalMenuItems.push({
      iconName: 'bar-chart',
      iconBg: '#E8F4FD',
      iconColor: '#3B82F6',
      label: t('reports.title'),
      onPress: () => navigation.navigate('Reports'),
    });
  }

  return (
    <GradientBackground style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Purple header */}
        <View style={[styles.headerBg, { paddingTop: insets.top + spacing.lg, backgroundColor: theme.colors.primary }]}>
          <View style={[styles.avatar, { backgroundColor: theme.dark ? theme.colors.surface : theme.colors.primaryLight }]}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
                {initials.toUpperCase() || '?'}
              </Text>
            )}
          </View>
          <Text style={styles.userName}>
            {firstName} {lastName}
          </Text>
          {user?.email ? (
            <Text style={styles.email}>{user.email}</Text>
          ) : null}
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{role}</Text>
          </View>
        </View>

        {/* Stats Row - overlaps header */}
        <View style={styles.statsRow}>
          {(isStudent
            ? [
                {
                  key: 'completed',
                  icon: 'trophy',
                  iconBg: '#FFF4E5',
                  iconColor: '#F5A623',
                  value: statsLoading ? '-' : String(totalCompletedLessons),
                  label: t('profile.completed'),
                  onPress: () => navigation.getParent()?.navigate('HomeTab', { screen: 'CoursesList' }),
                },
                {
                  key: 'messages',
                  icon: 'chatbubbles',
                  iconBg: '#E8F8F0',
                  iconColor: '#34C38F',
                  value: statsLoading ? '-' : String(messageThreadsCount),
                  label: t('profile.messages'),
                  onPress: () => navigation.getParent()?.navigate('ChatTab'),
                },
                {
                  key: 'courses',
                  icon: 'book',
                  iconBg: theme.colors.primaryLight,
                  iconColor: theme.colors.primary,
                  value: statsLoading ? '-' : String(enrollments.length),
                  label: t('profile.courses'),
                  onPress: () => navigation.getParent()?.navigate('HomeTab', { screen: 'CoursesList' }),
                },
              ]
            : [
                {
                  key: 'students',
                  icon: 'people',
                  iconBg: '#E8F4FD',
                  iconColor: '#3B82F6',
                  value: statsLoading ? '-' : String(dashStats?.totalStudents ?? '-'),
                  label: t('home.students'),
                },
                {
                  key: 'lecturers',
                  icon: 'school',
                  iconBg: '#FFF4E5',
                  iconColor: '#F5A623',
                  value: statsLoading ? '-' : String(dashStats?.totalLecturers ?? '-'),
                  label: t('home.lecturers'),
                },
                {
                  key: 'courses',
                  icon: 'book',
                  iconBg: theme.colors.primaryLight,
                  iconColor: theme.colors.primary,
                  value: statsLoading ? '-' : String(dashStats?.totalOnlineCourses ?? '-'),
                  label: t('courses.title'),
                  onPress: () => navigation.getParent()?.navigate('HomeTab', { screen: 'CoursesList' }),
                },
              ]
          ).map((stat) => (
            <TouchableOpacity
              key={stat.key}
              style={[styles.statCard, { backgroundColor: theme.colors.card }]}
              activeOpacity={stat.onPress ? 0.7 : 1}
              disabled={!stat.onPress}
              onPress={stat.onPress}
            >
              <View style={[styles.statIcon, { backgroundColor: stat.iconBg }]}>
                <Ionicons name={stat.icon as any} size={18} color={stat.iconColor} />
              </View>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>{stat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Progress Section (students only) */}
        {isStudent && overallPercent !== null && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
              {t('profile.myProgress')}
            </Text>
            <View style={[styles.progressCard, { backgroundColor: theme.colors.card }]}>
              <View style={styles.progressHeaderRow}>
                <Text style={[styles.progressLabel, { color: theme.colors.text }]}>
                  {t('profile.overallCompletion')}
                </Text>
                <Text style={[styles.progressPercent, { color: theme.colors.primary }]}>
                  {overallPercent}%
                </Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: theme.colors.divider }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${overallPercent}%`, backgroundColor: theme.colors.primary },
                  ]}
                />
              </View>
            </View>

            {inProgressCourses.length > 0 && (
              <View style={styles.continueList}>
                <Text style={[styles.continueListTitle, { color: theme.colors.textMuted }]}>
                  {t('profile.continueLearning')}
                </Text>
                {inProgressCourses.map((e) => {
                  const pct = enrollmentPercent(e);
                  const imageUrl = getFullImageUrl(e.course?.previewImageUrl);
                  return (
                    <TouchableOpacity
                      key={e.id}
                      activeOpacity={0.8}
                      onPress={() =>
                        navigation
                          .getParent()
                          ?.navigate('HomeTab', { screen: 'CourseDetail', params: { courseId: e.courseId } })
                      }
                      style={[styles.continueCard, { backgroundColor: theme.colors.card }]}
                    >
                      <View style={[styles.continueImage, { backgroundColor: theme.colors.primaryLight }]}>
                        {imageUrl ? (
                          <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        ) : (
                          <Ionicons name="book" size={20} color={theme.colors.primary} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.continueTitle, { color: theme.colors.text }]} numberOfLines={1}>
                          {e.course?.title || e.course?.name}
                        </Text>
                        <View style={[styles.progressTrackSmall, { backgroundColor: theme.colors.divider }]}>
                          <View
                            style={[
                              styles.progressFillSmall,
                              { width: `${pct}%`, backgroundColor: theme.colors.primary },
                            ]}
                          />
                        </View>
                      </View>
                      <Text style={[styles.continueMeta, { color: theme.colors.textMuted }]}>{pct}%</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* General Section */}
        {generalMenuItems.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
              {t('profile.general')}
            </Text>
            <View style={[styles.menuCard, { backgroundColor: theme.colors.card }]}>
              {generalMenuItems.map((item, idx) => (
                <TouchableOpacity
                  key={`${item.iconName}-${item.label}`}
                  style={[
                    styles.menuRow,
                    idx < generalMenuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.6}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.iconBg }]}>
                    <Ionicons name={item.iconName as any} size={20} color={item.iconColor} />
                  </View>
                  <Text style={[styles.menuLabel, { color: theme.colors.text }]}>{item.label}</Text>
                  <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
            {t('profile.preferences')}
          </Text>
          <View style={[styles.menuCard, { backgroundColor: theme.colors.card }]}>
            <TouchableOpacity
              style={[styles.menuRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.divider }]}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.6}
            >
              <View style={[styles.menuIcon, { backgroundColor: theme.colors.primaryLight }]}>
                <Ionicons name="settings" size={20} color={theme.colors.primary} />
              </View>
              <Text style={[styles.menuLabel, { color: theme.colors.text }]}>{t('profile.settings')}</Text>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => navigation.navigate('ChangePassword')}
              activeOpacity={0.6}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#FFF4E5' }]}>
                <Ionicons name="lock-closed" size={20} color="#F5A623" />
              </View>
              <Text style={[styles.menuLabel, { color: theme.colors.text }]}>{t('auth.changePassword')}</Text>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: theme.colors.danger + '10' }]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={22} color={theme.colors.danger} />
            <Text style={[styles.logoutText, { color: theme.colors.danger }]}>
              {t('auth.signOut')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBg: {
    paddingBottom: 44,
    alignItems: 'center',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: spacing.md,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  avatarText: {
    fontSize: 30,
    fontFamily: 'Cairo_700Bold',
  },
  userName: {
    ...typography.h3,
    color: '#ffffff',
    fontFamily: 'Cairo_700Bold',
  },
  email: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  rolePill: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.full,
  },
  roleText: {
    fontSize: fontSize.xs,
    fontFamily: 'Cairo_700Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.xl,
    marginTop: -24,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontFamily: 'Cairo_700Bold',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  progressCard: {
    borderRadius: 20,
    padding: spacing.lg,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_600SemiBold',
  },
  progressPercent: {
    fontSize: fontSize.base,
    fontFamily: 'Cairo_700Bold',
  },
  progressTrack: {
    height: 8,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  continueList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  continueListTitle: {
    fontSize: fontSize.xs,
    fontFamily: 'Cairo_600SemiBold',
    marginBottom: spacing.xs,
  },
  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  continueImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  continueTitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_600SemiBold',
    marginBottom: 6,
  },
  progressTrackSmall: {
    height: 5,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFillSmall: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  continueMeta: {
    fontSize: 11,
    fontFamily: 'Cairo_700Bold',
  },
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontFamily: 'Cairo_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  menuCard: {
    borderRadius: 20,
    overflow: 'hidden',
    
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuLabel: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: 'Cairo_600SemiBold',
  },
  logoutBtn: {
    borderRadius: 20,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    ...typography.button,
    marginLeft: spacing.sm,
  },
});

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ParentStackParamList } from '../../types/navigation.types';
import type { GuardianAttendance, GuardianExamItem, GuardianWallet } from '../../types/guardian.types';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { guardianApi } from '../../services/api/guardian.api';
import { selectCurrentChild, useParentStore } from '../../store/parent.store';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { Theme } from '../../theme/themes';
import { formatAmount } from '../../utils/price';
import { getFullImageUrl } from '../../utils/imageUrl';
import { attendanceColor } from '../sessions/sessionFormat';
import { COUNT_KEYS, formatExamDay, scoreColor } from './parentFormat';
import { useLinkRevoked } from './parentHooks';

const LATEST_EXAMS = 3;

type Props = NativeStackScreenProps<ParentStackParamList, 'ParentHome'>;

interface Summary {
  attendance: GuardianAttendance;
  wallet: GuardianWallet;
  exams: GuardianExamItem[];
}

export default function ParentHomeScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t, locale, isRTL } = useRTL();
  const insets = useSafeAreaInsets();
  const children = useParentStore((state) => state.children);
  const child = useParentStore(selectCurrentChild);
  const selectChild = useParentStore((state) => state.selectChild);
  const unreadCount = useParentStore((state) => state.unreadCount);
  const refreshChildren = useParentStore((state) => state.refreshChildren);
  const fetchUnreadCount = useParentStore((state) => state.fetchUnreadCount);
  const onLinkRevoked = useLinkRevoked();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const generation = useRef(0);
  const childId = child?.studentId ?? null;

  const load = useCallback(async () => {
    const current = ++generation.current;
    if (childId == null) {
      setSummary(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const [attendance, wallet, exams] = await Promise.all([
        guardianApi.attendance(childId),
        guardianApi.wallet(childId),
        guardianApi.exams(childId, 1, LATEST_EXAMS),
      ]);
      if (current !== generation.current) return;
      setSummary({ attendance, wallet, exams: exams.items });
      setFailed(false);
    } catch (error) {
      if (current !== generation.current) return;
      if (!onLinkRevoked(error)) setFailed(true);
    } finally {
      if (current === generation.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [childId, onLinkRevoked]);

  useEffect(() => {
    setSummary(null);
    setLoading(true);
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
    }, [fetchUnreadCount])
  );

  const onRefresh = () => {
    setRefreshing(true);
    refreshChildren().catch(() => {});
    fetchUnreadCount();
    load();
  };

  const retry = () => {
    setLoading(true);
    load();
  };

  const styles = createStyles(theme);
  const chevron = isRTL ? 'chevron-back' : 'chevron-forward';
  const stage = child?.educationStage ? t(`educationStages.${child.educationStage}`, { defaultValue: child.educationStage }) : null;
  const photo = getFullImageUrl(child?.profileImageUrl);

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.headerText}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {child ? t('parent.headerTitle', { name: child.fullName }) : t('parent.title')}
        </Text>
        {!!child?.academyTitle && (
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {child.academyTitle}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => navigation.navigate('ParentNotifications')}
        accessibilityRole="button"
        accessibilityLabel={t('parent.notifications')}
      >
        <Ionicons name="notifications-outline" size={22} color={theme.colors.text} />
        {unreadCount > 0 && (
          <View style={[styles.unreadBadge, { backgroundColor: theme.colors.danger }]}>
            <Text style={styles.unreadText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => navigation.navigate('ParentSettings')}
        accessibilityRole="button"
        accessibilityLabel={t('settings.title')}
      >
        <Ionicons name="settings-outline" size={22} color={theme.colors.text} />
      </TouchableOpacity>
    </View>
  );

  if (children.length === 0) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.emptyWrap}>
          <EmptyState
            icon={<Ionicons name="people-outline" size={56} color={theme.colors.textMuted} />}
            title={t('parent.noChildren')}
            description={t('parent.noChildrenHint')}
            style={styles.emptyState}
          />
          <Button
            title={t('parent.linkStudent')}
            onPress={() => navigation.navigate('ParentLink')}
            size="large"
            icon={<Ionicons name="scan" size={20} color="#FFFFFF" />}
          />
        </View>
      </View>
    );
  }

  const links: { icon: keyof typeof Ionicons.glyphMap; label: string; route: 'ParentAttendance' | 'ParentExams' | 'ParentHomework' }[] = [
    { icon: 'calendar-outline', label: t('parent.attendance'), route: 'ParentAttendance' },
    { icon: 'ribbon-outline', label: t('parent.results'), route: 'ParentExams' },
    { icon: 'document-text-outline', label: t('parent.homework'), route: 'ParentHomework' },
  ];

  return (
    <View style={styles.container}>
      {header}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />
        }
      >
        {children.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {children.map((item) => {
              const active = item.studentId === childId;
              return (
                <TouchableOpacity
                  key={item.studentId}
                  style={[styles.chip, { backgroundColor: active ? theme.colors.primary : theme.colors.card }]}
                  onPress={() => selectChild(item.studentId)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.chipText, { color: active ? '#FFFFFF' : theme.colors.text }]} numberOfLines={1}>
                    {item.fullName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {child && (
          <View style={[styles.card, styles.childCard]}>
            <Avatar source={photo ? { uri: photo } : undefined} name={child.fullName} size="large" />
            <View style={styles.flex}>
              <Text style={styles.childName} numberOfLines={2}>
                {child.fullName}
              </Text>
              {!!child.code && <Text style={styles.meta}>{t('parent.code', { code: child.code })}</Text>}
              {!!stage && <Text style={styles.meta}>{stage}</Text>}
            </View>
          </View>
        )}

        {loading ? (
          <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
        ) : failed ? (
          <ErrorRetry message={t('parent.loadFailed')} onRetry={retry} />
        ) : (
          summary && (
            <>
              <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ParentAttendance')} accessibilityRole="button">
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{t('parent.attendance')}</Text>
                  <Ionicons name={chevron} size={18} color={theme.colors.textMuted} />
                </View>
                <View style={styles.countsRow}>
                  {COUNT_KEYS.map(({ status, key }) => {
                    const color = attendanceColor(status, theme.colors);
                    return (
                      <View key={key} style={[styles.countBox, { backgroundColor: color + '1F' }]}>
                        <Text style={[styles.countValue, { color }]}>{summary.attendance.counts[key]}</Text>
                        <Text style={[styles.countLabel, { color }]} numberOfLines={1}>
                          {t(`sessions.attendance.${status}`)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </TouchableOpacity>

              <View style={[styles.card, styles.pointsCard, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="wallet" size={26} color="#FFFFFF" />
                <Text style={styles.pointsLabel}>{t('parent.points')}</Text>
                <Text style={styles.pointsValue}>
                  {`${formatAmount(summary.wallet.balance)} ${t('wallet.points')}`}
                </Text>
              </View>

              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{t('parent.latestResults')}</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('ParentExams')} accessibilityRole="button" hitSlop={8}>
                    <Text style={styles.seeAll}>{t('common.seeAll')}</Text>
                  </TouchableOpacity>
                </View>
                {summary.exams.length === 0 ? (
                  <Text style={styles.meta}>{t('parent.noResults')}</Text>
                ) : (
                  summary.exams.map((exam) => {
                    const color = scoreColor(exam.percentage, theme.colors);
                    return (
                      <View key={exam.studentExamId} style={styles.examRow}>
                        <View style={styles.flex}>
                          <Text style={styles.examName} numberOfLines={1}>
                            {exam.examName}
                          </Text>
                          <Text style={styles.meta}>{formatExamDay(exam.examDate, locale)}</Text>
                        </View>
                        <Text style={[styles.examScore, { color }]}>
                          {`${exam.studentScore}/${exam.totalMarks} · ${Math.round(exam.percentage)}%`}
                        </Text>
                      </View>
                    );
                  })
                )}
              </View>
            </>
          )
        )}

        <View style={styles.linksRow}>
          {links.map((link) => (
            <TouchableOpacity
              key={link.route}
              style={[styles.card, styles.linkTile]}
              onPress={() => navigation.navigate(link.route)}
              accessibilityRole="button"
            >
              <Ionicons name={link.icon} size={24} color={theme.colors.primary} />
              <Text style={styles.linkText} numberOfLines={1}>
                {link.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    flex: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
    },
    headerText: {
      flex: 1,
    },
    headerTitle: {
      ...typography.headerTitle,
      color: theme.colors.text,
    },
    headerSubtitle: {
      ...typography.bodySmall,
      color: theme.colors.textMuted,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unreadBadge: {
      position: 'absolute',
      top: 2,
      end: 2,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unreadText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontFamily: 'Cairo_700Bold',
    },
    emptyWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing['2xl'],
    },
    emptyState: {
      flex: 0,
    },
    content: {
      padding: spacing.lg,
      paddingBottom: spacing['4xl'],
      gap: spacing.md,
    },
    chips: {
      gap: spacing.sm,
    },
    chip: {
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      maxWidth: 220,
    },
    chipText: {
      ...typography.bodySmall,
      fontFamily: 'Cairo_600SemiBold',
    },
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: 20,
      padding: spacing.lg,
    },
    childCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    childName: {
      ...typography.h4,
      color: theme.colors.text,
    },
    meta: {
      ...typography.bodySmall,
      color: theme.colors.textMuted,
    },
    loader: {
      marginTop: spacing['3xl'],
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    cardTitle: {
      ...typography.sectionTitle,
      color: theme.colors.text,
    },
    seeAll: {
      ...typography.bodySmall,
      fontFamily: 'Cairo_600SemiBold',
      color: theme.colors.primary,
    },
    countsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    countBox: {
      flex: 1,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    countValue: {
      ...typography.h4,
      fontFamily: 'Cairo_700Bold',
    },
    countLabel: {
      ...typography.bodySmall,
    },
    pointsCard: {
      alignItems: 'center',
      gap: spacing.xs,
    },
    pointsLabel: {
      ...typography.body,
      color: '#FFFFFF',
    },
    pointsValue: {
      ...typography.h3,
      fontFamily: 'Cairo_700Bold',
      color: '#FFFFFF',
    },
    examRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },
    examName: {
      ...typography.body,
      fontFamily: 'Cairo_600SemiBold',
      color: theme.colors.text,
    },
    examScore: {
      ...typography.bodySmall,
      fontFamily: 'Cairo_700Bold',
    },
    linksRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    linkTile: {
      flex: 1,
      alignItems: 'center',
      gap: spacing.sm,
    },
    linkText: {
      ...typography.bodySmall,
      fontFamily: 'Cairo_600SemiBold',
      color: theme.colors.text,
    },
  });
}

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { spacing } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { reportsApi } from '../../services/api/reports.api';
import type { ProfileStackParamList } from '../../types/navigation.types';
import type { AttendanceReportRow, ExamReportRow } from '../../types/reports.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Reports'>;

export default function ReportsListScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t, isRTL } = useRTL();
  const [tab, setTab] = useState<'attendance' | 'exams'>('attendance');
  const [attendance, setAttendance] = useState<AttendanceReportRow[]>([]);
  const [exams, setExams] = useState<ExamReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (t2: 'attendance' | 'exams' = tab) => {
    try {
      setError(null);
      if (t2 === 'attendance') {
        const data = await reportsApi.getAttendanceReports();
        setAttendance(data);
      } else {
        const data = await reportsApi.getExamReports();
        setExams(data);
      }
    } catch (err: any) {
      setError(err?.userMessage || err?.message || t('reports.failedToLoad'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, t]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load(tab);
    }, [load, tab])
  );

  const handleTabChange = (next: 'attendance' | 'exams') => {
    if (next === tab) return;
    setTab(next);
    setLoading(true);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    load(tab);
  };

  const percentColor = (value: number) => (value >= 75 ? '#34C38F' : value >= 50 ? '#F5A623' : '#EF4444');

  const renderAttendanceRow = ({ item }: { item: AttendanceReportRow }) => {
    const color = percentColor(item.attendancePercentage);
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.card }]}
        onPress={() => navigation.navigate('AttendanceDetail', { groupId: item.groupId, groupName: item.groupName })}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, { backgroundColor: color + '15' }]}>
          <Ionicons name="people-outline" size={18} color={color} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {item.groupName}
          </Text>
          <Text style={[styles.cardMeta, { color: theme.colors.textMuted }]}>
            {item.sessionsCount} {t('reports.sessions')}
          </Text>
        </View>
        <View style={styles.percentWrap}>
          <Text style={[styles.percentText, { color }]}>{Math.round(item.attendancePercentage)}%</Text>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={theme.colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderExamRow = ({ item }: { item: ExamReportRow }) => {
    const color = percentColor(item.successRate);
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.card }]}
        onPress={() => navigation.navigate('ExamReportDetail', { examId: item.examId, examName: item.examName })}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, { backgroundColor: color + '15' }]}>
          <Ionicons name="clipboard-outline" size={18} color={color} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {item.examName}
          </Text>
          <Text style={[styles.cardMeta, { color: theme.colors.textMuted }]}>
            {item.attemptsCount} {t('reports.attempts')} · {t('reports.averageScore')} {item.averageScore.toFixed(1)}
          </Text>
        </View>
        <View style={styles.percentWrap}>
          <Text style={[styles.percentText, { color }]}>{Math.round(item.successRate)}%</Text>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={theme.colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  const isAttendance = tab === 'attendance';
  const data = isAttendance ? attendance : exams;
  const listEmpty = data.length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title={t('reports.title')} onBack={() => navigation.goBack()} />

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabButton, { backgroundColor: isAttendance ? theme.colors.primary : theme.colors.card }]}
          onPress={() => handleTabChange('attendance')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabButtonText, { color: isAttendance ? '#fff' : theme.colors.textMuted }]}>
            {t('reports.attendanceTab')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, { backgroundColor: !isAttendance ? theme.colors.primary : theme.colors.card }]}
          onPress={() => handleTabChange('exams')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabButtonText, { color: !isAttendance ? '#fff' : theme.colors.textMuted }]}>
            {t('reports.examsTab')}
          </Text>
        </TouchableOpacity>
      </View>

      {loading && listEmpty ? (
        <Spinner />
      ) : error && listEmpty ? (
        <ErrorRetry message={error} onRetry={() => load(tab)} />
      ) : listEmpty ? (
        <EmptyState
          icon={<Ionicons name={isAttendance ? 'people-outline' : 'clipboard-outline'} size={48} color={theme.colors.textMuted} />}
          title={isAttendance ? t('reports.noAttendance') : t('reports.noExamReports')}
          description={isAttendance ? t('reports.noAttendanceMessage') : t('reports.noExamReportsMessage')}
        />
      ) : isAttendance ? (
        <FlatList
          data={attendance}
          keyExtractor={item => String(item.groupId)}
          renderItem={renderAttendanceRow}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />}
        />
      ) : (
        <FlatList
          data={exams}
          keyExtractor={item => String(item.examId)}
          renderItem={renderExamRow}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabButtonText: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_600SemiBold',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_600SemiBold',
  },
  cardMeta: {
    fontSize: 11,
    fontFamily: 'Cairo_500Medium',
  },
  percentWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  percentText: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_700Bold',
  },
});

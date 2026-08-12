import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { spacing } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { reportsApi } from '../../services/api/reports.api';
import type { ProfileStackParamList } from '../../types/navigation.types';
import type { AttendanceStudentRow } from '../../types/reports.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'AttendanceDetail'>;

export default function AttendanceDetailScreen({ navigation, route }: Props) {
  const { groupId, groupName } = route.params;
  const { theme } = useTheme();
  const { t } = useRTL();
  const [items, setItems] = useState<AttendanceStudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await reportsApi.getGroupAttendanceReports(groupId);
      setItems(data);
    } catch (err: any) {
      setError(err?.userMessage || err?.message || t('reports.failedToLoad'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId, t]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const percentColor = (value: number) => (value >= 75 ? '#34C38F' : value >= 50 ? '#F5A623' : '#EF4444');

  const renderRow = ({ item }: { item: AttendanceStudentRow }) => {
    const color = percentColor(item.attendancePercentage);
    const initials = (item.studentName || '?').trim().slice(0, 1).toUpperCase();
    return (
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '15' }]}>
          <Text style={[styles.avatarText, { color: theme.colors.primary }]}>{initials}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {item.studentName}
          </Text>
          <Text style={[styles.cardMeta, { color: theme.colors.textMuted }]}>
            {item.presentCount} {t('reports.present')} · {item.absentCount} {t('reports.absent')}
          </Text>
        </View>
        <Text style={[styles.percentText, { color }]}>{Math.round(item.attendancePercentage)}%</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title={groupName} onBack={() => navigation.goBack()} />

      {loading && items.length === 0 ? (
        <Spinner />
      ) : error && items.length === 0 ? (
        <ErrorRetry message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="people-outline" size={48} color={theme.colors.textMuted} />}
          title={t('reports.noStudentsYet')}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.studentId)}
          renderItem={renderRow}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={theme.colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
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
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_700Bold',
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
  percentText: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_700Bold',
  },
});

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
import { homeworkApi } from '../../services/api/homework.api';
import type { HomeworkStackParamList } from '../../types/navigation.types';
import {
  HomeworkSubmissionStatus,
  type HomeworkSubmissionListItem,
} from '../../types/homework.types';

type Props = NativeStackScreenProps<HomeworkStackParamList, 'HomeworkSubmissions'>;

export default function HomeworkSubmissionsScreen({ navigation, route }: Props) {
  const { homeworkId, homeworkName } = route.params;
  const { theme } = useTheme();
  const { t, isRTL } = useRTL();
  const [items, setItems] = useState<HomeworkSubmissionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await homeworkApi.getSubmissionsForReview(homeworkId);
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.userMessage || err?.message || t('homework.failedToLoad'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [homeworkId, t]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const statusMeta = (status: HomeworkSubmissionStatus, grade?: number | null) => {
    switch (status) {
      case HomeworkSubmissionStatus.Graded:
        return { label: grade != null ? `${t('homework.graded')} · ${grade}` : t('homework.graded'), color: '#34C38F' };
      case HomeworkSubmissionStatus.Submitted:
        return { label: t('homework.submitted'), color: '#3B82F6' };
      default:
        return { label: t('homework.draft'), color: '#F59E0B' };
    }
  };

  const renderCard = ({ item }: { item: HomeworkSubmissionListItem }) => {
    const sm = statusMeta(item.status, item.finalGrade);
    const initials = (item.studentName || '?').trim().slice(0, 1).toUpperCase();
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.card }]}
        onPress={() => navigation.navigate('HomeworkReview', { submissionId: item.submissionId, studentName: item.studentName })}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '15' }]}>
          <Text style={[styles.avatarText, { color: theme.colors.primary }]}>{initials}</Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>{item.studentName}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.metaText, { color: sm.color }]}>{sm.label}</Text>
            {item.submittedAt && (
              <>
                <Text style={[styles.dot, { color: theme.colors.textMuted }]}>·</Text>
                <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>
                  {new Date(item.submittedAt).toLocaleDateString()}
                </Text>
              </>
            )}
            {item.hasAiSuggestion && (
              <>
                <Text style={[styles.dot, { color: theme.colors.textMuted }]}>·</Text>
                <View style={styles.aiChip}>
                  <Ionicons name="sparkles" size={9} color={theme.colors.primary} />
                  <Text style={[styles.aiChipText, { color: theme.colors.primary }]}>{t('homework.aiSuggested')}</Text>
                </View>
              </>
            )}
          </View>
        </View>
        <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScreenHeader title={homeworkName || t('homework.submissions')} onBack={() => navigation.goBack()} />
      {loading && items.length === 0 ? (
        <Spinner />
      ) : error && items.length === 0 ? (
        <ErrorRetry message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="people-outline" size={48} color={theme.colors.textMuted} />}
          title={t('homework.noSubmissions')}
          description={t('homework.noSubmissionsMessage')}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.submissionId)}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.primary} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold' },
  info: { flex: 1, gap: 3 },
  name: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  metaText: { fontSize: 11, fontFamily: 'Cairo_500Medium' },
  dot: { fontSize: 11 },
  aiChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  aiChipText: { fontSize: 10, fontFamily: 'Cairo_600SemiBold' },
});

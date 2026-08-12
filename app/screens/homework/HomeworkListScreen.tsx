import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { spacing } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { homeworkApi } from '../../services/api/homework.api';
import type { HomeworkStackParamList } from '../../types/navigation.types';
import {
  HomeworkSubmissionStatus,
  HomeworkType,
  type StudentHomeworkListItem,
  type HomeworkListItem,
} from '../../types/homework.types';

type Props = NativeStackScreenProps<HomeworkStackParamList, 'HomeworkList'>;

const PAGE_SIZE = 20;

export default function HomeworkListScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t, isRTL } = useRTL();
  const { isStudent } = useAuth();
  const [items, setItems] = useState<StudentHomeworkListItem[]>([]);
  const [teacherItems, setTeacherItems] = useState<HomeworkListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(
    async (p = 1, refresh = false) => {
      try {
        setError(null);
        if (p === 1 && !refresh) setLoading(true);
        if (isStudent) {
          const result = await homeworkApi.getMyHomeworkPaged(p, PAGE_SIZE);
          setItems(prev => (p === 1 ? result.items : [...prev, ...result.items]));
          setHasMore(result.items.length >= PAGE_SIZE);
        } else {
          const result = await homeworkApi.getHomeworkPaged(p, PAGE_SIZE);
          setTeacherItems(prev => (p === 1 ? result.items : [...prev, ...result.items]));
          setHasMore(result.items.length >= PAGE_SIZE);
        }
        setPage(p);
      } catch (err: any) {
        setError(err?.userMessage || err?.message || t('homework.failedToLoad'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t, isStudent]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    load(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) load(page + 1);
  };

  const statusMeta = (status?: HomeworkSubmissionStatus | null, grade?: number | null) => {
    switch (status) {
      case HomeworkSubmissionStatus.Graded:
        return {
          label: grade != null ? `${t('homework.graded')} · ${grade}` : t('homework.graded'),
          color: '#34C38F',
          icon: 'ribbon-outline' as const,
        };
      case HomeworkSubmissionStatus.Submitted:
        return { label: t('homework.submitted'), color: '#3B82F6', icon: 'checkmark-circle-outline' as const };
      case HomeworkSubmissionStatus.Draft:
        return { label: t('homework.draft'), color: '#F59E0B', icon: 'create-outline' as const };
      default:
        return { label: t('homework.notStarted'), color: theme.colors.textMuted, icon: 'ellipse-outline' as const };
    }
  };

  const typeIcon = (type: HomeworkType) => {
    if (type === HomeworkType.UploadFiles) return 'cloud-upload-outline';
    if (type === HomeworkType.Mixed) return 'documents-outline';
    return 'document-text-outline';
  };

  const renderCard = ({ item }: { item: StudentHomeworkListItem }) => {
    const sm = statusMeta(item.submissionStatus, item.finalGrade);
    const overdue =
      !item.isAlwaysOpen &&
      item.dueDate != null &&
      new Date(item.dueDate).getTime() < Date.now() &&
      item.submissionStatus !== HomeworkSubmissionStatus.Submitted &&
      item.submissionStatus !== HomeworkSubmissionStatus.Graded;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.card }]}
        onPress={() => navigation.navigate('HomeworkDetail', { homeworkId: item.id })}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, { backgroundColor: theme.colors.primary + '15' }]}>
          <Ionicons name={typeIcon(item.homeworkType) as any} size={18} color={theme.colors.primary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name={sm.icon} size={11} color={sm.color} />
            <Text style={[styles.metaText, { color: sm.color }]}>{sm.label}</Text>
            <Text style={[styles.metaDot, { color: theme.colors.textMuted }]}>·</Text>
            <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>
              {item.totalScore} {t('homework.points')}
            </Text>
            {overdue && (
              <>
                <Text style={[styles.metaDot, { color: theme.colors.textMuted }]}>·</Text>
                <Text style={[styles.metaText, { color: '#EF4444' }]}>{t('homework.overdue')}</Text>
              </>
            )}
          </View>
        </View>
        <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.colors.textMuted} />
      </TouchableOpacity>
    );
  };

  const renderTeacherCard = ({ item }: { item: HomeworkListItem }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.card }]}
      onPress={() =>
        navigation.navigate('HomeworkSubmissions', { homeworkId: item.id, homeworkName: item.name })
      }
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, { backgroundColor: theme.colors.primary + '15' }]}>
        <Ionicons name={typeIcon(item.homeworkType) as any} size={18} color={theme.colors.primary} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons
            name={item.isPublished ? 'checkmark-circle-outline' : 'create-outline'}
            size={11}
            color={item.isPublished ? '#34C38F' : '#F59E0B'}
          />
          <Text style={[styles.metaText, { color: item.isPublished ? '#34C38F' : '#F59E0B' }]}>
            {item.isPublished ? t('homework.published') : t('homework.draft')}
          </Text>
          <Text style={[styles.metaDot, { color: theme.colors.textMuted }]}>·</Text>
          <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>
            {item.totalScore} {t('homework.points')}
          </Text>
          {item.questionsCount > 0 && (
            <>
              <Text style={[styles.metaDot, { color: theme.colors.textMuted }]}>·</Text>
              <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>
                {item.questionsCount} {t('homework.questions')}
              </Text>
            </>
          )}
        </View>
      </View>
      <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );

  const listData: any[] = isStudent ? items : teacherItems;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.colors.card }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('homework.title')}</Text>
      </View>

      {loading && listData.length === 0 ? (
        <Spinner />
      ) : error && listData.length === 0 ? (
        <ErrorRetry message={error} onRetry={() => load()} />
      ) : listData.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="document-text-outline" size={48} color={theme.colors.textMuted} />}
          title={t('homework.noHomework')}
          description={isStudent ? t('homework.noHomeworkMessage') : t('homework.noHomeworkTeacher')}
        />
      ) : (
        <FlatList
          data={listData}
          keyExtractor={item => String(item.id)}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={9}
          renderItem={(isStudent ? renderCard : renderTeacherCard) as any}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontFamily: 'Cairo_700Bold',
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
  name: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_600SemiBold',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 10,
    fontFamily: 'Cairo_500Medium',
  },
  metaDot: {
    fontSize: 10,
  },
});

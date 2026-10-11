import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParentStackParamList } from '../../types/navigation.types';
import type { GuardianExamItem } from '../../types/guardian.types';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { guardianApi } from '../../services/api/guardian.api';
import { selectCurrentChild, useParentStore } from '../../store/parent.store';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { Theme } from '../../theme/themes';
import { formatExamDay, scoreColor } from './parentFormat';
import { useLinkRevoked, usePagedList } from './parentHooks';

type Props = NativeStackScreenProps<ParentStackParamList, 'ParentExams'>;

export default function ParentExamsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t, locale } = useRTL();
  const child = useParentStore(selectCurrentChild);
  const onLinkRevoked = useLinkRevoked();
  const childId = child?.studentId ?? null;

  const fetchPage = useCallback(
    (page: number, size: number) => guardianApi.exams(childId as number, page, size),
    [childId]
  );
  const list = usePagedList<GuardianExamItem>(childId == null ? null : fetchPage, (item) => item.studentExamId, onLinkRevoked);

  const styles = createStyles(theme);

  const renderItem = ({ item }: { item: GuardianExamItem }) => {
    const color = scoreColor(item.percentage, theme.colors);
    const meta = [item.courseName, formatExamDay(item.examDate, locale)].filter(Boolean).join(' · ');
    return (
      <View style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: color + '1F' }]}>
          <Ionicons name="ribbon-outline" size={20} color={color} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>
            {item.examName}
          </Text>
          {!!meta && (
            <Text style={styles.meta} numberOfLines={1}>
              {meta}
            </Text>
          )}
          <Text style={styles.meta}>
            {t('parent.correctAnswers', { correct: item.correctAnswersCount, total: item.numberOfQuestions })}
            {item.attemptNumber > 1 ? ` · ${t('parent.attempt', { count: item.attemptNumber })}` : ''}
          </Text>
        </View>
        <View style={styles.score}>
          <Text style={[styles.scoreText, { color }]}>{`${item.studentScore}/${item.totalMarks}`}</Text>
          <Text style={styles.meta}>{`${Math.round(item.percentage)}%`}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('parent.results')} onBack={() => navigation.goBack()} />
      {list.loading ? (
        <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
      ) : list.failed && list.items.length === 0 ? (
        <ErrorRetry message={t('parent.loadFailed')} onRetry={list.retry} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(item) => String(item.studentExamId)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={list.refreshing}
              onRefresh={list.refresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<EmptyState title={t('parent.noResults')} />}
          ListFooterComponent={list.loadingMore ? <ActivityIndicator color={theme.colors.primary} /> : null}
        />
      )}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loader: {
      marginTop: spacing['3xl'],
    },
    list: {
      padding: spacing.lg,
      paddingBottom: spacing['3xl'],
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: theme.colors.card,
      borderRadius: 20,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: {
      flex: 1,
    },
    name: {
      ...typography.body,
      fontFamily: 'Cairo_600SemiBold',
      color: theme.colors.text,
    },
    meta: {
      ...typography.bodySmall,
      color: theme.colors.textMuted,
    },
    score: {
      alignItems: 'center',
    },
    scoreText: {
      ...typography.body,
      fontFamily: 'Cairo_700Bold',
    },
  });
}

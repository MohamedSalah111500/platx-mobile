import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParentStackParamList } from '../../types/navigation.types';
import type { GuardianHomeworkItem } from '../../types/guardian.types';
import { HomeworkSubmissionStatus, HomeworkType } from '../../types/homework.types';
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
import { formatDay, parseLocalDate } from './parentFormat';
import { useLinkRevoked, usePagedList } from './parentHooks';

type Props = NativeStackScreenProps<ParentStackParamList, 'ParentHomework'>;

const typeIcon = (type: HomeworkType): keyof typeof Ionicons.glyphMap => {
  if (type === HomeworkType.UploadFiles) return 'cloud-upload-outline';
  if (type === HomeworkType.Mixed) return 'documents-outline';
  return 'document-text-outline';
};

export default function ParentHomeworkScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t, locale } = useRTL();
  const child = useParentStore(selectCurrentChild);
  const onLinkRevoked = useLinkRevoked();
  const childId = child?.studentId ?? null;

  const fetchPage = useCallback(
    (page: number, size: number) => guardianApi.homework(childId as number, page, size),
    [childId]
  );
  const list = usePagedList<GuardianHomeworkItem>(childId == null ? null : fetchPage, (item) => item.id, onLinkRevoked);

  const styles = createStyles(theme);

  const statusMeta = (item: GuardianHomeworkItem): { label: string; color: string } => {
    switch (item.submissionStatus) {
      case HomeworkSubmissionStatus.Graded:
        return {
          label: item.finalGrade != null ? t('parent.grade', { grade: item.finalGrade, total: item.totalScore }) : t('homework.graded'),
          color: theme.colors.success,
        };
      case HomeworkSubmissionStatus.Submitted:
        return { label: t('homework.submitted'), color: theme.colors.info };
      case HomeworkSubmissionStatus.Draft:
        return { label: t('homework.draft'), color: theme.colors.warning };
      default:
        return { label: t('homework.notStarted'), color: theme.colors.textMuted };
    }
  };

  const renderItem = ({ item }: { item: GuardianHomeworkItem }) => {
    const status = statusMeta(item);
    const done =
      item.submissionStatus === HomeworkSubmissionStatus.Submitted ||
      item.submissionStatus === HomeworkSubmissionStatus.Graded;
    const overdue =
      !done && !item.isAlwaysOpen && !!item.dueDate && parseLocalDate(item.dueDate).getTime() < Date.now();
    const due = item.isAlwaysOpen || !item.dueDate ? t('parent.alwaysOpen') : t('parent.due', { date: formatDay(item.dueDate, locale) });
    return (
      <View style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: theme.colors.primary + '1F' }]}>
          <Ionicons name={typeIcon(item.homeworkType)} size={20} color={theme.colors.primary} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.meta, overdue && { color: theme.colors.danger }]}>
            {overdue ? `${due} · ${t('homework.overdue')}` : due}
          </Text>
          <View style={[styles.badge, { backgroundColor: status.color + '1F' }]}>
            <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('parent.homework')} onBack={() => navigation.goBack()} />
      {list.loading ? (
        <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
      ) : list.failed && list.items.length === 0 ? (
        <ErrorRetry message={t('parent.loadFailed')} onRetry={list.retry} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(item) => String(item.id)}
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
          ListEmptyComponent={<EmptyState title={t('parent.noHomework')} />}
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
      alignItems: 'flex-start',
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
      gap: spacing.xs,
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
    badge: {
      alignSelf: 'flex-start',
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: 2,
    },
    badgeText: {
      ...typography.bodySmall,
    },
  });
}

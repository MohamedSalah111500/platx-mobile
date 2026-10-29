import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParentStackParamList } from '../../types/navigation.types';
import type { GuardianNotification } from '../../types/guardian.types';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { guardianApi } from '../../services/api/guardian.api';
import { useParentStore } from '../../store/parent.store';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { Theme } from '../../theme/themes';
import { formatDateTime } from './parentFormat';
import { usePagedList } from './parentHooks';

type Props = NativeStackScreenProps<ParentStackParamList, 'ParentNotifications'>;

export default function ParentNotificationsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t, locale } = useRTL();
  const unreadCount = useParentStore((state) => state.unreadCount);
  const setUnreadCount = useParentStore((state) => state.setUnreadCount);
  const fetchUnreadCount = useParentStore((state) => state.fetchUnreadCount);
  const list = usePagedList<GuardianNotification>(guardianApi.notifications, (item) => item.id);
  const { setItems } = list;

  const styles = createStyles(theme);
  const hasUnread = unreadCount > 0 || list.items.some((item) => !item.isRead);

  const markRead = (item: GuardianNotification) => {
    if (item.isRead) return;
    setItems((items) => items.map((existing) => (existing.id === item.id ? { ...existing, isRead: true } : existing)));
    setUnreadCount(useParentStore.getState().unreadCount - 1);
    guardianApi.markRead(item.id).catch(() => fetchUnreadCount());
  };

  const markAllRead = async () => {
    setItems((items) => items.map((existing) => ({ ...existing, isRead: true })));
    setUnreadCount(0);
    try {
      await guardianApi.markAllRead();
    } catch {
      fetchUnreadCount();
    }
  };

  const refresh = () => {
    fetchUnreadCount();
    list.refresh();
  };

  const renderItem = ({ item }: { item: GuardianNotification }) => {
    const unread = !item.isRead;
    return (
      <TouchableOpacity style={styles.card} onPress={() => markRead(item)} activeOpacity={0.7} accessibilityRole="button">
        <View style={[styles.iconCircle, { backgroundColor: unread ? theme.colors.primary : theme.colors.primary + '1F' }]}>
          <Ionicons
            name={unread ? 'notifications' : 'notifications-outline'}
            size={20}
            color={unread ? '#FFFFFF' : theme.colors.primary}
          />
        </View>
        <View style={styles.content}>
          <View style={styles.topRow}>
            {!!item.studentFirstName && (
              <View style={[styles.chip, { backgroundColor: theme.colors.primary + '1F' }]}>
                <Text style={[styles.chipText, { color: theme.colors.primary }]} numberOfLines={1}>
                  {item.studentFirstName}
                </Text>
              </View>
            )}
            <Text style={styles.time}>{formatDateTime(item.createdAt, locale)}</Text>
          </View>
          <Text style={[styles.title, unread && styles.titleUnread]} numberOfLines={2}>
            {item.title}
          </Text>
          {!!item.body && <Text style={styles.body}>{item.body}</Text>}
        </View>
        {unread && <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('parent.notifications')} onBack={() => navigation.goBack()} />
      {hasUnread && !list.loading && (
        <TouchableOpacity style={styles.markAll} onPress={markAllRead} accessibilityRole="button">
          <Ionicons name="checkmark-done-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.markAllText}>{t('notifications.markAllRead')}</Text>
        </TouchableOpacity>
      )}
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
              onRefresh={refresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<EmptyState title={t('parent.noNotifications')} description={t('parent.noNotificationsHint')} />}
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
    markAll: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-end',
      gap: spacing.xs,
      marginHorizontal: spacing.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      backgroundColor: theme.colors.primary + '1F',
    },
    markAllText: {
      ...typography.bodySmall,
      fontFamily: 'Cairo_600SemiBold',
      color: theme.colors.primary,
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
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
      gap: spacing.xs,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    chip: {
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: 2,
      maxWidth: '60%',
    },
    chipText: {
      ...typography.bodySmall,
      fontFamily: 'Cairo_600SemiBold',
    },
    time: {
      ...typography.bodySmall,
      color: theme.colors.textMuted,
    },
    title: {
      ...typography.body,
      fontFamily: 'Cairo_500Medium',
      color: theme.colors.textSecondary,
    },
    titleUnread: {
      fontFamily: 'Cairo_700Bold',
      color: theme.colors.text,
      textAlign: 'left',
    },
    body: {
      ...typography.bodySmall,
      color: theme.colors.textMuted,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginTop: spacing.xs,
    },
  });
}

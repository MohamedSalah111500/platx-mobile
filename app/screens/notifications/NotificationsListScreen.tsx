import React, { useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { useRTL } from '../../i18n/RTLProvider';
import { useNotificationsStore } from '../../store/notifications.store';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { spacing } from '../../theme/spacing';
import { typography, fontSize } from '../../theme/typography';
import type { NotificationItem } from '../../types/notification.types';

const ACCENT = '#7c63fd';
const BG = '#FFFFFF';

export default function NotificationsListScreen() {
  const { theme } = useTheme();
  const { user, role, isStudent } = useAuth();
  const { t } = useRTL();
  const insets = useSafeAreaInsets();
  const {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    fetch,
    loadMore,
    markAsRead,
  } = useNotificationsStore();

  // sanity check student id
  if (isStudent && !user?.studentId) {
    console.warn('[Notifications] student user missing studentId - fetch will use admin endpoint');
  }

  const studentId = isStudent ? user?.studentId : undefined;
  const canFetch = !!user;

  useEffect(() => {
    if (canFetch) fetch(role, 1, undefined, studentId);
  }, [canFetch, role, studentId]);

  const onRefresh = useCallback(() => {
    if (canFetch) fetch(role, 1, undefined, studentId);
  }, [canFetch, role, studentId]);

  const loadingMoreRef = useRef(false);
  const handleEndReached = useCallback(() => {
    if (loadingMoreRef.current || !canFetch) return;
    loadingMoreRef.current = true;
    loadMore(role, studentId).finally(() => {
      loadingMoreRef.current = false;
    });
  }, [canFetch, role, studentId]);

  const handleNotificationPress = async (item: NotificationItem) => {
    if (!item.isReaded) {
      await markAsRead(item.id);
    }
  };

  const bgColor = theme.dark ? theme.colors.background : BG;

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const date = new Date(item.createdDate);
    const timeAgo = getTimeAgo(date, t);
    const isUnread = !item.isReaded;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: theme.colors.card },
          isUnread && styles.unreadCard,
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={[
          styles.iconCircle,
          { backgroundColor: isUnread ? ACCENT : (theme.dark ? theme.colors.surface : '#F0EDFF') },
        ]}>
          <Ionicons
            name={isUnread ? 'notifications' : 'notifications-outline'}
            size={20}
            color={isUnread ? '#fff' : ACCENT}
          />
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <Text
              style={[styles.cardTitle, { color: theme.colors.text }]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>
          <Text
            style={[styles.cardBody, { color: theme.colors.textSecondary }]}
            numberOfLines={2}
          >
            {item.body}
          </Text>
          <Text style={[styles.cardTime, { color: theme.colors.textMuted }]}>
            {timeAgo}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t('notifications.title')}
        </Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          isLoading ? (
            <Spinner />
          ) : (
            <EmptyState
              title={t('notifications.noNotifications')}
              message={t('notifications.allCaughtUp')}
            />
          )
        }
        ListFooterComponent={
          hasMore && notifications.length > 0 ? <Spinner size="small" /> : null
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function getTimeAgo(date: Date, t: (key: string, options?: Record<string, unknown>) => string): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return t('notifications.justNow');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('notifications.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('notifications.hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t('notifications.daysAgo', { count: days });
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    fontWeight: '800',
  },
  badge: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    minWidth: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 120,
  },
  card: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderRadius: 18,
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
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
    marginLeft: spacing.sm,
  },
  cardBody: {
    ...typography.bodySmall,
    marginTop: 4,
    lineHeight: 20,
  },
  cardTime: {
    fontSize: fontSize.xs,
    marginTop: 6,
  },
});

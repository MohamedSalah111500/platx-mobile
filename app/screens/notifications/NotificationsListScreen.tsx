import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { useRTL } from '../../i18n/RTLProvider';
import { useNotificationsStore } from '../../store/notifications.store';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import type { NotificationItem } from '../../types/notification.types';


export default function NotificationsListScreen() {
  const { theme, isDark } = useTheme();
  const { user, role, isStudent } = useAuth();
  const { t, isRTL } = useRTL();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    fetch,
    loadMore,
    markAsRead,
  } = useNotificationsStore();

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

  const handleNotificationPress = useCallback(async (item: NotificationItem) => {
    if (!item.isReaded && isStudent) {
      await markAsRead(item.id);
    }
  }, [isStudent, markAsRead]);

  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  const renderItem = useCallback(({ item }: { item: NotificationItem }) => {
    const date = new Date(item.createdDate);
    const timeAgo = getTimeAgo(date, t);
    const isUnread = !item.isReaded;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        {/* Icon */}
        <View style={[styles.iconCircle, isUnread && styles.iconCircleUnread]}>
          <Ionicons
            name={isUnread ? 'notifications' : 'notifications-outline'}
            size={20}
            color={isUnread ? '#fff' : theme.colors.primary}
          />
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <Text
              style={[styles.cardTitle, isUnread && styles.cardTitleUnread]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={styles.cardTime}>{timeAgo}</Text>
          </View>
          <Text style={styles.cardBody} numberOfLines={2}>
            {item.body}
          </Text>
        </View>

        {/* Unread dot */}
        {isUnread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  }, [styles, theme, t, handleNotificationPress]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7} hitSlop={8}>
            <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={9}
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
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

function getTimeAgo(
  date: Date,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
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

function createStyles(theme: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    backBtn: {
      width: 34,
      height: 34,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginStart: -6,
    },
    headerTitle: {
      fontSize: 28,
      fontFamily: 'Cairo_700Bold',
      color: theme.colors.text,
    },
    badge: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      minWidth: 26,
      height: 26,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    badgeText: {
      color: '#fff',
      fontSize: 12,
      fontFamily: 'Cairo_700Bold',
    },
    listContent: {
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 120,
    },
    separator: {
      height: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      marginStart: 68,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 14,
      paddingHorizontal: 4,
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? theme.colors.primary + '26' : theme.colors.primaryLight,
      marginEnd: 12,
    },
    iconCircleUnread: {
      backgroundColor: theme.colors.primary,
    },
    cardContent: {
      flex: 1,
      paddingTop: 2,
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    cardTitle: {
      fontSize: 15,
      fontFamily: 'Cairo_500Medium',
      color: theme.colors.textSecondary,
      flex: 1,
      marginEnd: 8,
    },
    cardTitleUnread: {
      fontFamily: 'Cairo_700Bold',
      color: theme.colors.text,
    },
    cardBody: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textMuted,
    },
    cardTime: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.primary,
      marginTop: 18,
      marginStart: 4,
    },
  });
}

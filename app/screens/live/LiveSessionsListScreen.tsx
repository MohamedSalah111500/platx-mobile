import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { useRTL } from '../../i18n/RTLProvider';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { liveApi } from '../../services/api/live.api';
import type { ProfileStackParamList } from '../../types/navigation.types';
import { type LiveSession, LiveClassroomType } from '../../types/live.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'LiveSessions'>;

export default function LiveSessionsListScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { user, can, isStudent } = useAuth();
  const { t, isRTL } = useRTL();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const loadSessions = async () => {
    try {
      setError(null);
      const data = await liveApi.getActive();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const msg = err?.userMessage || err?.message || 'Failed to load sessions.';
      setError(msg);
      setSessions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadSessions();
    }, []),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSessions();
  }, []);

  const [joiningId, setJoiningId] = useState<number | null>(null);

  const openExternal = async (session: LiveSession) => {
    setJoiningId(session.id);
    try {
      // Prefer the gated endpoint (handles approval); fall back to the inline link.
      let link = session.externalLink || '';
      try {
        const fetched = await liveApi.getExternalLink(session.id);
        if (fetched) link = fetched;
      } catch {
        if (!link) {
          Alert.alert(t('live.title'), t('live.approvalRequired'));
          return;
        }
      }
      if (link) {
        const ok = await Linking.canOpenURL(link);
        if (ok) await Linking.openURL(link);
        else Alert.alert(t('common.error'), t('live.cannotOpenLink'));
      } else {
        Alert.alert(t('live.title'), t('live.approvalRequired'));
      }
    } finally {
      setJoiningId(null);
    }
  };

  const handleJoin = (session: LiveSession) => {
    if (session.liveType === LiveClassroomType.External) {
      openExternal(session);
      return;
    }
    // Internal (Agora): LiveClassroom is registered at the RootStack level.
    navigation.dispatch(
      CommonActions.navigate({
        name: 'LiveClassroom',
        params: {
          roomId: session.id,
          isTeacher: !isStudent,
        },
      }),
    );
  };

  const renderSession = ({ item }: { item: LiveSession }) => (
    <View style={styles.sessionCard}>
      <View style={styles.sessionHeader}>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{t('live.live')}</Text>
        </View>
        {(item.participantCount ?? item.participantsCount) != null && (
          <Text style={styles.participants}>
            {item.participantCount ?? item.participantsCount} {t('live.joined')}
          </Text>
        )}
      </View>

      <Text style={styles.sessionTitle}>{item.liveName || item.title || 'Untitled'}</Text>
      {item.teacherName && (
        <Text style={styles.sessionTeacher}>{t('common.by')} {item.teacherName}</Text>
      )}
      <View style={styles.badgeRow}>
        {item.liveType === LiveClassroomType.External && (
          <View style={[styles.typeBadge, { backgroundColor: theme.colors.primary + '15' }]}>
            <Ionicons name="videocam-outline" size={12} color={theme.colors.primary} />
            <Text style={[styles.typeBadgeText, { color: theme.colors.primary }]}>{t('live.externalMeeting')}</Text>
          </View>
        )}
        {item.groupName && (
          <Badge text={item.groupName} color={theme.colors.info} />
        )}
      </View>

      <View style={styles.sessionFooter}>
        {item.liveType === LiveClassroomType.External && item.scheduledAt ? (
          <Text style={styles.sessionTime}>
            {new Date(item.scheduledAt).toLocaleString('en', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        ) : item.startedAt ? (
          <Text style={styles.sessionTime}>
            {t('live.started')} {new Date(item.startedAt).toLocaleTimeString('en', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        ) : <View />}
        <Button
          title={item.liveType === LiveClassroomType.External ? t('live.openLink') : t('live.join')}
          onPress={() => handleJoin(item)}
          loading={joiningId === item.id}
          size="small"
          variant="primary"
        />
      </View>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    sessionCard: {
      marginHorizontal: spacing.xl,
      marginBottom: spacing.md,
      padding: spacing.lg,
      backgroundColor: theme.colors.card,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    sessionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    liveIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.danger + '15',
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: borderRadius.full,
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.danger,
      marginRight: spacing.xs,
    },
    liveText: {
      ...typography.caption,
      color: theme.colors.danger,
      fontFamily: 'Cairo_700Bold',
    },
    participants: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
    sessionTitle: {
      ...typography.h4,
      color: theme.colors.text,
    },
    sessionTeacher: {
      ...typography.bodySmall,
      color: theme.colors.textSecondary,
      marginTop: spacing.xs,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.sm,
      flexWrap: 'wrap',
    },
    typeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: borderRadius.full,
    },
    typeBadgeText: {
      ...typography.caption,
      fontFamily: 'Cairo_600SemiBold',
    },
    sessionFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.lg,
    },
    sessionTime: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
  });

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('live.title')}
        onBack={() => navigation.goBack()}
        rightElement={
          can('LIVE_CREATE') ? (
            <Button
              title={t('live.create')}
              onPress={() => navigation.navigate('CreateLive')}
              size="small"
              variant="primary"
            />
          ) : undefined
        }
      />

      <FlatList
        data={sessions}
        renderItem={renderSession}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          loading ? (
            <Spinner />
          ) : error ? (
            <ErrorRetry message={error} onRetry={loadSessions} />
          ) : (
            <EmptyState
              title={t('live.noLiveSessions')}
              message={t('live.noActiveSessionsMessage')}
            />
          )
        }
        contentContainerStyle={{ paddingBottom: spacing['3xl'] }}
      />
    </View>
  );
}

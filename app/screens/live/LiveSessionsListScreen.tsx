import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
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
import type { LiveSession } from '../../types/live.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'LiveSessions'>;

export default function LiveSessionsListScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { user, can, isStudent } = useAuth();
  const { t } = useRTL();
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

  useEffect(() => {
    loadSessions();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSessions();
  }, []);

  const handleJoin = (session: LiveSession) => {
    // LiveClassroom is registered at the RootStack level, not in ProfileStack.
    // Use CommonActions.navigate + dispatch to reliably reach it from nested navigators.
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
      {item.groupName && (
        <Badge
          text={item.groupName}
          color={theme.colors.info}
          style={{ marginTop: spacing.sm }}
        />
      )}

      <View style={styles.sessionFooter}>
        {item.startedAt && (
          <Text style={styles.sessionTime}>
            {t('live.started')} {new Date(item.startedAt).toLocaleTimeString('en', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        )}
        <Button
          title={t('live.join')}
          onPress={() => handleJoin(item)}
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: { marginRight: spacing.md },
    backText: { ...typography.h4, color: theme.colors.text },
    headerTitle: { ...typography.h4, color: theme.colors.text },
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
      fontWeight: '700',
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('live.title')}</Text>
        </View>
        {can('LIVE_CREATE') && (
          <Button
            title={t('live.create')}
            onPress={() => navigation.navigate('CreateLive')}
            size="small"
            variant="primary"
          />
        )}
      </View>

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
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing['3xl'] }}>
              <Ionicons name="alert-circle-outline" size={48} color={theme.colors.danger} />
              <Text style={{ ...typography.body, color: theme.colors.danger, textAlign: 'center', marginTop: spacing.md, marginBottom: spacing.lg }}>{error}</Text>
              <TouchableOpacity
                style={{ backgroundColor: theme.colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.lg }}
                onPress={() => { setLoading(true); loadSessions(); }}
              >
                <Text style={{ ...typography.button, color: '#fff' }}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <EmptyState
              title={t('live.noLiveSessions')}
              message={t('live.noActiveSessionsMessage')}
            />
          )
        }
        contentContainerStyle={{ paddingBottom: spacing['3xl'] }}
      />
    </SafeAreaView>
  );
}

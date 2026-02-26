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
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useAuth } from '../../hooks/useAuth';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { groupsApi } from '../../services/api/groups.api';
import type { ProfileStackParamList } from '../../types/navigation.types';
import type { Group } from '../../types/group.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Groups'>;

export default function GroupsListScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { user, isStudent } = useAuth();
  const { t } = useRTL();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGroups = async () => {
    try {
      setError(null);
      if (isStudent && user?.studentId) {
        // Student: get their group IDs using numeric studentId, then fetch each group's details
        console.log('[Groups] Fetching groups for studentId:', user.studentId);
        const res = await groupsApi.getStudentGroups(user.studentId);
        const groupIds = Array.isArray(res?.groupIds) ? res.groupIds : [];
        if (groupIds.length === 0) {
          setGroups([]);
        } else {
          // Fetch details for each group
          const groupPromises = groupIds.map((id) =>
            groupsApi.getGroup(id).catch(() => null)
          );
          const results = await Promise.all(groupPromises);
          setGroups(results.filter((g): g is Group => g != null));
        }
      } else {
        // Staff/Admin: use paginated getAll
        const res = await groupsApi.getAll(1, 50);
        const items = Array.isArray(res?.items) ? res.items : [];
        setGroups(items);
      }
    } catch (err: any) {
      const msg = err?.userMessage || err?.message || 'Failed to load groups.';
      setError(msg);
      setGroups([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadGroups();
  }, []);

  const renderItem = ({ item }: { item: Group }) => (
    <TouchableOpacity
      style={styles.groupCard}
      onPress={() => navigation.navigate('GroupDetail', { groupId: item.id })}
    >
      <View style={styles.groupIcon}>
        <Ionicons name="people" size={24} color={theme.colors.primary} />
      </View>
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{item.name}</Text>
        {item.gradeName ? (
          <Text style={styles.groupGrade}>{item.gradeName}</Text>
        ) : null}
        <View style={styles.groupStats}>
          {item.studentsCount != null && (
            <View style={styles.statItem}>
              <Ionicons name="school-outline" size={12} color={theme.colors.textMuted} style={{ marginRight: 2 }} />
              <Text style={styles.groupMembers}>{item.studentsCount} {t('groups.students')}</Text>
            </View>
          )}
          {item.nextDueDate ? (
            <View style={styles.statItem}>
              <Ionicons name="calendar-outline" size={12} color={theme.colors.textMuted} style={{ marginRight: 2 }} />
              <Text style={styles.groupMembers}>{item.nextDueDate}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
    },
    backButton: {
      marginRight: spacing.md,
    },
    headerTitle: {
      ...typography.h4,
      color: theme.colors.text,
    },
    groupCard: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: spacing.xl,
      marginBottom: spacing.sm,
      padding: spacing.lg,
      backgroundColor: theme.colors.card,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    groupIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    groupInfo: {
      flex: 1,
    },
    groupName: {
      ...typography.body,
      color: theme.colors.text,
      fontWeight: '600',
    },
    groupGrade: {
      ...typography.caption,
      color: theme.colors.primary,
      marginTop: 2,
    },
    groupStats: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: 4,
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    groupMembers: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing['3xl'],
    },
    errorText: {
      ...typography.body,
      color: theme.colors.danger,
      textAlign: 'center',
      marginTop: spacing.md,
      marginBottom: spacing.lg,
    },
    retryButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
    },
    retryText: { ...typography.button, color: '#fff' },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isStudent ? t('groups.myGroups') : t('groups.title')}</Text>
      </View>

      <FlatList
        data={groups}
        renderItem={renderItem}
        keyExtractor={(item, idx) => item?.id != null ? item.id.toString() : `group-${idx}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          loading ? (
            <Spinner />
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color={theme.colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); loadGroups(); }}>
                <Text style={styles.retryText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <EmptyState title={t('groups.noGroups')} message={t('groups.notAssigned')} />
          )
        }
        contentContainerStyle={{ paddingBottom: spacing['3xl'] }}
      />
    </SafeAreaView>
  );
}

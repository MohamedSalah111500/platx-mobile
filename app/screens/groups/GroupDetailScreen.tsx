import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { Spinner } from '../../components/ui/Spinner';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { groupsApi } from '../../services/api/groups.api';
import type { ProfileStackParamList } from '../../types/navigation.types';
import type { Group, GroupMember } from '../../types/group.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'GroupDetail'>;

export default function GroupDetailScreen({ navigation, route }: Props) {
  const { groupId } = route.params;
  const { theme } = useTheme();
  const { t } = useRTL();
  const [group, setGroup] = useState<Group | null>(null);
  const [students, setStudents] = useState<GroupMember[]>([]);
  const [staff, setStaff] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroupData();
  }, [groupId]);

  const loadGroupData = async () => {
    try {
      const [groupData, studentsData, staffData] = await Promise.all([
        groupsApi.getGroup(groupId),
        groupsApi.getGroupStudents(groupId),
        groupsApi.getGroupStaff(groupId).catch(() => []),
      ]);
      console.log('[GroupDetail] Loaded group:', groupData);
      setGroup(groupData || null);
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setStaff(Array.isArray(staffData) ? staffData : []);
    } catch (err) {
      console.error('[GroupDetail] Load failed:', err);
      setGroup(null);
      setStudents([]);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

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
    backButton: { marginRight: spacing.md },
    backText: { ...typography.h4, color: theme.colors.text },
    headerTitle: { ...typography.h4, color: theme.colors.text },
    content: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing['3xl'],
    },
    groupHeader: {
      backgroundColor: theme.colors.primaryLight,
      borderRadius: borderRadius['2xl'],
      padding: spacing.xl,
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    groupName: { ...typography.h3, color: theme.colors.text },
    groupGrade: {
      ...typography.body,
      color: theme.colors.primary,
      marginTop: spacing.xs,
    },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.lg,
      marginTop: spacing.lg,
    },
    stat: { alignItems: 'center' },
    statValue: { ...typography.h4, color: theme.colors.text },
    statLabel: { ...typography.caption, color: theme.colors.textMuted },
    sectionTitle: {
      ...typography.h4,
      color: theme.colors.text,
      marginBottom: spacing.md,
    },
    memberCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      backgroundColor: theme.colors.card,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    memberAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    memberAvatarText: { ...typography.bodySmall, color: theme.colors.primary, fontWeight: '600' },
    memberName: { ...typography.body, color: theme.colors.text },
    memberEmail: { ...typography.caption, color: theme.colors.textMuted },
    emptyCard: {
      padding: spacing.lg,
      backgroundColor: theme.colors.card,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center' as const,
      marginBottom: spacing.sm,
    },
    emptyText: { ...typography.body, color: theme.colors.textMuted },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('groups.group')}</Text>
        </View>
        <Spinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('groups.groupDetails')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupName}>{group?.name}</Text>
          {group?.gradeName && (
            <Text style={styles.groupGrade}>{group.gradeName}</Text>
          )}
          {group?.description ? (
            <Text style={{ marginTop: spacing.sm, color: theme.colors.textSecondary }}>{group.description}</Text>
          ) : null}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{students.length}</Text>
              <Text style={styles.statLabel}>{t('groups.students')}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{staff.length || group?.staffCount || 0}</Text>
              <Text style={styles.statLabel}>{t('groups.staff')}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{group?.studentsCount ?? students.length}</Text>
              <Text style={styles.statLabel}>{t('groups.registered')}</Text>
            </View>
          </View>
          {/* Dates */}
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
            {group?.nextDueDate ? (
              <Text style={{ ...typography.caption, color: theme.colors.textMuted }}>{group.nextDueDate} {group.nextDueTime ?? ''}</Text>
            ) : null}
            {group?.createdAt ? (
              <Text style={{ ...typography.caption, color: theme.colors.textMuted }}>{group.createdAt}</Text>
            ) : null}
          </View>
        </View>

        {/* Members */}
        <Text style={styles.sectionTitle}>{t('groups.members')}</Text>
        {[...staff, ...students].length > 0 ? (
          [...staff.map(m => ({ ...m, _isStaff: true })), ...students].map((member: any) => {
            const initials = `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase();
            return (
              <View key={`${member._isStaff ? 'staff' : 'student'}-${member.id}`} style={styles.memberCard}>
                <View style={styles.memberAvatar}>
                  {member.profileImage ? (
                    <Image source={{ uri: member.profileImage }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                  ) : (
                    <Text style={styles.memberAvatarText}>{initials}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>
                    {member.firstName} {member.lastName}
                  </Text>
                  {member.email && (
                    <Text style={styles.memberEmail}>{member.email}</Text>
                  )}
                  {member.phoneNumber && (
                    <Text style={[styles.memberEmail, { marginTop: 2 }]}>{member.phoneNumber}</Text>
                  )}
                  {(member.role || member._isStaff) && (
                    <Text style={[styles.memberEmail, { marginTop: 2 }]}>
                      {member.role || t('groups.staff')}
                    </Text>
                  )}
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t('groups.noMembers')}</Text>
          </View>
        )}

        {/* Files */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>{t('groups.files')}</Text>
        {Array.isArray((group as any).files) && (group as any).files.length > 0 ? (
          (group as any).files.map((f: any) => (
            <View key={f.id || f.name} style={[styles.memberCard, { justifyContent: 'space-between' }]}>
              <Text style={styles.memberName}>{f.name || f.title}</Text>
              <Text style={styles.memberEmail}>{f.size ? `${f.size} KB` : ''}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t('groups.noFiles')}</Text>
          </View>
        )}

        {/* Conversations */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>{t('groups.chats')}</Text>
        {Array.isArray((group as any).messages) && (group as any).messages.length > 0 ? (
          (group as any).messages.map((m: any) => (
            <View key={m.id} style={[styles.memberCard, { flexDirection: 'column', alignItems: 'flex-start' }]}>
              <Text style={[styles.memberName, { fontWeight: '700' }]}>{m.senderName || m.sender}</Text>
              <Text style={[styles.memberEmail, { marginTop: 4 }]}>{m.text || m.message}</Text>
              {m.createdAt && (
                <Text style={[styles.memberEmail, { marginTop: 6 }]}>{new Date(m.createdAt).toLocaleString()}</Text>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t('groups.noMessages')}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

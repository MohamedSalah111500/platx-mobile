import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { useRTL } from '../../i18n/RTLProvider';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { liveApi } from '../../services/api/live.api';
import { groupsApi } from '../../services/api/groups.api';
import type { ProfileStackParamList } from '../../types/navigation.types';
import type { Group } from '../../types/group.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'CreateLive'>;

export default function CreateLiveScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { t } = useRTL();
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const res = await groupsApi.getAll(1, 50);
      const items = Array.isArray(res?.items) ? res.items : [];
      setGroups(items);
    } catch {
      // Groups are optional, don't block the form
      setGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert(t('common.validation'), t('live.enterSessionTitle'));
      return;
    }

    setSubmitting(true);
    try {
      const payload: { liveName: string; groupId?: number } = {
        liveName: title.trim(),
      };
      if (selectedGroupId) {
        payload.groupId = selectedGroupId;
      }
      await liveApi.create(payload as any);
      Alert.alert(t('common.success'), t('live.sessionCreatedSuccess'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      const msg = err?.userMessage || err?.response?.data?.message || t('live.createSessionFailed');
      Alert.alert(t('common.error'), msg);
    } finally {
      setSubmitting(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
    },
    backButton: { marginRight: spacing.md },
    headerTitle: { ...typography.h4, color: theme.colors.text },
    content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
    label: {
      ...typography.bodySmall,
      color: theme.colors.textSecondary,
      marginBottom: spacing.xs,
      fontWeight: '600',
    },
    groupsSection: { marginTop: spacing.md },
    groupOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      marginBottom: spacing.sm,
    },
    groupOptionText: { ...typography.body, flex: 1, marginLeft: spacing.md },
    footer: { paddingHorizontal: spacing.xl, paddingVertical: spacing.xl },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('live.createLiveSession')}</Text>
      </View>

      <ScrollView>
        <View style={styles.content}>
          <Text style={styles.label}>{t('live.sessionTitle')}</Text>
          <Input
            value={title}
            onChangeText={setTitle}
            placeholder={t('live.enterSessionTitlePlaceholder')}
          />

          <View style={styles.groupsSection}>
            <Text style={styles.label}>{t('live.selectGroupOptional')}</Text>
            {loadingGroups ? (
              <Text style={{ ...typography.caption, color: theme.colors.textMuted }}>{t('live.loadingGroups')}</Text>
            ) : groups.length === 0 ? (
              <Text style={{ ...typography.caption, color: theme.colors.textMuted }}>{t('live.noGroupsAvailable')}</Text>
            ) : (
              groups.map((group) => {
                const isSelected = selectedGroupId === group.id;
                return (
                  <TouchableOpacity
                    key={group.id}
                    style={[
                      styles.groupOption,
                      {
                        backgroundColor: isSelected ? theme.colors.primary + '10' : 'transparent',
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => setSelectedGroupId(isSelected ? null : group.id)}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={isSelected ? theme.colors.primary : theme.colors.textMuted}
                    />
                    <Text style={[styles.groupOptionText, { color: theme.colors.text }]}>
                      {group.name}
                    </Text>
                    {group.studentsCount != null && (
                      <Text style={{ ...typography.caption, color: theme.colors.textMuted }}>
                        {group.studentsCount} {t('live.students')}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={t('live.startLiveSession')}
          onPress={handleCreate}
          loading={submitting}
          fullWidth
          size="large"
        />
      </View>
    </SafeAreaView>
  );
}

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
import { subGroupsApi } from '../../services/api/subgroups.api';
import type { ProfileStackParamList } from '../../types/navigation.types';
import type { Group, SubGroup } from '../../types/group.types';
import { LiveClassroomType } from '../../types/live.types';
import type { CreateLivePayload } from '../../types/live.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'CreateLive'>;

// Preset scheduling offsets (minutes from now) for External sessions.
const SCHEDULE_PRESETS = [0, 30, 60, 24 * 60];

export default function CreateLiveScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { t, isRTL } = useRTL();
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [selectedSubGroupIds, setSelectedSubGroupIds] = useState<number[]>([]);
  const [expandedGroupIds, setExpandedGroupIds] = useState<number[]>([]);
  const [subGroupsByGroup, setSubGroupsByGroup] = useState<Record<number, SubGroup[]>>({});
  const [loadingSubGroupsFor, setLoadingSubGroupsFor] = useState<number | null>(null);
  const [liveType, setLiveType] = useState<LiveClassroomType>(LiveClassroomType.Internal);
  const [externalLink, setExternalLink] = useState('');
  const [scheduleOffset, setScheduleOffset] = useState(0);
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState('');

  const isExternal = liveType === LiveClassroomType.External;

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

  const toggleGroupExpanded = async (groupId: number) => {
    setExpandedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
    if (!subGroupsByGroup[groupId]) {
      setLoadingSubGroupsFor(groupId);
      try {
        const res = await subGroupsApi.getByGroup(groupId);
        setSubGroupsByGroup((prev) => ({ ...prev, [groupId]: res.items || [] }));
      } catch {
        setSubGroupsByGroup((prev) => ({ ...prev, [groupId]: [] }));
      } finally {
        setLoadingSubGroupsFor(null);
      }
    }
  };

  const toggleGroupSelected = (groupId: number) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const toggleSubGroupSelected = (subGroupId: number) => {
    setSelectedSubGroupIds((prev) =>
      prev.includes(subGroupId) ? prev.filter((id) => id !== subGroupId) : [...prev, subGroupId]
    );
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert(t('common.validation'), t('live.enterSessionTitle'));
      return;
    }
    if (isExternal) {
      const link = externalLink.trim();
      if (!link || !/^https?:\/\//i.test(link)) {
        Alert.alert(t('common.validation'), t('live.enterValidLink'));
        return;
      }
    }
    if (isPaid && (!price.trim() || Number(price) <= 0)) {
      Alert.alert(t('common.validation'), t('live.enterPrice'));
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateLivePayload = {
        liveName: title.trim(),
        liveType,
        isPaid,
        price: isPaid ? Number(price) : null,
        sendToAll,
        groupIds: sendToAll ? [] : selectedGroupIds,
        subGroupIds: sendToAll ? [] : selectedSubGroupIds,
      };
      if (isExternal) {
        payload.externalLink = externalLink.trim();
        payload.scheduledAt = new Date(Date.now() + scheduleOffset * 60 * 1000).toISOString();
      }
      await liveApi.create(payload);
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

  const presetLabel = (mins: number) => {
    if (mins === 0) return t('live.now');
    if (mins < 60) return t('live.inMinutes', { n: mins });
    if (mins < 24 * 60) return t('live.inHours', { n: mins / 60 });
    return t('live.tomorrow');
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
      fontFamily: 'Cairo_600SemiBold',
    },
    typeRow: { flexDirection: 'row', gap: spacing.md },
    typeCard: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1.5,
    },
    typeText: { ...typography.body, fontFamily: 'Cairo_600SemiBold' },
    presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    presetChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      borderWidth: 1,
    },
    presetText: { ...typography.caption, fontFamily: 'Cairo_600SemiBold' },
    groupsSection: { marginTop: spacing.md },
    groupOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      marginBottom: spacing.sm,
    },
    groupOptionMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    expandBtn: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    subGroupList: {
      marginTop: spacing.xs,
      marginLeft: spacing.xl,
      gap: spacing.xs,
    },
    subGroupOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.sm,
      borderRadius: borderRadius.md,
      borderWidth: 1,
    },
    groupOptionText: { ...typography.body, flex: 1, marginLeft: spacing.md },
    footer: { paddingHorizontal: spacing.xl, paddingVertical: spacing.xl },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={24} color={theme.colors.text} />
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

          {/* Session type: in-app (Agora) vs external link (Zoom/Meet) */}
          <Text style={[styles.label, { marginTop: spacing.lg }]}>{t('live.sessionType')}</Text>
          <View style={styles.typeRow}>
            {[
              { type: LiveClassroomType.Internal, icon: 'videocam', label: t('live.typeInApp') },
              { type: LiveClassroomType.External, icon: 'link', label: t('live.typeExternal') },
            ].map((opt) => {
              const active = liveType === opt.type;
              return (
                <TouchableOpacity
                  key={opt.type}
                  style={[
                    styles.typeCard,
                    {
                      backgroundColor: active ? theme.colors.primary + '12' : theme.colors.card,
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setLiveType(opt.type)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={opt.icon as any} size={20} color={active ? theme.colors.primary : theme.colors.textMuted} />
                  <Text style={[styles.typeText, { color: active ? theme.colors.primary : theme.colors.text }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {isExternal && (
            <View style={{ marginTop: spacing.lg }}>
              <Text style={styles.label}>{t('live.meetingLink')}</Text>
              <Input
                value={externalLink}
                onChangeText={setExternalLink}
                placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                autoCapitalize="none"
                keyboardType="url"
              />
              <Text style={[styles.label, { marginTop: spacing.lg }]}>{t('live.scheduledTime')}</Text>
              <View style={styles.presetRow}>
                {SCHEDULE_PRESETS.map((mins) => {
                  const active = scheduleOffset === mins;
                  return (
                    <TouchableOpacity
                      key={mins}
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: active ? theme.colors.primary : theme.colors.card,
                          borderColor: active ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                      onPress={() => setScheduleOffset(mins)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.presetText, { color: active ? '#fff' : theme.colors.text }]}>
                        {presetLabel(mins)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <Text style={[styles.label, { marginTop: spacing.lg }]}>{t('live.sessionAccess')}</Text>
          <View style={styles.typeRow}>
            {[
              { paid: false, icon: 'gift-outline', label: t('live.free') },
              { paid: true, icon: 'cash-outline', label: t('live.paid') },
            ].map((opt) => {
              const active = isPaid === opt.paid;
              return (
                <TouchableOpacity
                  key={String(opt.paid)}
                  style={[
                    styles.typeCard,
                    {
                      backgroundColor: active ? theme.colors.primary + '12' : theme.colors.card,
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setIsPaid(opt.paid)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={opt.icon as any} size={20} color={active ? theme.colors.primary : theme.colors.textMuted} />
                  <Text style={[styles.typeText, { color: active ? theme.colors.primary : theme.colors.text }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {isPaid && (
            <View style={{ marginTop: spacing.lg }}>
              <Text style={styles.label}>{t('live.price')}</Text>
              <Input
                value={price}
                onChangeText={setPrice}
                placeholder={t('live.enterPricePlaceholder')}
                keyboardType="numeric"
              />
            </View>
          )}

          <View style={styles.groupsSection}>
            <Text style={styles.label}>{t('live.audience')}</Text>
            <View style={styles.typeRow}>
              {[
                { value: true, icon: 'globe-outline', label: t('live.sendToEveryone') },
                { value: false, icon: 'people-outline', label: t('live.sendToSpecific') },
              ].map((opt) => {
                const active = sendToAll === opt.value;
                return (
                  <TouchableOpacity
                    key={String(opt.value)}
                    style={[
                      styles.typeCard,
                      {
                        backgroundColor: active ? theme.colors.primary + '12' : theme.colors.card,
                        borderColor: active ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => setSendToAll(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={opt.icon as any} size={20} color={active ? theme.colors.primary : theme.colors.textMuted} />
                    <Text style={[styles.typeText, { color: active ? theme.colors.primary : theme.colors.text }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {!sendToAll && (
              <View style={{ marginTop: spacing.lg }}>
                {loadingGroups ? (
                  <Text style={{ ...typography.caption, color: theme.colors.textMuted }}>{t('live.loadingGroups')}</Text>
                ) : groups.length === 0 ? (
                  <Text style={{ ...typography.caption, color: theme.colors.textMuted }}>{t('live.noGroupsAvailable')}</Text>
                ) : (
                  groups.map((group) => {
                    const isGroupSelected = selectedGroupIds.includes(group.id);
                    const isExpanded = expandedGroupIds.includes(group.id);
                    const subGroups = subGroupsByGroup[group.id];
                    return (
                      <View key={group.id} style={{ marginBottom: spacing.sm }}>
                        <View
                          style={[
                            styles.groupOption,
                            {
                              backgroundColor: isGroupSelected ? theme.colors.primary + '10' : 'transparent',
                              borderColor: isGroupSelected ? theme.colors.primary : theme.colors.border,
                              marginBottom: 0,
                            },
                          ]}
                        >
                          <TouchableOpacity
                            style={styles.groupOptionMain}
                            onPress={() => toggleGroupSelected(group.id)}
                          >
                            <Ionicons
                              name={isGroupSelected ? 'checkbox' : 'square-outline'}
                              size={20}
                              color={isGroupSelected ? theme.colors.primary : theme.colors.textMuted}
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
                          <TouchableOpacity
                            style={styles.expandBtn}
                            onPress={() => toggleGroupExpanded(group.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons
                              name={isExpanded ? 'chevron-up' : 'chevron-down'}
                              size={18}
                              color={theme.colors.textMuted}
                            />
                          </TouchableOpacity>
                        </View>

                        {isExpanded && (
                          <View style={styles.subGroupList}>
                            {loadingSubGroupsFor === group.id ? (
                              <Text style={{ ...typography.caption, color: theme.colors.textMuted, padding: spacing.sm }}>
                                {t('live.loadingGroups')}
                              </Text>
                            ) : !subGroups || subGroups.length === 0 ? (
                              <Text style={{ ...typography.caption, color: theme.colors.textMuted, padding: spacing.sm }}>
                                {t('live.noSubGroups')}
                              </Text>
                            ) : (
                              subGroups.map((sg) => {
                                const isSubSelected = selectedSubGroupIds.includes(sg.id);
                                return (
                                  <TouchableOpacity
                                    key={sg.id}
                                    style={[
                                      styles.subGroupOption,
                                      {
                                        backgroundColor: isSubSelected ? theme.colors.primary + '10' : 'transparent',
                                        borderColor: isSubSelected ? theme.colors.primary : theme.colors.border,
                                      },
                                    ]}
                                    onPress={() => toggleSubGroupSelected(sg.id)}
                                  >
                                    <Ionicons
                                      name={isSubSelected ? 'checkbox' : 'square-outline'}
                                      size={18}
                                      color={isSubSelected ? theme.colors.primary : theme.colors.textMuted}
                                    />
                                    <Ionicons name="git-branch-outline" size={14} color={theme.colors.textMuted} />
                                    <Text style={[styles.groupOptionText, { color: theme.colors.text, fontSize: 13 }]}>
                                      {sg.name}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
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

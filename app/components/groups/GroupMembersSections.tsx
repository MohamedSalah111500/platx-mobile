import React, { useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { Avatar } from '../ui/Avatar';
import { SearchPickerSheet } from '../ui/SearchPickerSheet';
import { spacing } from '../../theme/spacing';
import { fontSize, buttonLineHeight } from '../../theme/typography';
import { groupsApi } from '../../services/api/groups.api';
import { staffApi } from '../../services/api/staff.api';
import { libraryApi } from '../../services/api/library.api';
import { getFullImageUrl } from '../../utils/imageUrl';
import { fullName } from '../../utils/personName';
import type { GroupFile, GroupMember } from '../../types/group.types';

function SectionTitle({ title, count, onAdd, addLabel }: { title: string; count: number; onAdd?: () => void; addLabel?: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.titleRow}>
      <Text style={[styles.title, { color: theme.colors.textMuted }]}>
        {title} ({count})
      </Text>
      {onAdd ? (
        <TouchableOpacity
          onPress={onAdd}
          style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel={addLabel}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

interface StaffSectionProps {
  groupId: number;
  staff: GroupMember[];
  canManage: boolean;
  onChanged: () => void;
}

export function GroupStaffSection({ groupId, staff, canManage, onChanged }: StaffSectionProps) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const [picking, setPicking] = useState(false);
  const [options, setOptions] = useState<{ id: number; label: string; hint?: string | null }[]>([]);

  const openAdd = async () => {
    try {
      const all = await staffApi.getAll();
      setOptions(all.items.map((s) => ({ id: s.id, label: fullName(s), hint: s.jobTitleName || s.email })));
      setPicking(true);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('groupManage.loadFailed'));
    }
  };

  const add = async (ids: number[]) => {
    try {
      await groupsApi.addStaff(groupId, ids[0]);
      setPicking(false);
      onChanged();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('groupManage.saveFailed'));
    }
  };

  const confirmRemove = (member: GroupMember) =>
    Alert.alert(t('groupManage.staff.removeTitle'), t('groupManage.staff.removeConfirm', { name: fullName(member) }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('groups.remove'),
        style: 'destructive',
        onPress: async () => {
          try {
            await groupsApi.removeStaff(groupId, member.id);
            onChanged();
          } catch (err: any) {
            Alert.alert(t('common.error'), err?.userMessage || t('groupManage.saveFailed'));
          }
        },
      },
    ]);

  return (
    <View style={styles.section}>
      <SectionTitle
        title={t('groups.staff')}
        count={staff.length}
        onAdd={canManage ? openAdd : undefined}
        addLabel={t('groupManage.staff.add')}
      />
      {staff.length === 0 ? (
        <Text style={[styles.empty, { color: theme.colors.textMuted }]}>{t('groupManage.staff.empty')}</Text>
      ) : (
        staff.map((member) => {
          const name = fullName(member);
          const image = getFullImageUrl(member.profileImage);
          return (
            <View key={member.id} style={[styles.row, { backgroundColor: theme.colors.card }]}>
              <Avatar source={image ? { uri: image } : undefined} name={name} dimension={44} radius={14} />
              <View style={styles.body}>
                <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>{name}</Text>
                {member.email ? (
                  <Text style={[styles.meta, { color: theme.colors.textMuted }]} numberOfLines={1}>{member.email}</Text>
                ) : null}
              </View>
              {canManage ? (
                <TouchableOpacity
                  onPress={() => confirmRemove(member)}
                  style={styles.iconButton}
                  accessibilityRole="button"
                  accessibilityLabel={t('groups.remove')}
                >
                  <Ionicons name="person-remove-outline" size={20} color={theme.colors.danger} />
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })
      )}
      <SearchPickerSheet
        visible={picking}
        title={t('groupManage.staff.add')}
        confirmLabel={t('groupManage.staff.add')}
        items={options}
        excludeIds={staff.map((s) => s.id)}
        onClose={() => setPicking(false)}
        onConfirm={add}
      />
    </View>
  );
}

interface FilesSectionProps {
  groupId: number;
  files: GroupFile[];
  canManage: boolean;
  onChanged: () => void;
}

export function GroupFilesSection({ groupId, files, canManage, onChanged }: FilesSectionProps) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const [picking, setPicking] = useState(false);

  const open = async (file: GroupFile) => {
    const url = file.url ? getFullImageUrl(file.url) : undefined;
    if (!url) {
      Alert.alert(t('common.error'), t('groups.fileUrlMissing'));
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Linking.openURL(url).catch(() => Alert.alert(t('common.error'), t('groups.cannotOpenFile')));
    }
  };

  const assign = async (ids: number[]) => {
    try {
      await groupsApi.assignFiles(groupId, ids);
      setPicking(false);
      Alert.alert(t('common.success'), t('groupManage.files.assigned'));
      onChanged();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('groupManage.saveFailed'));
    }
  };

  const confirmRemove = (file: GroupFile) =>
    Alert.alert(t('groupManage.files.removeTitle'), t('groupManage.files.removeConfirm', { name: file.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('groups.remove'),
        style: 'destructive',
        onPress: async () => {
          try {
            await groupsApi.unassignFile(groupId, file.id);
            onChanged();
          } catch (err: any) {
            Alert.alert(t('common.error'), err?.userMessage || t('groupManage.saveFailed'));
          }
        },
      },
    ]);

  return (
    <View style={styles.section}>
      <SectionTitle
        title={t('groups.files')}
        count={files.length}
        onAdd={canManage ? () => setPicking(true) : undefined}
        addLabel={t('groupManage.files.add')}
      />
      {files.length === 0 ? (
        <Text style={[styles.empty, { color: theme.colors.textMuted }]}>{t('groups.noFiles')}</Text>
      ) : (
        files.map((file) => (
          <TouchableOpacity
            key={file.id}
            style={[styles.row, { backgroundColor: theme.colors.card }]}
            onPress={() => open(file)}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <View style={[styles.fileIcon, { backgroundColor: theme.colors.primaryLight }]}>
              <Ionicons name="document-text-outline" size={22} color={theme.colors.primary} />
            </View>
            <Text style={[styles.name, styles.body, { color: theme.colors.text }]} numberOfLines={2}>{file.name}</Text>
            {canManage ? (
              <TouchableOpacity
                onPress={() => confirmRemove(file)}
                style={styles.iconButton}
                accessibilityRole="button"
                accessibilityLabel={t('groups.remove')}
              >
                <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
              </TouchableOpacity>
            ) : (
              <Ionicons name="open-outline" size={20} color={theme.colors.primary} />
            )}
          </TouchableOpacity>
        ))
      )}
      <SearchPickerSheet
        visible={picking}
        title={t('groupManage.files.add')}
        confirmLabel={t('groupManage.files.add')}
        multiple
        excludeIds={files.map((f) => f.id)}
        search={async (term) => (await libraryApi.getLibraryPage(term)).map((f) => ({ id: f.id, label: f.name }))}
        onClose={() => setPicking(false)}
        onConfirm={assign}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm, marginTop: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },
  addButton: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: 16, padding: spacing.md },
  body: { flex: 1 },
  name: { fontSize: fontSize.base, fontFamily: 'Cairo_600SemiBold', textAlign: 'left', lineHeight: buttonLineHeight(fontSize.base), includeFontPadding: false },
  meta: { fontSize: fontSize.sm, fontFamily: 'Cairo_400Regular', textAlign: 'left' },
  fileIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  empty: { fontSize: fontSize.sm, fontFamily: 'Cairo_400Regular', textAlign: 'left' },
});

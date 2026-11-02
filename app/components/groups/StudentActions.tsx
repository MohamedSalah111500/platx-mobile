import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRTL } from '../../i18n/RTLProvider';
import { ActionSheet, type SheetAction } from '../ui/ActionSheet';
import { SearchPickerSheet, type PickerItem } from '../ui/SearchPickerSheet';
import { groupsApi } from '../../services/api/groups.api';
import { subGroupsApi } from '../../services/api/subgroups.api';
import { fullName } from '../../utils/personName';
import type { GroupMember } from '../../types/group.types';

export type StudentScope =
  | { kind: 'group'; groupId: number; groupName: string }
  | { kind: 'subgroup'; groupId: number; subGroupId: number; groupName: string };

interface StudentActionsProps {
  scope: StudentScope;
  student: GroupMember | null;
  canManage: boolean;
  onClose: () => void;
  onChanged: () => void;
}

const SUBGROUP_ID_OFFSET = 1_000_000_000;

export function StudentActions({ scope, student, canManage, onClose, onChanged }: StudentActionsProps) {
  const { t } = useRTL();
  const navigation = useNavigation<any>();
  const [moving, setMoving] = useState<GroupMember | null>(null);
  const [targets, setTargets] = useState<PickerItem[]>([]);

  const name = student ? fullName(student) : '';

  const openProfile = (s: GroupMember) =>
    navigation.getParent()?.navigate('ProfileTab', { screen: 'StudentDetail', params: { studentId: s.id }, initial: false });

  const openChat = (s: GroupMember) =>
    navigation.getParent()?.navigate('ChatTab', {
      screen: 'ChatRoom',
      params: { groupId: scope.groupId, groupName: fullName(s), studentId: s.id, chatType: 'student' },
      initial: false,
    });

  const openMove = async (s: GroupMember) => {
    try {
      const [groups, subGroups] = await Promise.all([groupsApi.getLookup(), subGroupsApi.getAllLookup()]);
      const groupItems = groups
        .filter((g) => scope.kind === 'subgroup' || g.id !== scope.groupId)
        .map((g) => ({ id: g.id, label: g.name, hint: t('groupManage.move.group') }));
      const subGroupItems = subGroups
        .filter((sg) => scope.kind === 'group' || sg.id !== scope.subGroupId)
        .map((sg) => ({
          id: SUBGROUP_ID_OFFSET + sg.id,
          label: `${sg.groupName} / ${sg.name}`,
          hint: t('groupManage.move.subGroup'),
        }));
      setTargets([...groupItems, ...subGroupItems]);
      setMoving(s);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('groupManage.loadFailed'));
    }
  };

  const move = async (ids: number[]) => {
    if (!moving) return;
    const picked = ids[0];
    const toSubGroup = picked >= SUBGROUP_ID_OFFSET;
    const targetId = toSubGroup ? picked - SUBGROUP_ID_OFFSET : picked;
    try {
      if (scope.kind === 'group') {
        if (toSubGroup) await groupsApi.moveStudentToSubGroup(scope.groupId, moving.id, targetId);
        else await groupsApi.moveStudent(scope.groupId, moving.id, targetId);
      } else if (toSubGroup) {
        await subGroupsApi.moveStudentToSubGroup(scope.subGroupId, moving.id, targetId);
      } else {
        await subGroupsApi.moveStudentToGroup(scope.subGroupId, moving.id, targetId);
      }
      setMoving(null);
      Alert.alert(t('common.success'), t('groupManage.move.done'));
      onChanged();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('groupManage.move.failed'));
    }
  };

  const confirmRemove = (s: GroupMember) =>
    Alert.alert(t('groups.removeStudent'), t('groupManage.removeStudentConfirm', { name: fullName(s) }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('groups.remove'),
        style: 'destructive',
        onPress: async () => {
          try {
            if (scope.kind === 'group') await groupsApi.removeStudent(String(scope.groupId), s.id);
            else await subGroupsApi.removeStudent(scope.subGroupId, s.id);
            onChanged();
          } catch (err: any) {
            Alert.alert(t('common.error'), err?.userMessage || t('groups.removeError'));
          }
        },
      },
    ]);

  const actions: SheetAction[] = student
    ? [
        { key: 'profile', label: t('groupManage.studentProfile'), icon: 'person-outline', onPress: () => openProfile(student) },
        { key: 'chat', label: t('groupManage.message'), icon: 'chatbubble-ellipses-outline', onPress: () => openChat(student) },
        ...(canManage
          ? [
              { key: 'move', label: t('groupManage.move.title'), icon: 'swap-horizontal-outline' as const, onPress: () => openMove(student) },
              { key: 'remove', label: t('groups.removeStudent'), icon: 'person-remove-outline' as const, onPress: () => confirmRemove(student), danger: true },
            ]
          : []),
      ]
    : [];

  return (
    <>
      <ActionSheet visible={!!student} title={name} actions={actions} onClose={onClose} />
      <SearchPickerSheet
        visible={!!moving}
        title={t('groupManage.move.title')}
        confirmLabel={t('groupManage.move.confirm')}
        items={targets}
        onClose={() => setMoving(null)}
        onConfirm={move}
      />
    </>
  );
}

export default StudentActions;

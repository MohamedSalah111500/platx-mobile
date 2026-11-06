import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { SelectField } from '../../components/ui/SelectField';
import { PhotoField } from '../../components/people/PhotoField';
import { spacing } from '../../theme/spacing';
import { groupsApi } from '../../services/api/groups.api';
import { subGroupsApi } from '../../services/api/subgroups.api';
import { getFullImageUrl } from '../../utils/imageUrl';
import { GROUP_STATUS, type GroupStatus } from '../../types/group.types';
import type { PhotoAsset } from '../../types/people.types';
import type { ProfileStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'GroupForm'>;

const NAME_MAX = 50;
const DESCRIPTION_MAX = 250;
const DIGITS_ONLY = /^\d+$/;

export default function GroupFormScreen({ navigation, route }: Props) {
  const { groupId, subGroupId, parentGroupId } = route.params ?? {};
  const isSubGroup = !!parentGroupId;
  const editing = isSubGroup ? !!subGroupId : !!groupId;
  const { theme } = useTheme();
  const { t } = useRTL();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<GroupStatus>(GROUP_STATUS.Active);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [icon, setIcon] = useState<PhotoAsset | null>(null);

  const load = async () => {
    if (!editing) return;
    setLoading(true);
    setLoadError(null);
    try {
      const item = isSubGroup && subGroupId ? await subGroupsApi.getById(subGroupId) : await groupsApi.getGroup(groupId!);
      setName(item.name ?? '');
      setDescription((item as { description?: string }).description ?? '');
      setStatus(item.status === GROUP_STATUS.Inactive ? GROUP_STATUS.Inactive : GROUP_STATUS.Active);
      setIconUrl(getFullImageUrl(item.icon) ?? null);
    } catch (err: any) {
      setLoadError(err?.userMessage || t('groupManage.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [groupId, subGroupId]);

  const textError = (value: string, max: number) => {
    const trimmed = value.trim();
    if (!trimmed) return t('validation.required');
    if (trimmed.length > max) return t('groupManage.maxLength', { max });
    if (DIGITS_ONLY.test(trimmed)) return t('groupManage.notDigitsOnly');
    return undefined;
  };

  const errors = {
    name: textError(name, NAME_MAX),
    description: isSubGroup || !description.trim() ? undefined : textError(description, DESCRIPTION_MAX),
  };
  const shown = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);

  const statusOptions = useMemo(
    () => [
      { value: String(GROUP_STATUS.Active), label: t('groups.active') },
      { value: String(GROUP_STATUS.Inactive), label: t('groups.inactive') },
    ],
    [t]
  );

  const save = async () => {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean) || saving) return;
    setSaving(true);
    try {
      if (isSubGroup) {
        const values = { id: subGroupId, groupId: parentGroupId!, name, status, icon };
        if (editing) await subGroupsApi.update(values);
        else await subGroupsApi.create(values);
      } else {
        const values = { id: groupId, name, description, status, icon };
        if (editing) await groupsApi.update(values);
        else await groupsApi.create(values);
      }
      Alert.alert(t('common.success'), editing ? t('groupManage.updated') : t('groupManage.created'));
      navigation.goBack();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('groupManage.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const title = isSubGroup
    ? editing
      ? t('groupManage.editSubGroup')
      : t('groupManage.addSubGroup')
    : editing
    ? t('groupManage.editGroup')
    : t('groupManage.addGroup');

  if (loading || loadError) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={title} onBack={() => navigation.goBack()} />
        {loading ? <Spinner /> : <ErrorRetry message={loadError ?? ''} onRetry={load} />}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={title} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing['3xl'] }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <PhotoField currentUrl={iconUrl} photo={icon} onChange={setIcon} placeholderIcon="people" />
          <Input
            label={isSubGroup ? t('groupManage.subGroupName') : t('groupManage.groupName')}
            value={name}
            onChangeText={setName}
            maxLength={NAME_MAX}
            error={shown('name')}
          />
          {!isSubGroup ? (
            <Input
              label={t('groupManage.description')}
              value={description}
              onChangeText={setDescription}
              maxLength={DESCRIPTION_MAX}
              multiline
              error={shown('description')}
            />
          ) : null}
          <SelectField
            label={t('groups.status')}
            placeholder={t('groups.status')}
            value={String(status)}
            options={statusOptions}
            onChange={(value) => setStatus(Number(value) as GroupStatus)}
          />
          <Button title={editing ? t('common.save') : title} onPress={save} loading={saving} fullWidth />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  });
}

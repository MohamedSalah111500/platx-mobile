import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useAuth } from '../../hooks/useAuth';
import { useDisplayFormat, isolate } from '../../hooks/useDisplayFormat';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Avatar } from '../../components/ui/Avatar';
import { Spinner } from '../../components/ui/Spinner';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { InfoList, ActionList, type ActionItem } from '../../components/people/PersonSections';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { staffApi } from '../../services/api/staff.api';
import { getFullImageUrl } from '../../utils/imageUrl';
import { parseServerDate } from '../../utils/date';
import { fullName } from '../../utils/personName';
import type { ManagedStaff } from '../../types/people.types';
import type { ProfileStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'StaffDetail'>;

export default function StaffDetailScreen({ navigation, route }: Props) {
  const { staffId } = route.params;
  const { theme } = useTheme();
  const { t } = useRTL();
  const { can, user } = useAuth();
  const { date } = useDisplayFormat();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [staff, setStaff] = useState<ManagedStaff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setStaff(await staffApi.getById(staffId));
    } catch (err: any) {
      setError(err?.userMessage || t('people.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [staffId, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const confirmDelete = () =>
    Alert.alert(t('people.staff.deleteTitle'), t('people.staff.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await staffApi.remove(staffId);
            Alert.alert(t('common.success'), t('people.deleted'));
            navigation.goBack();
          } catch (err: any) {
            Alert.alert(t('common.error'), err?.userMessage || t('people.deleteFailed'));
          }
        },
      },
    ]);

  if (loading || error || !staff) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('people.staff.profile')} onBack={() => navigation.goBack()} />
        {loading ? <Spinner /> : <ErrorRetry message={error ?? ''} onRetry={load} />}
      </View>
    );
  }

  const name = fullName(staff);
  const image = getFullImageUrl(staff.profileImage);
  const isSelf = !!user?.staffId && user.staffId === staff.id;

  const actions: ActionItem[] = [
    ...(can('STAFF_EDIT')
      ? [{ icon: 'create-outline' as const, label: t('common.edit'), onPress: () => navigation.navigate('StaffForm', { staffId }) }]
      : []),
    ...(can('STAFF_PERMISSIONS_MANAGE')
      ? [
          {
            icon: 'lock-closed-outline' as const,
            label: t('people.permissions.title'),
            onPress: () => navigation.navigate('StaffPermissions', { staffId, staffName: name }),
          },
        ]
      : []),
    ...(can('STAFF_DELETE') && !isSelf
      ? [{ icon: 'trash-outline' as const, label: t('common.delete'), onPress: confirmDelete, danger: true }]
      : []),
  ];

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('people.staff.profile')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing['3xl'] }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: theme.colors.heroBackground }]}>
          <Avatar source={image ? { uri: image } : undefined} name={name} dimension={80} radius={26} />
          <Text style={styles.heroName}>{name}</Text>
          {staff.jobTitleName ? (
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>{staff.jobTitleName}</Text>
            </View>
          ) : null}
        </View>

        <InfoList
          items={[
            { icon: 'mail-outline', label: t('people.email'), value: staff.email || null },
            { icon: 'call-outline', label: t('people.phone'), value: staff.phoneNumber ? isolate(staff.phoneNumber) : null },
            { icon: 'people-outline', label: t('people.staff.groups'), value: staff.groups.map((g) => g.name).join('، ') || null },
            { icon: 'calendar-outline', label: t('people.dateOfBirth'), value: staff.dateOfBirth ? date(parseServerDate(staff.dateOfBirth.slice(0, 10))) : null },
            { icon: 'location-outline', label: t('people.address'), value: staff.address || null },
          ]}
        />

        {actions.length > 0 && <ActionList items={actions} />}
      </ScrollView>
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { paddingHorizontal: spacing.xl, gap: spacing.lg },
    hero: { borderRadius: 24, alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
    heroName: { ...typography.h3, color: '#FFFFFF', textAlign: 'center' },
    heroPill: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.2)' },
    heroPillText: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', color: '#FFFFFF' },
  });
}

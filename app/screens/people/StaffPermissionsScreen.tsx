import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { staffApi } from '../../services/api/staff.api';
import type { ModulePermission } from '../../types/people.types';
import type { ProfileStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'StaffPermissions'>;
type Flag = 'canView' | 'canCreate' | 'canEdit' | 'canDelete';

const FLAGS: { key: Flag; label: string }[] = [
  { key: 'canView', label: 'people.permissions.view' },
  { key: 'canCreate', label: 'people.permissions.create' },
  { key: 'canEdit', label: 'people.permissions.edit' },
  { key: 'canDelete', label: 'people.permissions.delete' },
];

export default function StaffPermissionsScreen({ navigation, route }: Props) {
  const { staffId, staffName } = route.params;
  const { theme } = useTheme();
  const { t } = useRTL();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [permissions, setPermissions] = useState<ModulePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPermissions(await staffApi.getPermissions(staffId));
    } catch (err: any) {
      setError(err?.userMessage || t('people.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [staffId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (module: ModulePermission['module'], flag: Flag, value: boolean) =>
    setPermissions((current) => current.map((p) => (p.module === module ? { ...p, [flag]: value } : p)));

  const setAll = (module: ModulePermission['module'], value: boolean) =>
    setPermissions((current) =>
      current.map((p) => (p.module === module ? { ...p, canView: value, canCreate: value, canEdit: value, canDelete: value } : p))
    );

  const save = async () => {
    setSaving(true);
    try {
      await staffApi.updatePermissions(staffId, permissions);
      Alert.alert(t('common.success'), t('people.permissions.saved'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('people.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const title = t('people.permissions.title');

  if (loading || error) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={title} onBack={() => navigation.goBack()} />
        {loading ? <Spinner /> : <ErrorRetry message={error ?? ''} onRetry={load} />}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={title} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {staffName ? <Text style={styles.name}>{staffName}</Text> : null}
        <Text style={styles.hint}>{t('people.permissions.hint')}</Text>
        {permissions.map((permission) => {
          const all = permission.canView && permission.canCreate && permission.canEdit && permission.canDelete;
          return (
            <View key={permission.module} style={[styles.card, { backgroundColor: theme.colors.card }]}>
              <View style={[styles.row, styles.headerRow, { borderBottomColor: theme.colors.divider }]}>
                <Text style={styles.module}>{t(`people.permissions.modules.${permission.module}`)}</Text>
                <Text style={styles.allLabel}>{t('people.permissions.all')}</Text>
                <Switch
                  value={all}
                  onValueChange={(value) => setAll(permission.module, value)}
                  trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                  accessibilityLabel={`${t(`people.permissions.modules.${permission.module}`)} ${t('people.permissions.all')}`}
                />
              </View>
              <View style={styles.grid}>
                {FLAGS.map((flag) => (
                  <View key={flag.key} style={styles.cell}>
                    <Text style={styles.flagLabel}>{t(flag.label)}</Text>
                    <Switch
                      value={permission[flag.key]}
                      onValueChange={(value) => toggle(permission.module, flag.key, value)}
                      trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                      accessibilityLabel={`${t(`people.permissions.modules.${permission.module}`)} ${t(flag.label)}`}
                    />
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md, borderTopColor: theme.colors.divider }]}>
        <Button title={t('common.save')} onPress={save} loading={saving} fullWidth />
      </View>
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { paddingHorizontal: spacing.xl, gap: spacing.sm, paddingBottom: spacing.lg },
    name: { fontSize: fontSize.lg, fontFamily: 'Cairo_700Bold', color: theme.colors.text, textAlign: 'left' },
    hint: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: theme.colors.textMuted, textAlign: 'left', marginBottom: spacing.xs },
    card: { borderRadius: borderRadius.xl, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
    headerRow: { paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
    module: { flex: 1, fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', color: theme.colors.text, textAlign: 'left' },
    allLabel: { fontSize: 14, fontFamily: 'Cairo_500Medium', color: theme.colors.textMuted },
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
    cell: { width: '50%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xs, paddingEnd: spacing.md },
    flagLabel: { fontSize: 14, fontFamily: 'Cairo_500Medium', color: theme.colors.text, textAlign: 'left' },
    footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, backgroundColor: theme.colors.background },
  });
}

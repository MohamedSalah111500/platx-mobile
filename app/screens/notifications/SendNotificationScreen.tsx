import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useSound } from '../../hooks/useSound';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { notificationsApi } from '../../services/api/notifications.api';
import { groupsApi } from '../../services/api/groups.api';
import type { Group } from '../../types/group.types';
import type { HomeStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<HomeStackParamList, 'SendNotification'>;

export default function SendNotificationScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const { play } = useSound();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sendToAll, setSendToAll] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (sendToAll || groups.length) return;
    setGroupsLoading(true);
    groupsApi
      .getAll(1, 100)
      .then((res) => setGroups(Array.isArray(res?.items) ? res.items : []))
      .catch(() => setGroups([]))
      .finally(() => setGroupsLoading(false));
  }, [sendToAll, groups.length]);

  const toggleGroup = (id: number) => {
    play('tap');
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const titleError = submitted && !title.trim() ? t('sendNotification.required') : undefined;
  const bodyError = submitted && !body.trim() ? t('sendNotification.required') : undefined;
  const groupsError = submitted && !sendToAll && selected.size === 0 ? t('sendNotification.chooseAtLeastOne') : undefined;

  const send = async () => {
    setSubmitted(true);
    if (!title.trim() || !body.trim() || (!sendToAll && selected.size === 0)) return;
    setSending(true);
    try {
      await notificationsApi.create({
        title: title.trim(),
        body: body.trim(),
        sendToAll,
        groupIds: sendToAll ? [] : Array.from(selected),
        studentIds: [],
      });
      play('success');
      Alert.alert(t('common.success'), t('sendNotification.sent'), [{ text: t('common.ok'), onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('sendNotification.failed'));
    } finally {
      setSending(false);
    }
  };

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('sendNotification.title')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing['3xl'] }]} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Input label={t('sendNotification.titleLabel')} value={title} onChangeText={setTitle} placeholder={t('sendNotification.titlePlaceholder')} error={titleError} maxLength={120} />
          <Input
            label={t('sendNotification.bodyLabel')}
            value={body}
            onChangeText={setBody}
            placeholder={t('sendNotification.bodyPlaceholder')}
            error={bodyError}
            multiline
            numberOfLines={5}
            style={{ minHeight: 120, textAlignVertical: 'top' }}
            maxLength={1000}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.rowTitle}>{t('sendNotification.sendToAll')}</Text>
              <Text style={styles.rowHint}>{t('sendNotification.sendToAllHint')}</Text>
            </View>
            <Switch value={sendToAll} onValueChange={setSendToAll} trackColor={{ true: theme.colors.primary, false: theme.colors.border }} thumbColor="#fff" />
          </View>

          {!sendToAll && (
            <View style={styles.groupsBlock}>
              <Text style={styles.groupsLabel}>{t('sendNotification.chooseGroups')}</Text>
              {groupsLoading ? (
                <Spinner size="small" />
              ) : groups.length === 0 ? (
                <Text style={styles.rowHint}>{t('sendNotification.noGroups')}</Text>
              ) : (
                <View style={styles.chips}>
                  {groups.map((g) => {
                    const active = selected.has(g.id);
                    return (
                      <TouchableOpacity
                        key={g.id}
                        style={[styles.chip, { borderColor: active ? theme.colors.primary : theme.colors.border, backgroundColor: active ? theme.colors.primaryLight : theme.colors.card }]}
                        onPress={() => toggleGroup(g.id)}
                        activeOpacity={0.7}
                      >
                        {active && <Ionicons name="checkmark" size={14} color={theme.colors.primary} />}
                        <Text style={[styles.chipText, { color: active ? theme.colors.primary : theme.colors.textSecondary }]}>{g.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              {groupsError ? <Text style={styles.errorText}>{groupsError}</Text> : null}
            </View>
          )}
        </View>

        <Button title={t('sendNotification.send')} onPress={send} loading={sending} fullWidth size="large" icon={<Ionicons name="paper-plane-outline" size={20} color="#fff" />} />
      </ScrollView>
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { paddingHorizontal: spacing.lg, gap: spacing.lg, paddingTop: spacing.sm },
    card: { backgroundColor: theme.colors.card, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: theme.colors.border, padding: spacing.lg, gap: spacing.md },
    rowBetween: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    rowTitle: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', color: theme.colors.text },
    rowHint: { fontSize: fontSize.sm, lineHeight: 20, fontFamily: 'Cairo_400Regular', color: theme.colors.textMuted },
    groupsBlock: { gap: spacing.sm },
    groupsLabel: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold', color: theme.colors.textSecondary },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: borderRadius.full, borderWidth: 1 },
    chipText: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold' },
    errorText: { fontSize: fontSize.xs, fontFamily: 'Cairo_500Medium', color: theme.colors.danger },
  });
}

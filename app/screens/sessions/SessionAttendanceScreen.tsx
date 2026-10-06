import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../types/navigation.types';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { QrScannerModal } from '../../components/wallet/QrScannerModal';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography, fontSize } from '../../theme/typography';
import {
  ATTENDANCE_STATUSES,
  SESSION_STATUS,
  sessionsApi,
  type AttendanceStatus,
  type ClassSession,
  type RosterItem,
} from '../../services/api/sessions.api';
import { attendanceColor, formatRecordedTime, formatSessionDate } from './sessionFormat';

type Props = NativeStackScreenProps<ProfileStackParamList, 'SessionAttendance'>;
type Feedback = { ok: boolean; text: string };

const errorMessage = (err: any, fallback: string): string => err?.response?.data?.message || err?.userMessage || fallback;

export default function SessionAttendanceScreen({ navigation, route }: Props) {
  const { sessionId, title } = route.params;
  const { theme } = useTheme();
  const { t, locale } = useRTL();
  const [session, setSession] = useState<ClassSession | null>(null);
  const [roster, setRoster] = useState<RosterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState<Set<number>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [completing, setCompleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [details, students] = await Promise.all([sessionsApi.get(sessionId), sessionsApi.roster(sessionId)]);
      setSession(details);
      setRoster(students);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const upsert = (rows: RosterItem[]) =>
    setRoster((current) => {
      const byId = new Map(rows.map((row) => [row.studentId, row]));
      const added = rows.filter((row) => !current.some((item) => item.studentId === row.studentId));
      return [...added, ...current.map((item) => byId.get(item.studentId) ?? item)];
    });

  const canMark = !!session && session.status !== SESSION_STATUS.Cancelled;

  const setStatus = async (item: RosterItem, status: AttendanceStatus) => {
    if (!canMark || saving.has(item.studentId) || item.status === status) return;
    setSaving((current) => new Set(current).add(item.studentId));
    try {
      upsert(await sessionsApi.mark(sessionId, item.studentId, status));
    } catch (err) {
      Alert.alert(t('common.error'), errorMessage(err, t('sessions.saveFailed')));
    } finally {
      setSaving((current) => {
        const next = new Set(current);
        next.delete(item.studentId);
        return next;
      });
    }
  };

  const onScanned = async (value: string) => {
    setFeedback(null);
    try {
      const { student, alreadyMarked } = await sessionsApi.scan(sessionId, value.trim());
      upsert([student]);
      setFeedback(
        alreadyMarked
          ? {
              ok: false,
              text: t('sessions.alreadyMarked', {
                name: student.studentName,
                status: t(`sessions.attendance.${student.status}`),
                time: student.recordedAt ? formatRecordedTime(student.recordedAt, locale) : '',
              }),
            }
          : { ok: true, text: t('sessions.marked', { name: student.studentName }) }
      );
    } catch (err) {
      setFeedback({ ok: false, text: errorMessage(err, t('sessions.scanFailed')) });
    }
  };

  const complete = () => {
    Alert.alert(t('sessions.completeTitle'), t('sessions.completeBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('sessions.complete'),
        onPress: async () => {
          setCompleting(true);
          try {
            setSession(await sessionsApi.complete(sessionId));
            setRoster(await sessionsApi.roster(sessionId));
          } catch (err) {
            Alert.alert(t('common.error'), errorMessage(err, t('sessions.saveFailed')));
          } finally {
            setCompleting(false);
          }
        },
      },
    ]);
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return roster;
    return roster.filter((r) => r.studentName.toLowerCase().includes(term) || (r.studentCode ?? '').toLowerCase().includes(term));
  }, [roster, search]);

  const attended = roster.filter((r) => r.status === 1 || r.status === 2).length;

  const header = session && (
    <View>
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.meta, { color: theme.colors.textMuted }]}>{formatSessionDate(session.startsAt, locale)}</Text>
        {!!session.location && <Text style={[styles.meta, { color: theme.colors.textMuted }]}>{session.location}</Text>}
        <View style={styles.counts}>
          {ATTENDANCE_STATUSES.map((status) => (
            <View key={status} style={styles.countBox}>
              <Text style={[styles.countValue, { color: attendanceColor(status, theme.colors) }]}>
                {roster.filter((r) => r.status === status).length}
              </Text>
              <Text style={[styles.meta, { color: theme.colors.textMuted }]}>{t(`sessions.attendance.${status}`)}</Text>
            </View>
          ))}
        </View>
        {session.status === SESSION_STATUS.Cancelled ? (
          <Text style={[styles.meta, { color: theme.colors.danger }]}>{t('sessions.cancelledNote')}</Text>
        ) : (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => {
              setFeedback(null);
              setScanning(true);
            }}
            accessibilityRole="button"
          >
            <Ionicons name="scan" size={20} color="#FFFFFF" />
            <Text style={styles.primaryText}>{t('sessions.scanCards')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <TextInput
        style={[styles.search, { borderColor: theme.colors.inputBorder, backgroundColor: theme.colors.inputBackground, color: theme.colors.inputText }]}
        value={search}
        onChangeText={setSearch}
        placeholder={t('sessions.searchRoster')}
        placeholderTextColor={theme.colors.inputPlaceholder}
        accessibilityLabel={t('sessions.searchRoster')}
      />
      <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
        {t('sessions.roster')} ({attended} / {roster.length})
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title={session?.title ?? title} onBack={() => navigation.goBack()} />
      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing['3xl'] }} color={theme.colors.primary} />
      ) : failed && !session ? (
        <TouchableOpacity style={styles.retry} onPress={() => { setLoading(true); load(); }} accessibilityRole="button">
          <Text style={[styles.empty, { color: theme.colors.textMuted }]}>{t('sessions.loadFailed')}</Text>
          <Text style={[styles.retryText, { color: theme.colors.primary }]}>{t('common.retry')}</Text>
        </TouchableOpacity>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.studentId)}
          ListHeaderComponent={header}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['3xl'] }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          ListEmptyComponent={<Text style={[styles.empty, { color: theme.colors.textMuted }]}>{t('sessions.rosterEmpty')}</Text>}
          ListFooterComponent={
            session?.status === SESSION_STATUS.Scheduled ? (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.colors.card, marginTop: spacing.lg }, completing && { opacity: 0.6 }]}
                onPress={complete}
                disabled={completing}
                accessibilityRole="button"
              >
                {completing ? (
                  <ActivityIndicator color={theme.colors.primary} />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={20} color={theme.colors.text} />
                    <Text style={[styles.primaryText, { color: theme.colors.text }]}>{t('sessions.complete')}</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={[styles.row, { backgroundColor: theme.colors.card }]}>
              <View style={styles.rowHeader}>
                <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>{item.studentName}</Text>
                {item.isGuest && (
                  <Text style={[styles.guest, { color: theme.colors.warning, backgroundColor: theme.colors.warning + '1F' }]}>{t('sessions.guest')}</Text>
                )}
              </View>
              <Text style={[styles.meta, { color: theme.colors.textMuted }]}>
                {[item.studentCode, item.recordedAt ? formatRecordedTime(item.recordedAt, locale) : null].filter(Boolean).join(' · ')}
              </Text>
              <Text style={[styles.meta, { color: theme.colors.textMuted }]}>
                {t('sessions.summary', { attended: item.history.present + item.history.late, absent: item.history.absent })}
              </Text>
              <View style={styles.chips}>
                {ATTENDANCE_STATUSES.map((status) => {
                  const selected = item.status === status;
                  const color = attendanceColor(status, theme.colors);
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.chip,
                        { backgroundColor: selected ? color : theme.colors.background },
                        (!canMark || saving.has(item.studentId)) && { opacity: 0.5 },
                      ]}
                      onPress={() => setStatus(item, status)}
                      disabled={!canMark || saving.has(item.studentId)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text style={[styles.chipText, { color: selected ? '#FFFFFF' : theme.colors.text }]}>{t(`sessions.attendance.${status}`)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        />
      )}

      <QrScannerModal
        visible={scanning}
        continuous
        hint={t('sessions.scanHint')}
        feedback={feedback}
        onClose={() => setScanning(false)}
        onScanned={onScanned}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  meta: {
    ...typography.bodySmall,
  },
  counts: {
    flexDirection: 'row',
    marginVertical: spacing.md,
  },
  countBox: {
    flex: 1,
    alignItems: 'center',
  },
  countValue: {
    ...typography.h3,
  },
  primaryButton: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    ...typography.button,
    color: '#FFFFFF',
  },
  search: {
    borderWidth: 1,
    borderRadius: 14,
    height: 48,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.base,
    fontFamily: 'Cairo_400Regular',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.bodySmall,
    marginBottom: spacing.sm,
  },
  row: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 2,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    ...typography.body,
    fontFamily: 'Cairo_600SemiBold',
    flexShrink: 1,
  },
  guest: {
    ...typography.bodySmall,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  chip: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  chipText: {
    ...typography.bodySmall,
  },
  empty: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing['3xl'],
  },
  retry: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  retryText: {
    ...typography.button,
  },
});

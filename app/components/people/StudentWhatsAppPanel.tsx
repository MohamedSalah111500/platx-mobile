import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { CountryCode } from 'libphonenumber-js/mobile';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { isolate } from '../../hooks/useDisplayFormat';
import { Spinner } from '../ui/Spinner';
import { ErrorRetry } from '../ui/ErrorRetry';
import { Button } from '../ui/Button';
import { PhoneInput } from '../ui/PhoneInput';
import { SelectField } from '../ui/SelectField';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { whatsAppStudentApi } from '../../services/api/studentAccess.api';
import { splitPhone, toE164Phone } from '../../utils/phoneNumber';
import {
  WHATSAPP_TOPICS,
  type WhatsAppDeliveryMode,
  type WhatsAppStudent,
  type WhatsAppStudentUpdate,
  type WhatsAppTopic,
} from '../../types/people.types';

type Override = 'inherit' | 'on' | 'off';
const INHERIT_MODE = 'inherit';

const toOverride = (value: boolean | null): Override => (value === null ? 'inherit' : value ? 'on' : 'off');
const fromOverride = (value: Override): boolean | null => (value === 'inherit' ? null : value === 'on');

const TOPIC_LABEL: Record<WhatsAppTopic, string> = {
  sendAttendance: 'people.whatsapp.topics.attendance',
  sendExamResults: 'people.whatsapp.topics.exams',
  sendHomeworkGrades: 'people.whatsapp.topics.homework',
};

interface Props {
  studentId: number;
  canEdit: boolean;
  canSend: boolean;
}

export function StudentWhatsAppPanel({ studentId, canEdit, canSend }: Props) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const [student, setStudent] = useState<WhatsAppStudent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState<CountryCode>(splitPhone(null).country);

  const apply = (value: WhatsAppStudent, resetPhone: boolean) => {
    setStudent(value);
    if (resetPhone) {
      const parts = splitPhone(value.guardianPhoneNumber);
      setPhone(parts.national);
      setCountry(parts.country);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      apply(await whatsAppStudentApi.get(studentId), true);
    } catch (err: any) {
      setError(err?.userMessage || t('people.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [studentId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (patch: Partial<WhatsAppStudentUpdate>, successKey?: string, resetPhone = false) => {
    if (!student || saving || !canEdit) return;
    setSaving(true);
    const request: WhatsAppStudentUpdate = {
      guardianPhoneNumber: student.guardianPhoneNumber,
      isMuted: student.isMuted,
      sendAttendance: student.sendAttendance,
      sendExamResults: student.sendExamResults,
      sendHomeworkGrades: student.sendHomeworkGrades,
      deliveryMode: student.deliveryMode,
      ...patch,
    };
    try {
      apply(await whatsAppStudentApi.update(studentId, request), resetPhone);
      if (successKey) Alert.alert(t('common.success'), t(successKey));
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('people.saveFailed'));
      load();
    } finally {
      setSaving(false);
    }
  };

  const sendReport = async () => {
    if (sending || !canSend) return;
    setSending(true);
    try {
      await whatsAppStudentApi.sendReport(studentId);
      Alert.alert(t('common.success'), t('people.whatsapp.reportQueued'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('people.saveFailed'));
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Spinner size="small" />;
  if (error || !student) return <ErrorRetry message={error ?? ''} onRetry={load} />;
  if (!student.featureEnabled) {
    return <Text style={[styles.muted, { color: theme.colors.textMuted }]}>{t('people.whatsapp.notEnabled')}</Text>;
  }

  const phoneE164 = toE164Phone(phone, country);
  const phoneChanged = (student.guardianPhoneNumber ?? '') !== (phoneE164 ?? '');
  const phoneInvalid = !!phone.trim() && !phoneE164;
  const onOff = (value: boolean) => t(value ? 'people.whatsapp.on' : 'people.whatsapp.off');
  const topicOptions = (topic: WhatsAppTopic) => [
    { value: 'inherit' as Override, label: t('people.whatsapp.academyDefault', { value: onOff(student.academy[topic]) }) },
    { value: 'on' as Override, label: t('people.whatsapp.on') },
    { value: 'off' as Override, label: t('people.whatsapp.off') },
  ];
  const modeOptions = [
    {
      value: INHERIT_MODE,
      label: t('people.whatsapp.academyDefault', { value: t(`people.whatsapp.modes.${student.academy.deliveryMode}`) }),
    },
    { value: 'Instant', label: t('people.whatsapp.modes.Instant') },
    { value: 'DailyDigest', label: t('people.whatsapp.modes.DailyDigest') },
  ];
  const sendDisabled =
    !student.whatsAppNumber ||
    student.isCountryAllowed === false ||
    student.isMuted ||
    student.isOptedOut ||
    !student.academy.isEnabled;

  const notice = (text: string, color: string) => (
    <View style={[styles.notice, { backgroundColor: color + '1A' }]}>
      <Text style={[styles.noticeText, { color: theme.colors.text }]}>{text}</Text>
    </View>
  );

  return (
    <View style={styles.wrap}>
      {!student.academy.isEnabled ? notice(t('people.whatsapp.academyOff'), theme.colors.warning) : null}
      {student.isOptedOut ? notice(t('people.whatsapp.optedOut'), theme.colors.danger) : null}
      {student.whatsAppNumber && student.isCountryAllowed === false
        ? notice(t('people.whatsapp.countryNotAllowed'), theme.colors.warning)
        : null}

      <PhoneInput
        label={t('people.whatsapp.phone')}
        value={phone}
        country={country}
        onChangeText={setPhone}
        onChangeCountry={setCountry}
        error={phoneInvalid ? t('validation.invalidPhone') : undefined}
      />
      {canEdit && phoneChanged ? (
        <Button
          title={t('common.save')}
          onPress={() => save({ guardianPhoneNumber: phoneE164 }, 'people.whatsapp.phoneSaved', true)}
          loading={saving}
          disabled={phoneInvalid}
        />
      ) : null}

      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Ionicons
          name="logo-whatsapp"
          size={26}
          color={student.whatsAppNumber && !student.isMuted ? theme.colors.success : theme.colors.textMuted}
        />
        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{t('people.whatsapp.receiving')}</Text>
          <Text style={[styles.muted, { color: theme.colors.textMuted }]}>
            {student.whatsAppNumber ? isolate(`+${student.whatsAppNumber}`) : t('people.whatsapp.noValidPhone')}
          </Text>
        </View>
        <Switch
          value={!student.isMuted}
          disabled={!canEdit || saving}
          onValueChange={(receiving) => save({ isMuted: !receiving })}
          trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
        />
      </View>

      {!student.isMuted ? (
        <>
          {WHATSAPP_TOPICS.map((topic) => (
            <SelectField
              key={topic}
              label={t(TOPIC_LABEL[topic])}
              placeholder={t(TOPIC_LABEL[topic])}
              value={toOverride(student[topic])}
              options={topicOptions(topic)}
              onChange={(value) => (canEdit ? save({ [topic]: fromOverride(value) }) : undefined)}
            />
          ))}
          <SelectField
            label={t('people.whatsapp.when')}
            placeholder={t('people.whatsapp.when')}
            value={student.deliveryMode ?? INHERIT_MODE}
            options={modeOptions}
            onChange={(value) =>
              canEdit ? save({ deliveryMode: value === INHERIT_MODE ? null : (value as WhatsAppDeliveryMode) }) : undefined
            }
          />
        </>
      ) : null}

      {canSend ? (
        <>
          <Button
            title={t('people.whatsapp.sendReport')}
            variant="secondary"
            onPress={sendReport}
            loading={sending}
            disabled={sendDisabled}
          />
          <Text style={[styles.muted, { color: theme.colors.textMuted }]}>{t('people.whatsapp.sendReportHint')}</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  muted: { fontSize: 14, fontFamily: 'Cairo_400Regular', textAlign: 'left' },
  notice: { borderRadius: borderRadius.lg, padding: spacing.md },
  noticeText: { fontSize: 14, fontFamily: 'Cairo_500Medium', textAlign: 'left' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: fontSize.base, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },
});

export default StudentWhatsAppPanel;

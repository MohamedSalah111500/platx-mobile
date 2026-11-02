import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CountryCode } from 'libphonenumber-js/mobile';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { SelectField } from '../../components/ui/SelectField';
import { MultiSelectField } from '../../components/ui/MultiSelectField';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { DateField } from '../../components/ui/DateField';
import { PhotoField } from '../../components/people/PhotoField';
import { spacing } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { staffApi } from '../../services/api/staff.api';
import { groupsApi } from '../../services/api/groups.api';
import { splitPhone, toE164Phone } from '../../utils/phoneNumber';
import { getFullImageUrl } from '../../utils/imageUrl';
import { EMAIL_PATTERN } from '../../utils/email';
import type { Group } from '../../types/group.types';
import type { JobTitle, PhotoAsset } from '../../types/people.types';
import type { ProfileStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'StaffForm'>;

const NO_JOB = '';

export default function StaffFormScreen({ navigation, route }: Props) {
  const staffId = route.params?.staffId;
  const editing = !!staffId;
  const { theme } = useTheme();
  const { t } = useRTL();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>(splitPhone(null).country);
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [groupIds, setGroupIds] = useState<number[]>([]);
  const [jobTitleId, setJobTitleId] = useState<string>(NO_JOB);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photo, setPhoto] = useState<PhotoAsset | null>(null);

  const loadStaff = async () => {
    if (!staffId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const staff = await staffApi.getById(staffId);
      setFirstName(staff.firstName);
      setLastName(staff.lastName);
      setEmail(staff.email);
      setAddress(staff.address ?? '');
      const parts = splitPhone(staff.phoneNumber);
      setPhone(parts.national);
      setPhoneCountry(parts.country);
      setDateOfBirth(staff.dateOfBirth ? staff.dateOfBirth.slice(0, 10) : null);
      setGroupIds(staff.groups.map((g) => g.id));
      setJobTitleId(staff.jobTitleId ? String(staff.jobTitleId) : NO_JOB);
      setPhotoUrl(getFullImageUrl(staff.profileImage) ?? null);
    } catch (err: any) {
      setLoadError(err?.userMessage || t('people.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    groupsApi
      .getAll(1, 500)
      .then((res) => setGroups(res?.items ?? []))
      .catch(() => setGroups([]));
    staffApi
      .getJobTitles()
      .then(setJobTitles)
      .catch(() => setJobTitles([]));
    loadStaff();
  }, [staffId]);

  const phoneE164 = toE164Phone(phone, phoneCountry);
  const errors = {
    firstName: !firstName.trim() ? t('validation.required') : undefined,
    lastName: !lastName.trim() ? t('validation.required') : undefined,
    email: !email.trim()
      ? t('validation.required')
      : !EMAIL_PATTERN.test(email.trim())
      ? t('validation.invalidEmail')
      : undefined,
    phone: !phone.trim() ? t('validation.required') : !phoneE164 ? t('validation.invalidPhone') : undefined,
    dateOfBirth: !dateOfBirth ? t('validation.required') : undefined,
    address: !address.trim() ? t('validation.required') : undefined,
  };
  const shown = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);

  const groupOptions = useMemo(() => groups.map((g) => ({ value: g.id, label: g.name })), [groups]);
  const jobOptions = useMemo(
    () => [{ value: NO_JOB, label: t('people.staff.noJobTitle') }, ...jobTitles.map((j) => ({ value: String(j.id), label: j.name }))],
    [jobTitles, t]
  );

  const save = async () => {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean) || saving || !dateOfBirth) return;
    setSaving(true);
    const values = {
      id: staffId,
      firstName,
      lastName,
      email,
      address,
      phoneNumber: phoneE164 ?? '',
      dateOfBirth,
      groupIds,
      jobTitleId: jobTitleId ? Number(jobTitleId) : null,
      photo,
    };
    try {
      if (editing) await staffApi.update(values);
      else await staffApi.create(values);
      Alert.alert(t('common.success'), editing ? t('people.updated') : t('people.staff.created'));
      navigation.goBack();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('people.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const title = editing ? t('people.staff.edit') : t('people.staff.add');

  if (loading || loadError) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={title} onBack={() => navigation.goBack()} />
        {loading ? <Spinner /> : <ErrorRetry message={loadError ?? ''} onRetry={loadStaff} />}
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
          <PhotoField currentUrl={photoUrl} photo={photo} onChange={setPhoto} />

          <Input label={t('people.firstName')} value={firstName} onChangeText={setFirstName} error={shown('firstName')} />
          <Input label={t('people.lastName')} value={lastName} onChangeText={setLastName} error={shown('lastName')} />
          <Input
            label={t('people.email')}
            value={email}
            onChangeText={setEmail}
            error={shown('email')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <PhoneInput
            label={t('people.phone')}
            value={phone}
            country={phoneCountry}
            onChangeText={setPhone}
            onChangeCountry={setPhoneCountry}
            error={shown('phone')}
          />
          <MultiSelectField
            label={t('people.staff.groups')}
            placeholder={t('people.chooseGroup')}
            values={groupIds}
            options={groupOptions}
            onChange={setGroupIds}
          />
          <SelectField
            label={t('people.staff.jobTitle')}
            placeholder={t('people.staff.noJobTitle')}
            value={jobTitleId}
            options={jobOptions}
            onChange={setJobTitleId}
          />
          <DateField label={t('people.dateOfBirth')} value={dateOfBirth} onChange={setDateOfBirth} error={shown('dateOfBirth')} />
          <Input label={t('people.address')} value={address} onChangeText={setAddress} error={shown('address')} />

          {!editing ? <Text style={styles.note}>{t('people.staff.passwordNote')}</Text> : null}

          <Button title={editing ? t('common.save') : t('people.staff.add')} onPress={save} loading={saving} fullWidth />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
    note: {
      fontSize: fontSize.sm,
      fontFamily: 'Cairo_400Regular',
      color: theme.colors.textMuted,
      textAlign: 'left',
      marginBottom: spacing.lg,
    },
  });
}

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
import { PhoneInput } from '../../components/ui/PhoneInput';
import { DateField } from '../../components/ui/DateField';
import { PhotoField } from '../../components/people/PhotoField';
import { spacing } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { studentsApi } from '../../services/api/students.api';
import { groupsApi } from '../../services/api/groups.api';
import { EDUCATION_STAGES, type EducationStage } from '../../utils/educationStages';
import { splitPhone, toE164Phone } from '../../utils/phoneNumber';
import { getFullImageUrl } from '../../utils/imageUrl';
import { normalizeStudentCode, STUDENT_CODE_PATTERN } from '../../utils/studentCode';
import { EMAIL_PATTERN } from '../../utils/email';
import type { Group } from '../../types/group.types';
import type { PhotoAsset } from '../../types/people.types';
import type { ProfileStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'StudentForm'>;

const NO_GROUP = '';
const NO_STAGE = '';

export default function StudentFormScreen({ navigation, route }: Props) {
  const studentId = route.params?.studentId;
  const editing = !!studentId;
  const { theme } = useTheme();
  const { t } = useRTL();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>(splitPhone(null).country);
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianCountry, setGuardianCountry] = useState<CountryCode>(splitPhone(null).country);
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string>(NO_GROUP);
  const [stage, setStage] = useState<string>(NO_STAGE);
  const [code, setCode] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photo, setPhoto] = useState<PhotoAsset | null>(null);

  const loadStudent = async () => {
    if (!studentId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const student = await studentsApi.getById(studentId);
      setFirstName(student.firstName);
      setLastName(student.lastName);
      setEmail(student.email);
      setAddress(student.address ?? '');
      const main = splitPhone(student.phoneNumber);
      setPhone(main.national);
      setPhoneCountry(main.country);
      const guardian = splitPhone(student.guardianPhoneNumber);
      setGuardianPhone(guardian.national);
      setGuardianCountry(guardian.country);
      setDateOfBirth(student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : null);
      setGroupId(student.groups[0]?.id ? String(student.groups[0].id) : NO_GROUP);
      setStage(student.educationStage ?? NO_STAGE);
      setCode(student.code ?? '');
      setPhotoUrl(getFullImageUrl(student.profileImage) ?? null);
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
    loadStudent();
  }, [studentId]);

  const phoneE164 = toE164Phone(phone, phoneCountry);
  const guardianE164 = toE164Phone(guardianPhone, guardianCountry);
  const trimmedCode = code.trim();

  const errors = {
    firstName: !firstName.trim() ? t('validation.required') : undefined,
    lastName: !lastName.trim() ? t('validation.required') : undefined,
    email: !email.trim()
      ? t('validation.required')
      : !EMAIL_PATTERN.test(email.trim())
      ? t('validation.invalidEmail')
      : undefined,
    phone: !phone.trim() ? t('validation.required') : !phoneE164 ? t('validation.invalidPhone') : undefined,
    guardianPhone: guardianPhone.trim() && !guardianE164 ? t('validation.invalidPhone') : undefined,
    code: trimmedCode && !STUDENT_CODE_PATTERN.test(trimmedCode) ? t('people.students.codeError') : undefined,
  };
  const shown = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);

  const groupOptions = useMemo(
    () => [{ value: NO_GROUP, label: t('people.noGroup') }, ...groups.map((g) => ({ value: String(g.id), label: g.name }))],
    [groups, t]
  );
  const stageOptions = useMemo(
    () => [
      { value: NO_STAGE, label: t('people.students.noStage') },
      ...EDUCATION_STAGES.map((s) => ({ value: s, label: t(`educationStages.${s}`) })),
    ],
    [t]
  );

  const save = async () => {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean) || saving) return;
    setSaving(true);
    const values = {
      id: studentId,
      firstName,
      lastName,
      email,
      address,
      phoneNumber: phoneE164 ?? '',
      guardianPhoneNumber: guardianE164,
      dateOfBirth,
      groupId: groupId ? Number(groupId) : null,
      code: normalizeStudentCode(trimmedCode),
      educationStage: (stage || null) as EducationStage | null,
      photo,
    };
    try {
      if (editing) await studentsApi.update(values);
      else await studentsApi.create(values);
      Alert.alert(t('common.success'), editing ? t('people.updated') : t('people.students.created'));
      navigation.goBack();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('people.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const title = editing ? t('people.students.edit') : t('people.students.add');

  if (loading || loadError) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={title} onBack={() => navigation.goBack()} />
        {loading ? <Spinner /> : <ErrorRetry message={loadError ?? ''} onRetry={loadStudent} />}
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
            editable={!editing}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            hint={editing ? t('people.emailLocked') : undefined}
          />
          <PhoneInput
            label={t('people.phone')}
            value={phone}
            country={phoneCountry}
            onChangeText={setPhone}
            onChangeCountry={setPhoneCountry}
            error={shown('phone')}
          />
          <PhoneInput
            label={t('people.students.guardianPhone')}
            value={guardianPhone}
            country={guardianCountry}
            onChangeText={setGuardianPhone}
            onChangeCountry={setGuardianCountry}
            error={shown('guardianPhone')}
          />
          <SelectField
            label={t('people.group')}
            placeholder={t('people.chooseGroup')}
            value={groupId}
            options={groupOptions}
            onChange={setGroupId}
          />
          <SelectField
            label={t('people.students.stage')}
            placeholder={t('people.students.noStage')}
            value={stage}
            options={stageOptions}
            onChange={setStage}
          />
          <Input
            label={t('people.students.code')}
            value={code}
            onChangeText={(value) => setCode(value.toUpperCase())}
            placeholder={t('people.students.codePlaceholder')}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={20}
            error={shown('code')}
            hint={editing ? t('people.students.codeEditHint') : undefined}
          />
          <DateField label={t('people.dateOfBirth')} value={dateOfBirth} onChange={setDateOfBirth} />
          <Input label={t('people.address')} value={address} onChangeText={setAddress} />

          {!editing ? <Text style={styles.note}>{t('people.students.passwordNote')}</Text> : null}

          <Button title={editing ? t('common.save') : t('people.students.add')} onPress={save} loading={saving} fullWidth />
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

import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useAuth } from '../../hooks/useAuth';
import { useDisplayFormat, isolate } from '../../hooks/useDisplayFormat';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Avatar } from '../../components/ui/Avatar';
import { Chip } from '../../components/ui/Chip';
import { Spinner } from '../../components/ui/Spinner';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { StudentCodeButton } from '../../components/profile/StudentCodeButton';
import { GuardianLinkSheet } from '../../components/people/GuardianLinkSheet';
import { StudentCoursesPanel } from '../../components/people/StudentCoursesPanel';
import { StudentExamsPanel } from '../../components/people/StudentExamsPanel';
import { StudentWalletPanel } from '../../components/people/StudentWalletPanel';
import { StudentWhatsAppPanel } from '../../components/people/StudentWhatsAppPanel';
import { InfoList, ActionList, type ActionItem } from '../../components/people/PersonSections';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { REQUEST_ONLY } from '../../config/storePolicy';
import { studentsApi } from '../../services/api/students.api';
import { getFullImageUrl } from '../../utils/imageUrl';
import { parseServerDate } from '../../utils/date';
import { fullName } from '../../utils/personName';
import type { ManagedStudent } from '../../types/people.types';
import type { ProfileStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'StudentDetail'>;
type Tab = 'courses' | 'exams' | 'wallet' | 'whatsapp';

export default function StudentDetailScreen({ navigation, route }: Props) {
  const { studentId } = route.params;
  const { theme } = useTheme();
  const { t } = useRTL();
  const { can, canModule } = useAuth();
  const { date } = useDisplayFormat();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [student, setStudent] = useState<ManagedStudent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('courses');
  const [guardianOpen, setGuardianOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setStudent(await studentsApi.getById(studentId));
    } catch (err: any) {
      setError(err?.userMessage || t('people.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [studentId, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const canWallet = !REQUEST_ONLY && canModule('Wallet', 'view');
  const canWhatsApp = canModule('WhatsApp', 'view');

  const confirmDelete = () =>
    Alert.alert(t('people.students.deleteTitle'), t('people.students.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await studentsApi.remove(studentId);
            Alert.alert(t('common.success'), t('people.deleted'));
            navigation.goBack();
          } catch (err: any) {
            Alert.alert(t('common.error'), err?.userMessage || t('people.deleteFailed'));
          }
        },
      },
    ]);

  if (loading || error || !student) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('people.students.profile')} onBack={() => navigation.goBack()} />
        {loading ? <Spinner /> : <ErrorRetry message={error ?? ''} onRetry={load} />}
      </View>
    );
  }

  const name = fullName(student);
  const image = getFullImageUrl(student.profileImage);
  const tabs: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'courses', label: t('people.students.courses'), icon: 'book-outline' },
    { key: 'exams', label: t('people.students.exams'), icon: 'document-text-outline' },
    ...(canWallet ? [{ key: 'wallet' as Tab, label: t('people.students.wallet'), icon: 'star-outline' as const }] : []),
    ...(canWhatsApp ? [{ key: 'whatsapp' as Tab, label: t('people.students.whatsapp'), icon: 'logo-whatsapp' as const }] : []),
  ];

  const actions: ActionItem[] = [
    { icon: 'create-outline', label: t('common.edit'), onPress: () => navigation.navigate('StudentForm', { studentId }) },
    { icon: 'people-outline', label: t('people.guardian.action'), onPress: () => setGuardianOpen(true) },
    ...(can('DEVICE_PROTECTION')
      ? [{ icon: 'phone-portrait-outline' as const, label: t('people.devices.title'), onPress: () => navigation.navigate('StudentDevices', { studentId }) }]
      : []),
    { icon: 'trash-outline', label: t('common.delete'), onPress: confirmDelete, danger: true },
  ];

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('people.students.profile')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing['3xl'] }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: theme.colors.heroBackground }]}>
          <Avatar source={image ? { uri: image } : undefined} name={name} dimension={80} radius={26} />
          <Text style={styles.heroName}>{name}</Text>
          <View style={styles.heroPills}>
            {student.code ? <StudentCodeButton code={student.code} /> : null}
            {student.groups[0]?.name ? (
              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>{student.groups[0].name}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <InfoList
          items={[
            { icon: 'school-outline', label: t('people.students.stage'), value: student.educationStage ? t(`educationStages.${student.educationStage}`) : null },
            { icon: 'mail-outline', label: t('people.email'), value: student.email || null },
            { icon: 'call-outline', label: t('people.phone'), value: student.phoneNumber ? isolate(student.phoneNumber) : null },
            {
              icon: 'people-outline',
              label: t('people.students.guardianPhone'),
              value: student.guardianPhoneNumber ? isolate(student.guardianPhoneNumber) : null,
            },
            { icon: 'calendar-outline', label: t('people.dateOfBirth'), value: student.dateOfBirth ? date(parseServerDate(student.dateOfBirth.slice(0, 10))) : null },
            { icon: 'location-outline', label: t('people.address'), value: student.address || null },
          ]}
        />

        <ActionList items={actions} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {tabs.map((item) => (
            <Chip key={item.key} label={item.label} icon={item.icon} active={tab === item.key} onPress={() => setTab(item.key)} />
          ))}
        </ScrollView>

        {tab === 'courses' ? <StudentCoursesPanel studentId={studentId} /> : null}
        {tab === 'exams' ? (
          <StudentExamsPanel
            studentId={studentId}
            onOpenResult={(examId) => navigation.navigate('ExamResult', { examId, studentId })}
          />
        ) : null}
        {tab === 'wallet' && canWallet ? (
          <StudentWalletPanel studentId={studentId} canEdit={canModule('Wallet', 'edit')} />
        ) : null}
        {tab === 'whatsapp' && canWhatsApp ? (
          <StudentWhatsAppPanel
            studentId={studentId}
            canEdit={canModule('WhatsApp', 'edit')}
            canSend={canModule('WhatsApp', 'create')}
          />
        ) : null}
      </ScrollView>

      <GuardianLinkSheet visible={guardianOpen} studentId={studentId} studentName={name} onClose={() => setGuardianOpen(false)} />
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { paddingHorizontal: spacing.xl, gap: spacing.lg },
    hero: { borderRadius: 24, alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
    heroName: { ...typography.h3, color: '#FFFFFF', textAlign: 'center' },
    heroPills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
    heroPill: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.2)' },
    heroPillText: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', color: '#FFFFFF' },
    tabs: { gap: spacing.sm },
  });
}

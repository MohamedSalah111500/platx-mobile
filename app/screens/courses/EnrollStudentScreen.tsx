import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useSound } from '../../hooks/useSound';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { EmptyState } from '../../components/ui/EmptyState';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { studentsApi, type TopStudent } from '../../services/api/students.api';
import { reservationsApi } from '../../services/api/reservations.api';
import type { HomeStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<HomeStackParamList, 'EnrollStudent'>;

export default function EnrollStudentScreen({ navigation, route }: Props) {
  const { courseId, courseName } = route.params;
  const { theme } = useTheme();
  const { t, isRTL } = useRTL();
  const { play } = useSound();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<TopStudent[]>([]);
  const [search, setSearch] = useState('');
  const [enrollingId, setEnrollingId] = useState<number | null>(null);
  const [enrolledIds, setEnrolledIds] = useState<Set<number>>(new Set());

  useEffect(() => { loadStudents(); }, []);

  const loadStudents = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await studentsApi.getAll();
      setStudents(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.userMessage || t('enrollStudent.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const name = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
    const email = (s.email || '').toLowerCase();
    const query = search.trim().toLowerCase();
    return !query || name.includes(query) || email.includes(query);
  });

  const confirmEnroll = (student: TopStudent) => {
    const name = `${student.firstName || ''} ${student.lastName || ''}`.trim();
    play('tap');
    Alert.alert(
      t('enrollStudent.confirmTitle'),
      t('enrollStudent.confirmMessage', { name, course: courseName || '' }),
      [
        { text: t('enrollStudent.cancel'), style: 'cancel' },
        { text: t('enrollStudent.confirm'), onPress: () => handleEnroll(student) },
      ],
    );
  };

  const handleEnroll = async (student: TopStudent) => {
    setEnrollingId(student.id);
    try {
      await reservationsApi.enrollStudentDirectly(student.id, courseId);
      setEnrolledIds((prev) => new Set(prev).add(student.id));
      play('success');
      Alert.alert(t('common.success'), t('enrollStudent.success'));
    } catch (err: any) {
      const message = err?.userMessage?.includes?.('already enrolled')
        ? t('enrollStudent.alreadyEnrolled')
        : err?.userMessage || t('enrollStudent.failed');
      Alert.alert(t('common.error'), message);
    } finally {
      setEnrollingId(null);
    }
  };

  const getInitial = (student: TopStudent): string =>
    (student.firstName?.[0] || '?').toUpperCase();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: theme.colors.divider }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {t('enrollStudent.title')}
          </Text>
          {courseName ? (
            <Text style={[styles.headerSubtitle, { color: theme.colors.textMuted }]} numberOfLines={1}>
              {courseName}
            </Text>
          ) : null}
        </View>
        <View style={{ width: 22 }} />
      </View>

      <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg }}>
        <Input
          placeholder={t('enrollStudent.searchPlaceholder')}
          value={search}
          onChangeText={setSearch}
          leftIcon={<Ionicons name="search" size={18} color={theme.colors.textMuted} />}
          containerStyle={{ marginBottom: 0 }}
        />
      </View>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorRetry message={error} onRetry={loadStudents} />
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xl }}
          ListEmptyComponent={
            <EmptyState
              icon={<Ionicons name="people-outline" size={48} color={theme.colors.textMuted} />}
              title={search ? t('enrollStudent.noStudents') : t('enrollStudent.noStudentsYet')}
            />
          }
          renderItem={({ item }) => {
            const name = `${item.firstName || ''} ${item.lastName || ''}`.trim();
            const isEnrolled = enrolledIds.has(item.id);
            const isBusy = enrollingId === item.id;
            return (
              <TouchableOpacity
                style={[styles.studentRow, { backgroundColor: theme.colors.card }]}
                onPress={() => !isEnrolled && !isBusy && confirmEnroll(item)}
                activeOpacity={0.75}
                disabled={isEnrolled || isBusy}
              >
                <View style={[styles.avatar, { backgroundColor: theme.colors.primaryLight }]}>
                  <Text style={[styles.avatarText, { color: theme.colors.primary }]}>{getInitial(item)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.studentName, { color: theme.colors.text }]} numberOfLines={1}>
                    {name}
                  </Text>
                  {item.email ? (
                    <Text style={[styles.studentEmail, { color: theme.colors.textMuted }]} numberOfLines={1}>
                      {item.email}
                    </Text>
                  ) : null}
                </View>
                {isBusy ? (
                  <Spinner size="small" />
                ) : isEnrolled ? (
                  <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
                ) : (
                  <View style={[styles.enrollPill, { backgroundColor: theme.colors.primary + '15' }]}>
                    <Text style={[styles.enrollPillText, { color: theme.colors.primary }]}>
                      {t('enrollStudent.confirm')}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { width: 22, alignItems: 'flex-start' },
  headerTitle: { fontSize: fontSize.lg, fontFamily: 'Cairo_700Bold' },
  headerSubtitle: { fontSize: fontSize.xs, fontFamily: 'Cairo_400Regular', marginTop: 1 },

  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: fontSize.sm, fontFamily: 'Cairo_700Bold' },
  studentName: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold' },
  studentEmail: { fontSize: 12, fontFamily: 'Cairo_400Regular', marginTop: 2 },
  enrollPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  enrollPillText: { fontSize: 12, fontFamily: 'Cairo_700Bold' },
});

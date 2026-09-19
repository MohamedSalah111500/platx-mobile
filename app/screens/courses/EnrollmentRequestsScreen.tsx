import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Image, Alert, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useSound } from '../../hooks/useSound';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { reservationsApi } from '../../services/api/reservations.api';
import { getFullImageUrl } from '../../utils/imageUrl';
import { PAYMENT_METHOD_INSTAPAY, PAYMENT_METHOD_VODAFONE, type PendingReservation } from '../../types/reservation.types';
import { REQUEST_ONLY } from '../../config/storePolicy';
import type { HomeStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<HomeStackParamList, 'EnrollmentRequests'>;

export default function EnrollmentRequestsScreen({ navigation, route }: Props) {
  const courseId = route.params?.courseId;
  const courseName = route.params?.courseName;
  const { theme } = useTheme();
  const { t } = useRTL();
  const { play } = useSound();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<PendingReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async (refresh = false) => {
    try {
      setError(null);
      refresh ? setRefreshing(true) : setLoading(true);
      const all = await reservationsApi.getPending();
      setItems(courseId ? all.filter((r) => Number(r.courseId) === Number(courseId)) : all);
    } catch (err: any) {
      setError(err?.userMessage || t('enrollmentRequests.loadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courseId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const studentName = (r: PendingReservation) =>
    `${r.student?.firstName ?? ''} ${r.student?.lastName ?? ''}`.trim() || t('enrollmentRequests.unknownStudent');

  const paymentLabel = (method?: number | null) => {
    if (method === PAYMENT_METHOD_VODAFONE) return t('enrollmentRequests.vodafone');
    if (method === PAYMENT_METHOD_INSTAPAY) return t('enrollmentRequests.instapay');
    return null;
  };

  const decide = (r: PendingReservation, approve: boolean) => {
    play('tap');
    Alert.alert(
      t(approve ? 'enrollmentRequests.confirmApproveTitle' : 'enrollmentRequests.confirmRejectTitle'),
      t(approve ? 'enrollmentRequests.confirmApprove' : 'enrollmentRequests.confirmReject', {
        name: studentName(r),
        course: r.course?.name ?? r.course?.title ?? '',
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t(approve ? 'enrollmentRequests.approve' : 'enrollmentRequests.reject'),
          style: approve ? 'default' : 'destructive',
          onPress: () => run(r, approve),
        },
      ],
    );
  };

  const run = async (r: PendingReservation, approve: boolean) => {
    setBusyId(r.id);
    try {
      if (approve) await reservationsApi.approve(r.id);
      else await reservationsApi.reject(r.id);
      setItems((prev) => prev.filter((x) => x.id !== r.id));
      play('success');
      Alert.alert(t('common.success'), t(approve ? 'enrollmentRequests.approved' : 'enrollmentRequests.rejected'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('enrollmentRequests.failed'));
    } finally {
      setBusyId(null);
    }
  };

  const styles = useMemo(() => createStyles(theme), [theme]);

  const renderItem = ({ item }: { item: PendingReservation }) => {
    const proof = item.reservationImg ? getFullImageUrl(item.reservationImg) : null;
    const payment = paymentLabel(item.paymentMethod);
    const busy = busyId === item.id;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={18} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{studentName(item)}</Text>
            {item.student?.email ? <Text style={styles.email} numberOfLines={1}>{item.student.email}</Text> : null}
          </View>
          <Text style={styles.date}>{new Date(item.requestDate || item.creationTime || Date.now()).toLocaleDateString()}</Text>
        </View>

        {!courseId && (item.course?.name || item.course?.title) ? (
          <View style={styles.metaRow}>
            <Ionicons name="book-outline" size={14} color={theme.colors.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>{item.course?.name || item.course?.title}</Text>
          </View>
        ) : null}

        {payment ? (
          <View style={styles.metaRow}>
            <Ionicons name="card-outline" size={14} color={theme.colors.textMuted} />
            <Text style={styles.metaText}>{t('enrollmentRequests.paymentMethod')}: {payment}</Text>
          </View>
        ) : null}

        {item.studentMessage ? (
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{item.studentMessage}</Text>
          </View>
        ) : null}

        {proof ? <Image source={{ uri: proof }} style={styles.proof} resizeMode="cover" /> : null}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.colors.danger + '14' }]}
            onPress={() => decide(item, false)}
            disabled={busy}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle-outline" size={18} color={theme.colors.danger} />
            <Text style={[styles.actionText, { color: theme.colors.danger }]}>{t('enrollmentRequests.reject')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => decide(item, true)}
            disabled={busy}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
            <Text style={[styles.actionText, { color: '#fff' }]}>{busy ? t('common.loading') : t('enrollmentRequests.approve')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('enrollmentRequests.title')} onBack={() => navigation.goBack()} />
      {courseName ? <Text style={styles.courseName} numberOfLines={1}>{courseName}</Text> : null}

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorRetry message={error} onRetry={() => load()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing['3xl'] }]}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.primary} colors={[theme.colors.primary]} progressBackgroundColor={theme.colors.card} />}
          ListEmptyComponent={
            <EmptyState
              title={t('enrollmentRequests.empty')}
              message={t(REQUEST_ONLY ? 'enrollmentRequests.joinEmptyHint' : 'enrollmentRequests.emptyHint')}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    courseName: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, fontSize: fontSize.base, fontFamily: 'Cairo_600SemiBold', color: theme.colors.textSecondary },
    list: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: spacing.md,
      gap: spacing.sm,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
    name: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', color: theme.colors.text },
    email: { fontSize: fontSize.xs, fontFamily: 'Cairo_400Regular', color: theme.colors.textMuted },
    date: { fontSize: fontSize.xs, fontFamily: 'Cairo_500Medium', color: theme.colors.textMuted },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { flex: 1, fontSize: fontSize.sm, fontFamily: 'Cairo_500Medium', color: theme.colors.textSecondary },
    messageBox: { backgroundColor: theme.colors.surface, borderRadius: borderRadius.md, padding: spacing.sm },
    messageText: { fontSize: fontSize.sm, lineHeight: 20, fontFamily: 'Cairo_400Regular', color: theme.colors.textSecondary },
    proof: { width: '100%', height: 160, borderRadius: borderRadius.lg, backgroundColor: theme.colors.surface },
    actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.sm + 2, borderRadius: borderRadius.full },
    actionText: { fontSize: fontSize.sm, fontFamily: 'Cairo_700Bold' },
  });
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useDisplayFormat } from '../../hooks/useDisplayFormat';
import { SearchBar } from '../ui/SearchBar';
import { Chip } from '../ui/Chip';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { ErrorRetry } from '../ui/ErrorRetry';
import { spacing } from '../../theme/spacing';
import { fontSize, buttonLineHeight } from '../../theme/typography';
import { reservationsApi } from '../../services/api/reservations.api';
import { getFullImageUrl } from '../../utils/imageUrl';
import { parseServerDate } from '../../utils/date';
import { PROCESSED_STATUS, type ProcessedReservation } from '../../types/course.types';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 500;
const DELETION_WARNING_DAYS = 7;

export function ProcessedRequestsList() {
  const { theme } = useTheme();
  const { t } = useRTL();
  const { date } = useDisplayFormat();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [items, setItems] = useState<ProcessedReservation[]>([]);
  const [total, setTotal] = useState(0);
  const [retentionDays, setRetentionDays] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (pageNum: number, mode: 'initial' | 'more' | 'refresh' = 'initial') => {
      if (mode === 'initial') setLoading(true);
      if (mode === 'more') setLoadingMore(true);
      if (mode === 'refresh') setRefreshing(true);
      setError(null);
      try {
        const res = await reservationsApi.getProcessed({ page: pageNum, size: PAGE_SIZE, search: term, status });
        setItems((prev) => (pageNum === 1 ? res.items : [...prev, ...res.items]));
        setTotal(res.totalCount);
        setRetentionDays(res.retentionDays);
        setPage(pageNum);
      } catch (err: any) {
        setError(err?.userMessage || t('enrollmentRequests.loadFailed'));
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [term, status, t]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const onSearch = (value: string) => {
    setSearch(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTerm(value.trim()), SEARCH_DEBOUNCE_MS);
  };

  const statusMeta = (value: number) =>
    value === PROCESSED_STATUS.Approved
      ? { label: t('courseManage.processed.approved'), color: theme.colors.success }
      : value === PROCESSED_STATUS.Rejected
      ? { label: t('courseManage.processed.rejected'), color: theme.colors.danger }
      : { label: t('courseManage.processed.cancelled'), color: theme.colors.textMuted };

  const filters = [
    { value: null, label: t('courseManage.history.all') },
    { value: PROCESSED_STATUS.Approved, label: t('courseManage.processed.approved') },
    { value: PROCESSED_STATUS.Rejected, label: t('courseManage.processed.rejected') },
  ];

  const renderItem = ({ item }: { item: ProcessedReservation }) => {
    const meta = statusMeta(item.status);
    const receipt = item.receiptUrl ? getFullImageUrl(item.receiptUrl) : null;
    const soon = item.daysUntilDeletion <= DELETION_WARNING_DAYS;
    return (
      <View style={styles.card}>
        <View style={styles.top}>
          <Text style={styles.name} numberOfLines={1}>{item.studentName}</Text>
          <View style={[styles.pill, { backgroundColor: meta.color + '1A' }]}>
            <Text style={[styles.pillText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
        {item.studentEmail ? <Text style={styles.meta} numberOfLines={1}>{item.studentEmail}</Text> : null}
        <Text style={styles.course} numberOfLines={2}>{item.courseName}</Text>
        {item.processedDate ? (
          <Text style={styles.meta}>{t('courseManage.processed.processedOn', { date: date(parseServerDate(item.processedDate)) })}</Text>
        ) : null}
        {item.adminNotes ? <Text style={styles.meta}>{item.adminNotes}</Text> : null}
        <View style={styles.bottom}>
          <Text style={[styles.meta, soon && { color: theme.colors.warning }]}>
            {t('courseManage.processed.deletesIn', { days: Math.max(0, item.daysUntilDeletion) })}
          </Text>
          {receipt ? (
            <TouchableOpacity onPress={() => Linking.openURL(receipt).catch(() => undefined)} accessibilityRole="link" style={styles.receipt}>
              <Ionicons name="receipt-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.receiptText}>{t('courseManage.processed.receipt')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SearchBar value={search} onChangeText={onSearch} placeholder={t('courseStudents.search')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {filters.map((f) => (
            <Chip key={String(f.value)} label={f.label} active={status === f.value} onPress={() => setStatus(f.value)} />
          ))}
        </ScrollView>
        {retentionDays ? <Text style={styles.meta}>{t('courseManage.processed.retention', { days: retentionDays })}</Text> : null}
      </View>
      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorRetry message={error} onRetry={() => load(1)} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing['3xl'] }]}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          onEndReached={() => {
            if (!loadingMore && items.length < total) load(page + 1, 'more');
          }}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(1, 'refresh')}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
              progressBackgroundColor={theme.colors.card}
            />
          }
          ListEmptyComponent={<EmptyState title={t('courseManage.processed.empty')} />}
          ListFooterComponent={loadingMore ? <Spinner size="small" /> : null}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.md },
    chips: { gap: spacing.sm },
    list: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
    card: { backgroundColor: theme.colors.card, borderRadius: 18, padding: spacing.md, gap: 4 },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    name: { flex: 1, fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', color: theme.colors.text, textAlign: 'left' },
    pill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 999 },
    pillText: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold', lineHeight: buttonLineHeight(fontSize.sm), includeFontPadding: false },
    course: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold', color: theme.colors.textSecondary, textAlign: 'left' },
    meta: { fontSize: fontSize.sm, fontFamily: 'Cairo_400Regular', color: theme.colors.textMuted, textAlign: 'left' },
    bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: 4 },
    receipt: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    receiptText: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold', color: theme.colors.primary, lineHeight: buttonLineHeight(fontSize.sm), includeFontPadding: false },
  });
}

export default ProcessedRequestsList;

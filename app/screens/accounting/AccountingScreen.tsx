import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useAuth } from '../../hooks/useAuth';
import { useDisplayFormat, isolate } from '../../hooks/useDisplayFormat';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Spinner } from '../../components/ui/Spinner';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Chip } from '../../components/ui/Chip';
import { DateField } from '../../components/ui/DateField';
import { SelectField } from '../../components/ui/SelectField';
import { ActionSheet } from '../../components/ui/ActionSheet';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize, typography } from '../../theme/typography';
import { formatAmount } from '../../utils/price';
import { parseServerDate } from '../../utils/date';
import { sheetFrame } from '../../utils/responsive';
import {
  accountingApi,
  LedgerEntryOrigin,
  LedgerEntryType,
  LedgerPaymentMethod,
  MANUAL_METHODS,
  SaleItemKind,
  type AccountingSummary,
  type CategoryTotal,
  type LedgerCategory,
  type LedgerEntry,
} from '../../services/api/accounting.api';
import type { ProfileStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Accounting'>;
type Period = 'thisMonth' | 'lastMonth' | 'thisYear';

const PERIODS: Period[] = ['thisMonth', 'lastMonth', 'thisYear'];
const PAGE_SIZE = 20;
const MAX_AMOUNT = 100000000;

function rangeOf(period: Period): { from: string; to: string } {
  const now = new Date();
  if (period === 'thisYear') {
    return { from: new Date(now.getFullYear(), 0, 1).toISOString(), to: new Date(now.getFullYear() + 1, 0, 1).toISOString() };
  }
  const shift = period === 'lastMonth' ? -1 : 0;
  return {
    from: new Date(now.getFullYear(), now.getMonth() + shift, 1).toISOString(),
    to: new Date(now.getFullYear(), now.getMonth() + shift + 1, 1).toISOString(),
  };
}

function todayValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface Draft {
  id: number | null;
  type: LedgerEntryType;
  amount: string;
  date: string | null;
  categoryId: string | null;
  method: string;
  description: string;
}

export default function AccountingScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const { canModule } = useAuth();
  const { date } = useDisplayFormat();
  const insets = useSafeAreaInsets();
  const canCreate = canModule('Accounting', 'create');
  const canEdit = canModule('Accounting', 'edit');
  const canDelete = canModule('Accounting', 'delete');

  const [period, setPeriod] = useState<Period>('thisMonth');
  const [currency, setCurrency] = useState<string | null>(null);
  const [summary, setSummary] = useState<AccountingSummary | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<LedgerCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<LedgerEntry | null>(null);

  const range = useMemo(() => rangeOf(period), [period]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await accountingApi.summary(range.from, range.to, currency);
      const list = await accountingApi.entries(range.from, range.to, result.currencyCode, 1, PAGE_SIZE);
      setSummary(result);
      setEntries(list.items);
      setTotal(list.totalCount);
      setPage(1);
    } catch (err: any) {
      setError(err?.userMessage || t('accounting.loadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range, currency, t]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    accountingApi.categories().then(setCategories).catch(() => undefined);
  }, []);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const list = await accountingApi.entries(range.from, range.to, summary?.currencyCode ?? currency, page + 1, PAGE_SIZE);
      setEntries((prev) => [...prev, ...list.items]);
      setTotal(list.totalCount);
      setPage(page + 1);
    } catch {
    } finally {
      setLoadingMore(false);
    }
  };

  const money = (value: number) => isolate(formatAmount(value));

  const categoryLabel = (key: string | null, name: string | null) =>
    key ? t(`accounting.categories.${key}`) : name ?? '';

  const totalLabel = (row: CategoryTotal, type: LedgerEntryType) =>
    row.categoryId === null
      ? t(type === LedgerEntryType.Income ? 'accounting.platformSales' : 'accounting.uncategorized')
      : categoryLabel(row.systemKey, row.name);

  const itemLabel = (kind: SaleItemKind | null) => t(`accounting.items.${SaleItemKind[kind ?? SaleItemKind.Course]}`);
  const methodLabel = (method: LedgerPaymentMethod) => t(`accounting.methods.${LedgerPaymentMethod[method]}`);

  const entryTitle = (entry: LedgerEntry) =>
    entry.origin === LedgerEntryOrigin.Sale ? entry.itemTitle || itemLabel(entry.saleItem) : categoryLabel(entry.categoryKey, entry.categoryName);

  const entryMeta = (entry: LedgerEntry) => {
    const parts =
      entry.origin === LedgerEntryOrigin.Sale
        ? [itemLabel(entry.saleItem), entry.studentName]
        : [entry.description];
    return [...parts, methodLabel(entry.paymentMethod), date(parseServerDate(entry.occurredAt))].filter(Boolean).join(' · ');
  };

  const openCreate = () => {
    setSubmitted(false);
    setDraft({ id: null, type: LedgerEntryType.Expense, amount: '', date: todayValue(), categoryId: null, method: String(LedgerPaymentMethod.Cash), description: '' });
  };

  const openEdit = (entry: LedgerEntry) => {
    setSubmitted(false);
    setDraft({
      id: entry.id,
      type: entry.type,
      amount: String(entry.amount),
      date: entry.occurredAt.slice(0, 10),
      categoryId: entry.categoryId ? String(entry.categoryId) : null,
      method: String(entry.paymentMethod),
      description: entry.description ?? '',
    });
  };

  const numericAmount = Number((draft?.amount ?? '').replace(',', '.'));
  const amountError =
    !draft?.amount.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > MAX_AMOUNT
      ? t('accounting.amountInvalid')
      : undefined;
  const dateError = !draft?.date ? t('accounting.dateRequired') : undefined;
  const categoryError = !draft?.categoryId ? t('accounting.categoryRequired') : undefined;

  const save = async () => {
    setSubmitted(true);
    if (!draft || amountError || dateError || categoryError || saving) return;
    setSaving(true);
    const payload = {
      type: draft.type,
      amount: Math.round(numericAmount * 100) / 100,
      occurredAt: draft.date!,
      categoryId: Number(draft.categoryId),
      paymentMethod: Number(draft.method) as LedgerPaymentMethod,
      description: draft.description.trim() || null,
    };
    try {
      if (draft.id) await accountingApi.update(draft.id, payload);
      else await accountingApi.create(payload);
      setDraft(null);
      Alert.alert(t('common.success'), t(draft.id ? 'accounting.entryUpdated' : 'accounting.entryAdded'));
      await load();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('accounting.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (entry: LedgerEntry) => {
    Alert.alert(t('accounting.deleteTitle'), t('accounting.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await accountingApi.remove(entry.id);
            await load();
          } catch (err: any) {
            Alert.alert(t('common.error'), err?.userMessage || t('accounting.saveFailed'));
          }
        },
      },
    ]);
  };

  const onEntryPress = (entry: LedgerEntry) => {
    if (entry.origin === LedgerEntryOrigin.Sale) {
      Alert.alert(t('accounting.platformSales'), t('accounting.saleLocked'));
      return;
    }
    if (canEdit || canDelete) setSelected(entry);
  };

  const sheetActions = selected
    ? [
        ...(canEdit ? [{ key: 'edit', label: t('common.edit'), icon: 'create-outline' as const, onPress: () => openEdit(selected) }] : []),
        ...(canDelete ? [{ key: 'delete', label: t('common.delete'), icon: 'trash-outline' as const, danger: true, onPress: () => confirmDelete(selected) }] : []),
      ]
    : [];

  const draftCategories = categories
    .filter((c) => c.type === draft?.type)
    .map((c) => ({ value: String(c.id), label: categoryLabel(c.systemKey, c.name) }));
  const methodOptions = MANUAL_METHODS.map((m) => ({ value: String(m), label: methodLabel(m) }));

  const card = [styles.card, { backgroundColor: theme.colors.card }];
  const muted = { color: theme.colors.textMuted };
  const text = { color: theme.colors.text };

  const stat = (label: string, value: number, icon: keyof typeof Ionicons.glyphMap, color: string) => (
    <View style={[styles.stat, { backgroundColor: theme.colors.card }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.statLabel, muted]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.statValue, text]} numberOfLines={1} adjustsFontSizeToFit>{money(value)}</Text>
    </View>
  );

  const renderBody = () => {
    if (loading && !summary) return <Spinner />;
    if (error && !summary) return <ErrorRetry message={error} onRetry={() => { setLoading(true); load(); }} />;
    if (!summary) return null;

    return (
      <>
        <View style={styles.stats}>
          {stat(t('accounting.income'), summary.income, 'trending-up', theme.colors.success)}
          {stat(t('accounting.expenses'), summary.expense, 'trending-down', theme.colors.danger)}
          {stat(t('accounting.net'), summary.net, 'wallet-outline', theme.colors.primary)}
          <View style={[styles.stat, { backgroundColor: theme.colors.card }]}>
            <Ionicons name="cart-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.statLabel, muted]} numberOfLines={1}>{t('accounting.salesCount')}</Text>
            <Text style={[styles.statValue, text]}>{isolate(String(summary.salesCount))}</Text>
          </View>
        </View>
        <Text style={[styles.currencyNote, muted]}>{t('accounting.amountsIn', { currency: summary.currencyCode })}</Text>

        {summary.incomeByMethod.length > 0 && (
          <View style={card}>
            <Text style={[styles.cardTitle, text]}>{t('accounting.byMethod')}</Text>
            {summary.incomeByMethod.map((row) => (
              <View key={row.method} style={[styles.line, { borderColor: theme.colors.divider }]}>
                <Text style={[styles.lineLabel, text]}>{methodLabel(row.method)}</Text>
                <Text style={[styles.lineValue, text]}>{money(row.total)}</Text>
              </View>
            ))}
          </View>
        )}

        {summary.topItems.length > 0 && (
          <View style={card}>
            <Text style={[styles.cardTitle, text]}>{t('accounting.topItems')}</Text>
            {summary.topItems.map((item, index) => (
              <View key={`${item.kind}-${index}`} style={[styles.line, { borderColor: theme.colors.divider }]}>
                <View style={styles.lineBody}>
                  <Text style={[styles.lineLabel, text]} numberOfLines={1}>{item.title}</Text>
                  <Text style={[styles.lineMeta, muted]}>{t('accounting.soldTimes', { count: item.count })}</Text>
                </View>
                <Text style={[styles.lineValue, text]}>{money(item.total)}</Text>
              </View>
            ))}
          </View>
        )}

        {(summary.incomeByCategory.length > 0 || summary.expenseByCategory.length > 0) && (
          <View style={card}>
            <Text style={[styles.cardTitle, text]}>{t('accounting.byCategory')}</Text>
            {summary.incomeByCategory.map((row, index) => (
              <View key={`i-${index}`} style={[styles.line, { borderColor: theme.colors.divider }]}>
                <Text style={[styles.lineLabel, text]} numberOfLines={1}>{totalLabel(row, LedgerEntryType.Income)}</Text>
                <Text style={[styles.lineValue, { color: theme.colors.success }]}>{isolate(`+${formatAmount(row.total)}`)}</Text>
              </View>
            ))}
            {summary.expenseByCategory.map((row, index) => (
              <View key={`e-${index}`} style={[styles.line, { borderColor: theme.colors.divider }]}>
                <Text style={[styles.lineLabel, text]} numberOfLines={1}>{totalLabel(row, LedgerEntryType.Expense)}</Text>
                <Text style={[styles.lineValue, { color: theme.colors.danger }]}>{isolate(`-${formatAmount(row.total)}`)}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.section, muted]}>{t('accounting.entries')}</Text>
        {entries.length === 0 ? (
          <Text style={[styles.empty, muted]}>{t('accounting.noEntries')}</Text>
        ) : (
          entries.map((entry) => {
            const income = entry.type === LedgerEntryType.Income;
            return (
              <TouchableOpacity
                key={entry.id}
                style={[styles.row, { backgroundColor: theme.colors.card }]}
                activeOpacity={0.75}
                onPress={() => onEntryPress(entry)}
                accessibilityRole="button"
              >
                <Ionicons
                  name={entry.origin === LedgerEntryOrigin.Sale ? 'lock-closed-outline' : income ? 'add-circle' : 'remove-circle'}
                  size={24}
                  color={income ? theme.colors.success : theme.colors.danger}
                />
                <View style={styles.rowBody}>
                  <Text style={[styles.rowTitle, text]} numberOfLines={1}>{entryTitle(entry)}</Text>
                  <Text style={[styles.rowMeta, muted]} numberOfLines={2}>{entryMeta(entry)}</Text>
                </View>
                <Text style={[styles.rowAmount, { color: income ? theme.colors.success : theme.colors.danger }]}>
                  {isolate(`${income ? '+' : '-'}${formatAmount(entry.amount)}`)}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
        {entries.length < total ? (
          <Button title={t('accounting.loadMore')} variant="secondary" onPress={loadMore} loading={loadingMore} />
        ) : null}
      </>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom', 'left', 'right']}>
      <ScreenHeader title={t('accounting.title')} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.primary} />}
      >
        <View style={styles.chips}>
          {PERIODS.map((p) => (
            <Chip key={p} label={t(`accounting.periods.${p}`)} active={period === p} onPress={() => setPeriod(p)} />
          ))}
        </View>
        {summary && summary.currencies.length > 1 ? (
          <View style={styles.chips}>
            {summary.currencies.map((c) => (
              <Chip key={c} label={c} active={summary.currencyCode === c} onPress={() => setCurrency(c)} />
            ))}
          </View>
        ) : null}
        {canCreate ? <Button title={t('accounting.addEntry')} onPress={openCreate} fullWidth /> : null}
        {renderBody()}
      </ScrollView>

      <ActionSheet visible={!!selected} actions={sheetActions} onClose={() => setSelected(null)} />

      <Modal visible={!!draft} transparent animationType="slide" onRequestClose={() => setDraft(null)} statusBarTranslucent>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.backdrop} onPress={() => setDraft(null)}>
            <Pressable style={[styles.sheet, { backgroundColor: theme.colors.card, paddingBottom: insets.bottom + spacing.lg }]}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={[styles.sheetTitle, text]}>{t(draft?.id ? 'accounting.editEntry' : 'accounting.addEntry')}</Text>
                <View style={styles.chips}>
                  <Chip
                    label={t('accounting.expense')}
                    icon="remove-circle-outline"
                    active={draft?.type === LedgerEntryType.Expense}
                    onPress={() => setDraft((d) => (d && d.type !== LedgerEntryType.Expense ? { ...d, type: LedgerEntryType.Expense, categoryId: null } : d))}
                  />
                  <Chip
                    label={t('accounting.incomeOne')}
                    icon="add-circle-outline"
                    active={draft?.type === LedgerEntryType.Income}
                    onPress={() => setDraft((d) => (d && d.type !== LedgerEntryType.Income ? { ...d, type: LedgerEntryType.Income, categoryId: null } : d))}
                  />
                </View>
                <Input
                  label={t('accounting.amount')}
                  value={draft?.amount ?? ''}
                  onChangeText={(amount) => setDraft((d) => (d ? { ...d, amount } : d))}
                  keyboardType="decimal-pad"
                  error={submitted ? amountError : undefined}
                />
                <DateField
                  label={t('accounting.date')}
                  value={draft?.date ?? null}
                  onChange={(value) => setDraft((d) => (d ? { ...d, date: value } : d))}
                  error={submitted ? dateError : undefined}
                />
                <SelectField
                  label={t('accounting.category')}
                  placeholder={t('accounting.chooseCategory')}
                  value={draft?.categoryId ?? null}
                  options={draftCategories}
                  onChange={(categoryId) => setDraft((d) => (d ? { ...d, categoryId } : d))}
                  error={submitted ? categoryError : undefined}
                />
                <SelectField
                  label={t('accounting.method')}
                  placeholder={t('accounting.method')}
                  value={draft?.method ?? null}
                  options={methodOptions}
                  onChange={(method) => setDraft((d) => (d ? { ...d, method } : d))}
                />
                <Input
                  label={t('accounting.descriptionOptional')}
                  value={draft?.description ?? ''}
                  onChangeText={(description) => setDraft((d) => (d ? { ...d, description } : d))}
                  placeholder={t('accounting.descriptionPlaceholder')}
                  maxLength={300}
                />
                <Button title={t('common.save')} onPress={save} loading={saving} fullWidth />
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['3xl'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { flexBasis: '48%', flexGrow: 1, borderRadius: borderRadius.xl, padding: spacing.md, gap: 2 },
  statLabel: { fontSize: 14, fontFamily: 'Cairo_500Medium', textAlign: 'left' },
  statValue: { fontSize: fontSize.xl, fontFamily: 'Cairo_700Bold', textAlign: 'left' },
  currencyNote: { fontSize: 14, fontFamily: 'Cairo_400Regular', textAlign: 'left' },
  card: { borderRadius: borderRadius.xl, padding: spacing.lg, gap: spacing.xs },
  cardTitle: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', textAlign: 'left', marginBottom: spacing.xs },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  lineBody: { flex: 1 },
  lineLabel: { flex: 1, fontSize: 14, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },
  lineMeta: { fontSize: 14, fontFamily: 'Cairo_400Regular', textAlign: 'left' },
  lineValue: { fontSize: 14, fontFamily: 'Cairo_700Bold' },
  section: { fontSize: 14, fontFamily: 'Cairo_700Bold', marginTop: spacing.sm, textAlign: 'left' },
  empty: { fontSize: fontSize.sm, fontFamily: 'Cairo_400Regular', textAlign: 'center', paddingVertical: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: borderRadius.xl, padding: spacing.md },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: fontSize.base, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },
  rowMeta: { fontSize: 14, fontFamily: 'Cairo_400Regular', textAlign: 'left' },
  rowAmount: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { ...sheetFrame, maxHeight: '90%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl },
  sheetTitle: { ...typography.h3, textAlign: 'center', marginBottom: spacing.lg },
});

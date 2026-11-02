import React, { useCallback, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useDisplayFormat, isolate } from '../../hooks/useDisplayFormat';
import { Spinner } from '../ui/Spinner';
import { ErrorRetry } from '../ui/ErrorRetry';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize, typography } from '../../theme/typography';
import { walletApi, type Wallet, type WalletTransaction } from '../../services/api/wallet.api';
import { formatAmount } from '../../utils/price';
import { parseServerDate } from '../../utils/date';

import { sheetFrame } from '../../utils/responsive';
const PAGE_SIZE = 10;
const MAX_AMOUNT = 100000;
const MAX_REASON = 300;

type Direction = 'credit' | 'debit';

interface Props {
  studentId: number;
  canEdit: boolean;
}

export function StudentWalletPanel({ studentId, canEdit }: Props) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const { date } = useDisplayFormat();
  const insets = useSafeAreaInsets();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [items, setItems] = useState<WalletTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<Direction | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadHistory = useCallback(
    async (pageNum: number) => {
      const res = await walletApi.studentTransactions(studentId, pageNum, PAGE_SIZE);
      setItems((prev) => (pageNum === 1 ? res.items : [...prev, ...res.items]));
      setTotal(res.totalCount);
      setPage(pageNum);
    },
    [studentId]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [balance] = await Promise.all([walletApi.studentWallet(studentId), loadHistory(1)]);
      setWallet(balance);
    } catch (err: any) {
      setError(err?.userMessage || t('people.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [studentId, loadHistory, t]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      await loadHistory(page + 1);
    } catch {
    } finally {
      setLoadingMore(false);
    }
  };

  const open = (value: Direction) => {
    setDirection(value);
    setAmount('');
    setReason('');
    setSubmitted(false);
  };

  const numericAmount = Number(amount.replace(',', '.'));
  const amountError =
    !amount.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > MAX_AMOUNT
      ? t('people.wallet.amountError')
      : undefined;
  const reasonError = !reason.trim() ? t('people.wallet.reasonRequired') : undefined;

  const save = async () => {
    setSubmitted(true);
    if (amountError || reasonError || saving || !direction) return;
    setSaving(true);
    try {
      const signed = direction === 'debit' ? -numericAmount : numericAmount;
      const updated = await walletApi.adjust(studentId, signed, reason.trim());
      setWallet(updated);
      setDirection(null);
      Alert.alert(t('common.success'), t('people.wallet.saved'));
      await loadHistory(1);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('people.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner size="small" />;
  if (error) return <ErrorRetry message={error} onRetry={load} />;

  return (
    <View style={styles.wrap}>
      <View style={[styles.balanceCard, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.balanceLabel, { color: theme.colors.textMuted }]}>{t('wallet.balance')}</Text>
        <Text style={[styles.balance, { color: theme.colors.text }]}>
          {isolate(`${formatAmount(wallet?.balance ?? 0)}`)} {t('wallet.points')}
        </Text>
        {canEdit ? (
          <View style={styles.actions}>
            <View style={styles.action}>
              <Button title={t('people.wallet.add')} onPress={() => open('credit')} fullWidth />
            </View>
            <View style={styles.action}>
              <Button title={t('people.wallet.deduct')} variant="secondary" onPress={() => open('debit')} fullWidth />
            </View>
          </View>
        ) : null}
      </View>

      <Text style={[styles.section, { color: theme.colors.textMuted }]}>{t('wallet.history')}</Text>
      {!items.length ? (
        <Text style={[styles.empty, { color: theme.colors.textMuted }]}>{t('wallet.noTransactions')}</Text>
      ) : (
        items.map((item) => {
          const credit = item.amount > 0;
          const part = item.lessonTitle ?? item.sectionTitle;
          const details =
            item.courseName && part
              ? `${item.courseName} - ${part}`
              : item.courseName ?? item.liveName ?? item.voucherCode ?? item.reason ?? '';
          return (
            <View key={item.id} style={[styles.row, { backgroundColor: theme.colors.card }]}>
              <Ionicons
                name={credit ? 'add-circle' : 'remove-circle'}
                size={26}
                color={credit ? theme.colors.success : theme.colors.danger}
              />
              <View style={styles.rowBody}>
                <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{t(`wallet.types.${item.type}`)}</Text>
                {details ? (
                  <Text style={[styles.rowMeta, { color: theme.colors.textMuted }]} numberOfLines={2}>{details}</Text>
                ) : null}
                <Text style={[styles.rowMeta, { color: theme.colors.textMuted }]}>{date(parseServerDate(item.createdAt))}</Text>
              </View>
              <Text style={[styles.rowAmount, { color: credit ? theme.colors.success : theme.colors.danger }]}>
                {isolate(`${credit ? '+' : ''}${formatAmount(item.amount)}`)}
              </Text>
            </View>
          );
        })
      )}
      {items.length < total ? (
        <Button title={t('people.loadMore')} variant="secondary" onPress={loadMore} loading={loadingMore} />
      ) : null}

      <Modal visible={!!direction} transparent animationType="slide" onRequestClose={() => setDirection(null)} statusBarTranslucent>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.backdrop} onPress={() => setDirection(null)}>
            <Pressable style={[styles.sheet, { backgroundColor: theme.colors.card, paddingBottom: insets.bottom + spacing.lg }]}>
              <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>
                {direction === 'debit' ? t('people.wallet.deduct') : t('people.wallet.add')}
              </Text>
              <Input
                label={t('people.wallet.amount')}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                error={submitted ? amountError : undefined}
              />
              <Input
                label={t('people.wallet.reason')}
                value={reason}
                onChangeText={setReason}
                placeholder={t('people.wallet.reasonPlaceholder')}
                maxLength={MAX_REASON}
                error={submitted ? reasonError : undefined}
              />
              <Button title={t('common.save')} onPress={save} loading={saving} fullWidth />
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { gap: spacing.sm },
  balanceCard: { borderRadius: borderRadius.xl, padding: spacing.lg, alignItems: 'center', gap: spacing.xs },
  balanceLabel: { fontSize: 14, fontFamily: 'Cairo_500Medium' },
  balance: { fontSize: fontSize['2xl'], fontFamily: 'Cairo_700Bold' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, alignSelf: 'stretch' },
  action: { flex: 1 },
  section: { fontSize: 14, fontFamily: 'Cairo_700Bold', marginTop: spacing.sm, textAlign: 'left' },
  empty: { fontSize: fontSize.sm, fontFamily: 'Cairo_400Regular', textAlign: 'center', paddingVertical: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: borderRadius.xl, padding: spacing.md },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: fontSize.base, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },
  rowMeta: { fontSize: 14, fontFamily: 'Cairo_400Regular', textAlign: 'left' },
  rowAmount: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { ...sheetFrame, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl },
  sheetTitle: { ...typography.h3, textAlign: 'center', marginBottom: spacing.lg },
});

export default StudentWalletPanel;

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../types/navigation.types';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography, fontSize } from '../../theme/typography';
import { formatAmount } from '../../utils/price';
import { courseCodeFrom, normalizeVoucherCode } from '../../utils/walletCode';
import { coursesApi } from '../../services/api/courses.api';
import { QrScannerModal } from '../../components/wallet/QrScannerModal';
import { walletApi, type Wallet, type WalletTransaction } from '../../services/api/wallet.api';
import { signedPoints } from '../../utils/walletCode';

const PAGE_SIZE = 20;

type Props = NativeStackScreenProps<ProfileStackParamList, 'Wallet'>;

export default function WalletScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t, locale } = useRTL();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [items, setItems] = useState<WalletTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const redeemingRef = useRef(false);
  const loadingMoreRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const [me, first] = await Promise.all([walletApi.me(), walletApi.transactions(1, PAGE_SIZE)]);
      setWallet(me);
      setItems(first.items);
      setTotal(first.totalCount);
      setPage(1);
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    if (loadingMoreRef.current || loadFailed || items.length >= total) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const next = await walletApi.transactions(page + 1, PAGE_SIZE);
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...next.items.filter((item) => !seen.has(item.id))];
      });
      setTotal(next.totalCount);
      setPage(page + 1);
    } catch {
      // keeps the loaded page; the next scroll retries
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  };

  const redeemCourseCode = async (token: string) => {
    redeemingRef.current = true;
    setRedeeming(true);
    try {
      const result = await coursesApi.redeemEnrollmentCode(token);
      setCode('');
      const part = result.lessonTitle || result.sectionTitle;
      Alert.alert(t('wallet.courseCodeTitle'), part ? `${result.courseName} - ${part}` : result.courseName);
    } catch (err: any) {
      Alert.alert(t('wallet.courseCodeFailed'), err?.response?.data?.message || err?.userMessage || t('wallet.codeInvalid'));
    } finally {
      redeemingRef.current = false;
      setRedeeming(false);
    }
  };

  const redeem = async (raw: string) => {
    if (redeemingRef.current) return;
    const courseCode = courseCodeFrom(raw);
    if (courseCode) {
      redeemCourseCode(courseCode);
      return;
    }
    const normalized = normalizeVoucherCode(raw);
    if (!normalized) {
      Alert.alert(t('wallet.redeemFailed'), t('wallet.codeInvalid'));
      return;
    }
    redeemingRef.current = true;
    setRedeeming(true);
    try {
      const result = await walletApi.redeem(normalized);
      setCode('');
      setWallet({ balance: result.balance, currencyCode: result.currencyCode });
      Alert.alert(t('wallet.redeemedTitle'), t('wallet.redeemedBody', { amount: `${formatAmount(result.amount)} ${t('wallet.points')}` }));
      load();
    } catch (err: any) {
      Alert.alert(t('wallet.redeemFailed'), err?.response?.data?.message || err?.userMessage || t('wallet.codeInvalid'));
    } finally {
      redeemingRef.current = false;
      setRedeeming(false);
    }
  };

  const iconFor = (item: WalletTransaction) => {
    switch (item.type) {
      case 'VoucherRedeem':
        return 'qr-code';
      case 'CoursePurchase':
        return 'book';
      case 'SectionPurchase':
        return 'folder-open';
      case 'LessonPurchase':
        return 'play-circle';
      case 'LivePurchase':
        return 'videocam';
      default:
        return item.amount > 0 ? 'add-circle' : 'remove-circle';
    }
  };

  const header = (
    <View>
      <View style={[styles.balanceCard, { backgroundColor: theme.colors.primary }]}>
        <Ionicons name="wallet" size={28} color="#FFFFFF" />
        <Text style={styles.balanceLabel}>{t('wallet.balance')}</Text>
        <Text style={styles.balanceValue}>{wallet ? `${formatAmount(wallet.balance)} ${t('wallet.points')}` : '—'}</Text>
      </View>

      {loadFailed && (
        <TouchableOpacity
          style={[styles.card, styles.errorCard, { backgroundColor: theme.colors.card }]}
          onPress={() => {
            setLoading(true);
            load();
          }}
          accessibilityRole="button"
        >
          <Ionicons name="cloud-offline-outline" size={20} color={theme.colors.danger} />
          <Text style={[styles.hint, { flex: 1, margin: 0, color: theme.colors.text }]}>{t('wallet.loadFailed')}</Text>
          <Text style={[styles.scanText, { color: theme.colors.primary }]}>{t('common.retry')}</Text>
        </TouchableOpacity>
      )}

      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{t('wallet.topUpTitle')}</Text>
        <Text style={[styles.hint, { color: theme.colors.textMuted }]}>{t('wallet.topUpHint')}</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.colors.inputBorder, backgroundColor: theme.colors.inputBackground, color: theme.colors.inputText }]}
          value={code}
          onChangeText={setCode}
          placeholder="ABCD-EFGH-JKMN"
          placeholderTextColor={theme.colors.inputPlaceholder}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={200}
          accessibilityLabel={t('wallet.codeLabel')}
          onSubmitEditing={() => redeem(code)}
        />
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.colors.primary }, (!code.trim() || redeeming) && { opacity: 0.6 }]}
            onPress={() => redeem(code)}
            disabled={!code.trim() || redeeming}
            accessibilityRole="button"
          >
            {redeeming ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{t('wallet.topUp')}</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: theme.dark ? theme.colors.border : theme.colors.background }]}
            onPress={() => setScanning(true)}
            disabled={redeeming}
            accessibilityRole="button"
            accessibilityLabel={t('wallet.scan')}
          >
            <Ionicons name="scan" size={20} color={theme.colors.text} />
            <Text style={[styles.scanText, { color: theme.colors.text }]}>{t('wallet.scan')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>{t('wallet.history')}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title={t('wallet.title')} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: spacing['3xl'] }} color={theme.colors.primary} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            ListHeaderComponent={header}
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['3xl'] }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={[styles.empty, { color: theme.colors.textMuted }]}>{t('wallet.noTransactions')}</Text>}
            ListFooterComponent={loadingMore ? <ActivityIndicator color={theme.colors.primary} /> : null}
            renderItem={({ item }) => {
              const credit = item.amount > 0;
              const color = credit ? theme.colors.success : theme.colors.danger;
              const part = item.lessonTitle ?? item.sectionTitle;
              const details = item.courseName && part ? `${item.courseName} - ${part}` : item.courseName ?? item.liveName ?? item.voucherCode ?? item.reason ?? '';
              return (
                <View style={[styles.row, { backgroundColor: theme.colors.card }]}>
                  <View style={[styles.rowIcon, { backgroundColor: color + '22' }]}>
                    <Ionicons name={iconFor(item) as any} size={18} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{t(`wallet.types.${item.type}`)}</Text>
                    {!!details && (
                      <Text style={[styles.rowDetails, { color: theme.colors.textMuted }]} numberOfLines={1}>
                        {details}
                      </Text>
                    )}
                    <Text style={[styles.rowDetails, { color: theme.colors.textMuted }]}>
                      {new Date(item.createdAt).toLocaleString(locale === 'ar' ? 'ar-EG-u-ca-gregory-nu-latn' : 'en-GB')}
                    </Text>
                  </View>
                  <Text style={[styles.rowAmount, { color }]}>
                    {`${signedPoints(item.amount, formatAmount)} ${t('wallet.points')}`}
                  </Text>
                </View>
              );
            }}
          />
        )}
      </KeyboardAvoidingView>

      <QrScannerModal
        visible={scanning}
        onClose={() => setScanning(false)}
        onScanned={(value) => {
          setScanning(false);
          redeem(value);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  balanceCard: {
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  balanceLabel: {
    ...typography.body,
    color: 'rgba(255,255,255,0.85)',
  },
  balanceValue: {
    fontSize: 30,
    fontFamily: 'Cairo_700Bold',
    color: '#FFFFFF',
    textAlign: 'left',
  },
  card: {
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    ...typography.h4,
  },
  hint: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    height: 50,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.base,
    fontFamily: 'Cairo_600SemiBold',
    letterSpacing: 1,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  primaryButton: {
    flex: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryText: {
    ...typography.button,
    color: '#FFFFFF',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
  },
  scanText: {
    ...typography.button,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontFamily: 'Cairo_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginStart: spacing.xs,
    textAlign: 'left',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  empty: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    ...typography.body,
    fontFamily: 'Cairo_600SemiBold',
  },
  rowDetails: {
    ...typography.caption,
  },
  rowAmount: {
    ...typography.body,
    fontFamily: 'Cairo_700Bold',
  },
});

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../../theme/ThemeProvider';
import { useRTL } from '../../../i18n/RTLProvider';
import { useAuth } from '../../../hooks/useAuth';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Spinner } from '../../../components/ui/Spinner';
import { ErrorRetry } from '../../../components/ui/ErrorRetry';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Chip } from '../../../components/ui/Chip';
import { SearchBar } from '../../../components/ui/SearchBar';
import { SelectField } from '../../../components/ui/SelectField';
import { spacing, borderRadius } from '../../../theme/spacing';
import { fontSize } from '../../../theme/typography';
import { useTabBarSpace } from '../../../navigation/tabBar';
import {
  storeApi,
  StoreOrderStatus,
  StorePaymentMethod,
  type StoreOrder,
  type StoreOrderCounts,
  type StoreSettings,
} from '../../../services/api/store.api';
import { orderStatusKey, orderStatusVariant, paymentKey, useStoreDate, useStoreMoney } from '../StoreOrderDetailScreen';
import type { ProfileStackParamList } from '../../../types/navigation.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'StoreOrders'>;
type Tab = StoreOrderStatus | 'review' | null;

const PAGE_SIZE = 20;
const FEATURE_DISABLED = 'FEATURE_DISABLED';
const STATUSES = [StoreOrderStatus.Pending, StoreOrderStatus.Confirmed, StoreOrderStatus.Delivered, StoreOrderStatus.Cancelled];
const PAYMENTS = [StorePaymentMethod.Points, StorePaymentMethod.CashOnDelivery, StorePaymentMethod.Transfer];
const EMPTY_COUNTS: StoreOrderCounts = { pending: 0, confirmed: 0, delivered: 0, cancelled: 0, awaitingReview: 0 };

function countOf(counts: StoreOrderCounts, status: StoreOrderStatus): number {
  return counts[StoreOrderStatus[status].toLowerCase() as keyof StoreOrderCounts];
}

export function StoreManageTabs({ current, onNavigate }: { current: 'orders' | 'products' | 'categories' | 'settings'; onNavigate: (screen: 'StoreOrders' | 'StoreProducts' | 'StoreCategories' | 'StoreSettings') => void }) {
  const { t } = useRTL();
  const { isAdmin } = useAuth();
  const tabs = [
    { key: 'orders' as const, screen: 'StoreOrders' as const, label: t('store.TABS.ORDERS') },
    { key: 'products' as const, screen: 'StoreProducts' as const, label: t('store.TABS.PRODUCTS') },
    { key: 'categories' as const, screen: 'StoreCategories' as const, label: t('store.TABS.CATEGORIES') },
    ...(isAdmin ? [{ key: 'settings' as const, screen: 'StoreSettings' as const, label: t('store.TABS.SETTINGS') }] : []),
  ];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
      {tabs.map((tab) => (
        <Chip key={tab.key} label={tab.label} active={tab.key === current} onPress={() => tab.key !== current && onNavigate(tab.screen)} />
      ))}
    </ScrollView>
  );
}

export default function StoreOrdersScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const { isAdmin } = useAuth();
  const money = useStoreMoney();
  const formatDate = useStoreDate();
  const tabBarSpace = useTabBarSpace();

  const [tab, setTab] = useState<Tab>(StoreOrderStatus.Pending);
  const [payment, setPayment] = useState<StorePaymentMethod | null>(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [counts, setCounts] = useState<StoreOrderCounts>(EMPTY_COUNTS);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [addonOff, setAddonOff] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const requestId = useRef(0);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchPage = useCallback(
    (target: number) =>
      storeApi.orders({
        status: typeof tab === 'number' ? tab : null,
        awaitingReview: tab === 'review',
        paymentMethod: payment,
        search: query,
        page: target,
        size: PAGE_SIZE,
      }),
    [tab, payment, query],
  );

  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const result = await fetchPage(1);
      if (id !== requestId.current) return;
      setOrders(result.items);
      setCounts(result.counts);
      setTotal(result.totalCount);
      setPage(1);
      setError(null);
    } catch (err: any) {
      if (id !== requestId.current) return;
      setError(err?.userMessage || t('store.LOAD_FAILED'));
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [fetchPage, t]);

  const loadSettings = useCallback(async () => {
    try {
      setSettings(await storeApi.settings());
      setAddonOff(false);
    } catch (err: any) {
      if (err?.response?.data?.code === FEATURE_DISABLED) setAddonOff(true);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
  }, [tab, payment, query]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings]),
  );

  const loadMore = async () => {
    if (loadingMoreRef.current || error || orders.length >= total) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const id = requestId.current;
    try {
      const next = await fetchPage(page + 1);
      if (id !== requestId.current) return;
      setOrders((current) => {
        const seen = new Set(current.map((order) => order.id));
        return [...current, ...next.items.filter((order) => !seen.has(order.id))];
      });
      setCounts(next.counts);
      setTotal(next.totalCount);
      setPage(page + 1);
    } catch {
      return;
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  };

  const enableStore = async () => {
    if (!settings || enabling) return;
    if (!settings.acceptPoints && !settings.acceptCashOnDelivery && !settings.acceptTransfer) {
      Alert.alert(t('common.info'), t('store.SETTINGS.PAYMENT_REQUIRED'));
      navigation.navigate('StoreSettings');
      return;
    }
    setEnabling(true);
    try {
      setSettings(await storeApi.saveSettings({ ...settings, enabled: true }));
      Alert.alert(t('common.success'), t('store.SETTINGS.ENABLED_TOAST'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('store.LOAD_FAILED'));
    } finally {
      setEnabling(false);
    }
  };

  const muted = { color: theme.colors.textMuted };
  const text = { color: theme.colors.text };
  const filtered = !!search.trim() || payment !== null;

  const paymentOptions = [
    { value: 'all', label: t('store.ORDERS.ALL_PAYMENTS') },
    ...PAYMENTS.map((method) => ({ value: String(method), label: t(paymentKey(method)) })),
  ];

  const banner = () => {
    if (addonOff) {
      return (
        <View style={[styles.banner, { backgroundColor: theme.colors.card }]}>
          <Ionicons name="lock-closed-outline" size={22} color={theme.colors.textMuted} style={styles.bannerIcon} />
          <View style={styles.flex}>
            <Text style={[styles.bannerTitle, text]}>{t('store.ADDON_OFF_TITLE')}</Text>
            <Text style={[styles.meta, muted]}>{t(isAdmin ? 'store.ADDON_OFF_HINT_OWNER' : 'store.ADDON_OFF_HINT_STAFF')}</Text>
          </View>
        </View>
      );
    }
    if (settings && !settings.enabled) {
      return (
        <View style={[styles.banner, { backgroundColor: theme.colors.card }]}>
          <Ionicons name="storefront-outline" size={22} color={theme.colors.warning} style={styles.bannerIcon} />
          <View style={styles.flex}>
            <Text style={[styles.bannerTitle, text]}>{t('store.CLOSED_TITLE')}</Text>
            <Text style={[styles.meta, muted]}>{t(isAdmin ? 'store.CLOSED_HINT' : 'store.CLOSED_HINT_STAFF')}</Text>
            {isAdmin ? (
              <View style={styles.bannerAction}>
                <Button title={t('store.ENABLE')} variant="secondary" size="small" onPress={enableStore} loading={enabling} />
              </View>
            ) : null}
          </View>
        </View>
      );
    }
    return null;
  };

  const header = (
    <View style={styles.headerBlock}>
      <StoreManageTabs current="orders" onNavigate={(screen) => navigation.navigate(screen)} />
      {banner()}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        <Chip label={t('store.ORDERS.ALL')} active={tab === null} onPress={() => setTab(null)} />
        {counts.awaitingReview || tab === 'review' ? (
          <Chip
            icon="receipt-outline"
            label={`${t('store.STATUS.AwaitingReview')} (${counts.awaitingReview})`}
            active={tab === 'review'}
            onPress={() => setTab('review')}
          />
        ) : null}
        {STATUSES.map((status) => (
          <Chip
            key={status}
            label={`${t(`store.STATUS.${StoreOrderStatus[status]}`)} (${countOf(counts, status)})`}
            active={tab === status}
            onPress={() => setTab(status)}
          />
        ))}
      </ScrollView>
      <SearchBar value={search} onChangeText={setSearch} placeholder={t('store.ORDERS.SEARCH')} />
      <SelectField
        placeholder={t('store.ORDERS.ALL_PAYMENTS')}
        value={payment === null ? 'all' : String(payment)}
        options={paymentOptions}
        onChange={(value) => setPayment(value === 'all' ? null : (Number(value) as StorePaymentMethod))}
      />
      {filtered ? (
        <TouchableOpacity
          onPress={() => {
            setSearch('');
            setPayment(null);
          }}
          accessibilityRole="button"
        >
          <Text style={[styles.clear, { color: theme.colors.primary }]}>{t('store.CLEAR_FILTERS')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const renderOrder = ({ item }: { item: StoreOrder }) => (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: theme.colors.card }]}
      onPress={() => navigation.navigate('StoreOrderDetail', { orderId: item.id, mine: false })}
      accessibilityRole="button"
      accessibilityLabel={t('store.ORDER_NUMBER', { id: item.id })}
    >
      <View style={styles.rowTop}>
        <View style={styles.flex}>
          <Text style={[styles.rowTitle, text]}>{t('store.ORDER_NUMBER', { id: item.id })}</Text>
          <Text style={[styles.meta, muted]}>{formatDate(item.createdAt)}</Text>
        </View>
        <Badge text={t(orderStatusKey(item))} variant={orderStatusVariant(item)} />
      </View>
      <Text style={[styles.rowStudent, text]} numberOfLines={1}>{item.studentName}</Text>
      <Text style={[styles.meta, muted]} numberOfLines={1}>
        {item.items[0]?.productName}
        {item.items.length > 1 ? ` +${item.items.length - 1}` : ''}
      </Text>
      <View style={styles.rowBottom}>
        <Text style={[styles.meta, muted]} numberOfLines={1}>{t(paymentKey(item.paymentMethod))}</Text>
        <Text style={[styles.amount, text]}>{money(item.total, item.currencyCode)}</Text>
      </View>
    </TouchableOpacity>
  );

  const empty = () => {
    if (loading) return <Spinner />;
    if (error) return <ErrorRetry message={error} onRetry={() => { setLoading(true); load(); }} retryLabel={t('store.TRY_AGAIN')} />;
    return <Text style={[styles.empty, muted]}>{t('store.ORDERS.EMPTY')}</Text>;
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]} edges={['bottom', 'left', 'right']}>
      <ScreenHeader
        title={t('store.PAGES.ORDERS_TITLE')}
        onBack={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity onPress={() => navigation.navigate('StoreShop')} accessibilityRole="button" accessibilityLabel={t('store.VIEW_STORE')} hitSlop={8}>
            <Ionicons name="storefront-outline" size={22} color={theme.colors.text} />
          </TouchableOpacity>
        }
      />
      <FlatList
        data={error ? [] : orders}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderOrder}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={loadingMore ? <Spinner /> : null}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarSpace + spacing.lg }]}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
              loadSettings();
            }}
            tintColor={theme.colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.sm },
  headerBlock: { gap: spacing.md, marginBottom: spacing.xs },
  tabs: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 2 },
  banner: { flexDirection: 'row', gap: spacing.md, borderRadius: borderRadius.xl, padding: spacing.lg, alignItems: 'flex-start' },
  bannerTitle: { fontSize: fontSize.base, lineHeight: 24, fontFamily: 'Cairo_700Bold', textAlign: 'left' },
  bannerIcon: { marginTop: 1 },
  bannerAction: { flexDirection: 'row', marginTop: spacing.sm },
  meta: { fontSize: 14, fontFamily: 'Cairo_400Regular', textAlign: 'left' },
  clear: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },
  row: { borderRadius: borderRadius.xl, padding: spacing.lg, gap: spacing.xs },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  rowTitle: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', textAlign: 'left' },
  rowStudent: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.xs },
  amount: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold' },
  empty: { fontSize: 14, fontFamily: 'Cairo_400Regular', textAlign: 'center', paddingVertical: spacing['2xl'] },
});

import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../types/navigation.types';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useTabBarSpace } from '../../navigation/tabBar';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { Spinner } from '../../components/ui/Spinner';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { formatPrice } from '../../utils/price';
import { getFullImageUrl } from '../../utils/imageUrl';
import { appDateLocale } from '../../utils/dateLocale';
import { StoreOrderStatus, StorePaymentMethod, storeApi, type StoreOrder } from '../../services/api/store.api';

const PAGE_SIZE = 20;

type Props = NativeStackScreenProps<ProfileStackParamList, 'StoreMyOrders'>;

const STATUS_VARIANT: Record<StoreOrderStatus, 'warning' | 'info' | 'success' | 'danger'> = {
  [StoreOrderStatus.Pending]: 'warning',
  [StoreOrderStatus.Confirmed]: 'info',
  [StoreOrderStatus.Delivered]: 'success',
  [StoreOrderStatus.Cancelled]: 'danger',
};

export default function StoreMyOrdersScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t, locale } = useRTL();
  const tabBarSpace = useTabBarSpace();
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const loadingMoreRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const [first, me] = await Promise.all([storeApi.myOrders(1, PAGE_SIZE), storeApi.me().catch(() => null)]);
      setOrders(first.items);
      setTotal(first.totalCount);
      setPage(1);
      setStoreOpen(!!me?.enabled);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const loadMore = async () => {
    if (loadingMoreRef.current || failed || orders.length >= total) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const next = await storeApi.myOrders(page + 1, PAGE_SIZE);
      setOrders((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...next.items.filter((item) => !seen.has(item.id))];
      });
      setTotal(next.totalCount);
      setPage(page + 1);
    } catch {
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  };

  const renderOrder = ({ item }: { item: StoreOrder }) => {
    const first = item.items[0];
    const image = getFullImageUrl(first?.imageUrl);
    const count = item.items.reduce((sum, line) => sum + line.quantity, 0);
    const statusLabel = item.awaitingReview ? t('store.STATUS.AwaitingReview') : t(`store.STATUS.${StoreOrderStatus[item.status]}`);
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('StoreOrderDetail', { orderId: item.id, mine: true })}
        accessibilityRole="button"
        accessibilityLabel={t('store.ORDER_NUMBER', { id: item.id })}
      >
        <View style={[styles.thumb, { backgroundColor: theme.dark ? theme.colors.surface : '#F4F4F6' }]}>
          {image ? <Image source={{ uri: image }} style={styles.fill} resizeMode="contain" /> : <Ionicons name="cube-outline" size={26} color={theme.colors.textMuted} />}
        </View>
        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
              {t('store.ORDER_NUMBER', { id: item.id })}
            </Text>
            <Badge text={statusLabel} variant={item.awaitingReview ? 'info' : STATUS_VARIANT[item.status]} />
          </View>
          <Text style={[styles.meta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {first ? first.productName : ''}
          </Text>
          <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
            {`${t('store.CART_ITEMS', { count })} · ${t(`store.PAYMENT.${StorePaymentMethod[item.paymentMethod]}`)}`}
          </Text>
          <View style={styles.bottomRow}>
            <Text style={[styles.total, { color: theme.colors.text }]}>{formatPrice(item.total, item.currencyCode, locale)}</Text>
            <Text style={[styles.meta, { color: theme.colors.textMuted }]}>{new Date(item.createdAt).toLocaleDateString(appDateLocale())}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderBody = () => {
    if (loading) return <Spinner />;
    if (failed && !orders.length) {
      return (
        <ErrorRetry
          message={t('store.LOAD_FAILED')}
          retryLabel={t('store.TRY_AGAIN')}
          onRetry={() => {
            setLoading(true);
            load();
          }}
        />
      );
    }
    return (
      <FlatList
        data={orders}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderOrder}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: tabBarSpace + spacing.xl, flexGrow: 1 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="cube-outline" size={48} color={theme.colors.textMuted} />}
            title={t('store.ORDERS.MY_EMPTY')}
            actionLabel={storeOpen ? t('store.BROWSE') : undefined}
            onAction={storeOpen ? () => navigation.navigate('StoreShop') : undefined}
          />
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: spacing.lg }} color={theme.colors.primary} /> : null}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title={t('store.MY_ORDERS')} onBack={() => navigation.goBack()} />
      {renderBody()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fill: { width: '100%', height: '100%' },
  card: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1 },
  thumb: { width: 72, height: 72, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 4 },
  body: { flex: 1, gap: 2 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', textAlign: 'left' },
  meta: { fontSize: fontSize.sm, fontFamily: 'Cairo_400Regular', textAlign: 'left' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  total: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold' },
});

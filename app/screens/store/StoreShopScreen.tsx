import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../types/navigation.types';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useTabBarSpace } from '../../navigation/tabBar';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useAuth } from '../../hooks/useAuth';
import { SearchBar } from '../../components/ui/SearchBar';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { Spinner } from '../../components/ui/Spinner';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography, fontSize } from '../../theme/typography';
import { formatPrice } from '../../utils/price';
import { getFullImageUrl } from '../../utils/imageUrl';
import {
  STORE_SORTS,
  storeApi,
  storeDiscountPercent,
  storeEffectivePrice,
  type StoreCategory,
  type StoreProductCard,
  type StoreProductSort,
  type StoreStatus,
} from '../../services/api/store.api';
import { cartCount, useCartStore, type CartAddResult } from '../../store/cart.store';

const PAGE_SIZE = 20;

type Props = NativeStackScreenProps<ProfileStackParamList, 'StoreShop'>;

export function CartHeaderButton({ onPress }: { onPress: () => void }) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const count = useCartStore((s) => cartCount(s.lines));
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.cartButton, { backgroundColor: theme.colors.card }]}
      accessibilityRole="button"
      accessibilityLabel={t('store.VIEW_CART')}
    >
      <Ionicons name="cart-outline" size={22} color={theme.colors.text} />
      {count > 0 && (
        <View style={[styles.cartBadge, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.cartBadgeText, { color: theme.colors.onPrimary }]}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function cartResultMessage(result: CartAddResult, t: (key: string, options?: any) => string): string {
  switch (result) {
    case 'partial':
      return t('store.ADDED_PARTIAL');
    case 'limit':
      return t('store.MAX_IN_CART');
    case 'full':
      return t('store.CART_FULL', { max: 30 });
    default:
      return t('store.ADDED_TO_CART');
  }
}

export default function StoreShopScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t, locale } = useRTL();
  const tabBarSpace = useTabBarSpace();
  const addToCart = useCartStore((s) => s.add);
  const { isStudent } = useAuth();

  const [status, setStatus] = useState<StoreStatus | null>(null);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [products, setProducts] = useState<StoreProductCard[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [sort, setSort] = useState<StoreProductSort>('newest');
  const [inStock, setInStock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const loadingMoreRef = useRef(false);
  const requestRef = useRef(0);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    []
  );

  const loadStatus = useCallback(async () => {
    try {
      const [nextStatus, nextCategories] = await Promise.all([storeApi.publicStatus(), storeApi.publicCategories()]);
      setStatus(nextStatus);
      setCategories(nextCategories.filter((category) => category.productCount > 0));
      setFailed(false);
      return nextStatus;
    } catch {
      setFailed(true);
      return null;
    }
  }, []);

  const loadProducts = useCallback(async () => {
    const request = ++requestRef.current;
    setListLoading(true);
    try {
      const result = await storeApi.publicProducts({ search: query, categoryId, sort, inStock, page: 1, size: PAGE_SIZE });
      if (request !== requestRef.current) return;
      setProducts(result.items);
      setTotal(result.totalCount);
      setPage(1);
      setFailed(false);
    } catch {
      if (request === requestRef.current) setFailed(true);
    } finally {
      if (request === requestRef.current) setListLoading(false);
    }
  }, [query, categoryId, sort, inStock]);

  useEffect(() => {
    loadStatus().finally(() => setLoading(false));
  }, [loadStatus]);

  useEffect(() => {
    if (status?.available) loadProducts();
  }, [status?.available, loadProducts]);

  const refresh = async () => {
    setRefreshing(true);
    const next = await loadStatus();
    if (next?.available) await loadProducts();
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (loadingMoreRef.current || listLoading || products.length >= total) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const request = requestRef.current;
    try {
      const next = await storeApi.publicProducts({ search: query, categoryId, sort, inStock, page: page + 1, size: PAGE_SIZE });
      if (request !== requestRef.current) return;
      setProducts((current) => {
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

  const showNotice = (message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 2500);
  };

  const quickAdd = (product: StoreProductCard) => {
    showNotice(cartResultMessage(addToCart(product, product.imageUrl, 1), t));
  };

  const filtered = !!query || !!categoryId || inStock || sort !== 'newest';

  const clearFilters = () => {
    setSearch('');
    setQuery('');
    setCategoryId(null);
    setSort('newest');
    setInStock(false);
  };

  const currency = status?.currencyCode;

  const renderProduct = ({ item }: { item: StoreProductCard }) => {
    const image = getFullImageUrl(item.imageUrl);
    const price = storeEffectivePrice(item);
    const percent = storeDiscountPercent(item);
    const soldOut = item.stock === 0;
    return (
      <View style={styles.cell}>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('StoreProduct', { productId: item.id })}
        accessibilityRole="button"
        accessibilityLabel={item.name}
      >
        <View style={[styles.imageBox, { backgroundColor: theme.dark ? theme.colors.surface : '#F4F4F6' }]}>
          {image ? (
            <Image source={{ uri: image }} style={styles.image} resizeMode="contain" />
          ) : (
            <Ionicons name="cube-outline" size={36} color={theme.colors.textMuted} />
          )}
          {percent ? (
            <View style={[styles.saleBadge, { backgroundColor: theme.colors.danger }]}>
              <Text style={styles.saleText}>{`‎-${percent}%`}</Text>
            </View>
          ) : null}
          {!isStudent ? null : soldOut ? (
            <View style={[styles.soldOut, { backgroundColor: theme.colors.text }]}>
              <Text style={[styles.soldOutText, { color: theme.colors.background }]}>{t('store.OUT_OF_STOCK')}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => quickAdd(item)}
              accessibilityRole="button"
              accessibilityLabel={t('store.SF.ADD_SHORT')}
              hitSlop={8}
            >
              <Ionicons name="add" size={20} color={theme.colors.onPrimary} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.price, { color: theme.colors.text }]}>{formatPrice(price, currency, locale)}</Text>
          {percent ? (
            <Text style={[styles.listPrice, { color: theme.colors.textMuted }]}>{formatPrice(item.price, currency, locale)}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
      </View>
    );
  };

  const header = (
    <View style={styles.filters}>
      <SearchBar value={search} onChangeText={setSearch} placeholder={t('store.SEARCH')} />
      {categories.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label={t('store.ALL')} active={!categoryId} onPress={() => setCategoryId(null)} />
          {categories.map((category) => (
            <Chip
              key={category.id}
              label={category.name}
              active={categoryId === category.id}
              onPress={() => setCategoryId(categoryId === category.id ? null : category.id)}
            />
          ))}
        </ScrollView>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label={t('store.IN_STOCK_ONLY')} icon="checkmark-circle-outline" active={inStock} onPress={() => setInStock(!inStock)} />
        {STORE_SORTS.map((value) => (
          <Chip key={value} label={t(`store.SORT.${value}`)} active={sort === value} onPress={() => setSort(value)} />
        ))}
      </ScrollView>
      {!listLoading && products.length > 0 && (
        <Text style={[styles.results, { color: theme.colors.textMuted }]}>{t('store.RESULTS', { count: total })}</Text>
      )}
    </View>
  );

  const renderBody = () => {
    if (loading) return <Spinner />;
    if (!status) {
      return <ErrorRetry message={t('store.LOAD_FAILED')} retryLabel={t('store.TRY_AGAIN')} onRetry={() => { setLoading(true); loadStatus().finally(() => setLoading(false)); }} />;
    }
    if (!status.available) {
      return (
        <EmptyState
          icon={<Ionicons name="storefront-outline" size={48} color={theme.colors.textMuted} />}
          title={t('store.CLOSED_TITLE')}
          description={t('store.CLOSED_FOR_STUDENTS')}
        />
      );
    }
    return (
      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderProduct}
        numColumns={2}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingHorizontal: spacing.lg - spacing.xs, paddingBottom: tabBarSpace + spacing.xl }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}
        ListEmptyComponent={
          listLoading ? (
            <Spinner />
          ) : failed ? (
            <ErrorRetry message={t('store.LOAD_FAILED')} retryLabel={t('store.TRY_AGAIN')} onRetry={loadProducts} />
          ) : (
            <EmptyState
              icon={<Ionicons name="cube-outline" size={48} color={theme.colors.textMuted} />}
              title={filtered ? t('store.NO_RESULTS') : t('store.EMPTY')}
              actionLabel={filtered ? t('store.CLEAR_FILTERS') : undefined}
              onAction={filtered ? clearFilters : undefined}
            />
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: spacing.lg }} color={theme.colors.primary} /> : null}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader
        title={t('store.TITLE')}
        onBack={() => navigation.goBack()}
        rightElement={isStudent ? <CartHeaderButton onPress={() => navigation.navigate('StoreCart')} /> : undefined}
      />
      {renderBody()}
      {notice && (
        <TouchableOpacity
          style={[styles.toast, { backgroundColor: theme.colors.text, bottom: tabBarSpace + spacing.lg }]}
          onPress={() => navigation.navigate('StoreCart')}
          accessibilityRole="button"
        >
          <Text style={[styles.toastText, { color: theme.colors.background }]} numberOfLines={2}>
            {notice}
          </Text>
          <Text style={[styles.toastAction, { color: theme.colors.background }]}>{t('store.VIEW_CART')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cartButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    end: -2,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: { fontSize: fontSize.xs, fontFamily: 'Cairo_600SemiBold', lineHeight: 20 },
  filters: { gap: spacing.sm, paddingHorizontal: spacing.xs, paddingBottom: spacing.sm },
  chips: { gap: spacing.sm, paddingVertical: 2 },
  results: { ...typography.bodySmall, fontSize: fontSize.sm, textAlign: 'left' },
  row: { marginBottom: spacing.sm },
  cell: { width: '50%', paddingHorizontal: spacing.xs },
  card: {
    flex: 1,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageBox: {
    aspectRatio: 1.25,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  image: { width: '100%', height: '100%' },
  saleBadge: {
    position: 'absolute',
    top: spacing.sm,
    start: spacing.sm,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  saleText: { color: '#FFFFFF', fontSize: fontSize.xs, fontFamily: 'Cairo_600SemiBold' },
  addButton: {
    position: 'absolute',
    bottom: spacing.sm,
    end: spacing.sm,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldOut: {
    position: 'absolute',
    bottom: spacing.sm,
    start: spacing.sm,
    end: spacing.sm,
    borderRadius: borderRadius.full,
    paddingVertical: 4,
    alignItems: 'center',
  },
  soldOutText: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold' },
  cardBody: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 2 },
  name: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold', textAlign: 'left', minHeight: 36 },
  price: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', textAlign: 'left' },
  listPrice: { fontSize: fontSize.sm, fontFamily: 'Cairo_400Regular', textDecorationLine: 'line-through', textAlign: 'left' },
  toast: {
    position: 'absolute',
    start: spacing.lg,
    end: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  toastText: { flex: 1, fontSize: fontSize.sm, fontFamily: 'Cairo_400Regular', textAlign: 'left' },
  toastAction: { fontSize: fontSize.sm, fontFamily: 'Cairo_700Bold' },
});

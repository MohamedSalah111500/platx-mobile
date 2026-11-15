import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Image, RefreshControl, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../../theme/ThemeProvider';
import { useRTL } from '../../../i18n/RTLProvider';
import { useAuth } from '../../../hooks/useAuth';
import { isolate } from '../../../hooks/useDisplayFormat';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Spinner } from '../../../components/ui/Spinner';
import { ErrorRetry } from '../../../components/ui/ErrorRetry';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SearchBar } from '../../../components/ui/SearchBar';
import { SelectField } from '../../../components/ui/SelectField';
import { spacing, borderRadius } from '../../../theme/spacing';
import { fontSize } from '../../../theme/typography';
import { getFullImageUrl } from '../../../utils/imageUrl';
import { useTabBarSpace } from '../../../navigation/tabBar';
import {
  storeApi,
  storeDiscountPercent,
  storeEffectivePrice,
  type StoreCategory,
  type StoreProductCard,
} from '../../../services/api/store.api';
import { useStoreMoney } from '../StoreOrderDetailScreen';
import { StoreManageTabs } from './StoreOrdersScreen';
import type { ProfileStackParamList } from '../../../types/navigation.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'StoreProducts'>;
type VisibilityFilter = 'all' | 'active' | 'hidden';

const PAGE_SIZE = 20;

export default function StoreProductsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const { canModule } = useAuth();
  const money = useStoreMoney();
  const tabBarSpace = useTabBarSpace();
  const canCreate = canModule('Store', 'create');
  const canEdit = canModule('Store', 'edit');

  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<VisibilityFilter>('all');
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [products, setProducts] = useState<StoreProductCard[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [currency, setCurrency] = useState('EGP');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<Set<number>>(new Set());
  const requestId = useRef(0);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setLoading(true);
  }, [query, categoryId, visibility]);

  const fetchPage = useCallback(
    (target: number) =>
      storeApi.products({
        search: query,
        categoryId,
        visible: visibility === 'all' ? null : visibility === 'active',
        page: target,
        size: PAGE_SIZE,
      }),
    [query, categoryId, visibility],
  );

  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const result = await fetchPage(1);
      if (id !== requestId.current) return;
      setProducts(result.items);
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

  const loadMeta = useCallback(async () => {
    const [cats, status] = await Promise.allSettled([storeApi.categories(), storeApi.publicStatus()]);
    if (cats.status === 'fulfilled') setCategories(cats.value);
    if (status.status === 'fulfilled' && status.value.currencyCode) setCurrency(status.value.currencyCode);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useFocusEffect(
    useCallback(() => {
      loadMeta();
    }, [loadMeta]),
  );

  const loadMore = async () => {
    if (loadingMoreRef.current || error || products.length >= total) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const id = requestId.current;
    try {
      const next = await fetchPage(page + 1);
      if (id !== requestId.current) return;
      setProducts((current) => {
        const seen = new Set(current.map((product) => product.id));
        return [...current, ...next.items.filter((product) => !seen.has(product.id))];
      });
      setTotal(next.totalCount);
      setPage(page + 1);
    } catch {
      return;
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  };

  const toggleVisibility = async (product: StoreProductCard, next: boolean) => {
    if (toggling.has(product.id)) return;
    setToggling((current) => new Set(current).add(product.id));
    setProducts((current) => current.map((p) => (p.id === product.id ? { ...p, isVisible: next } : p)));
    try {
      await storeApi.setVisibility(product.id, next);
    } catch (err: any) {
      setProducts((current) => current.map((p) => (p.id === product.id ? { ...p, isVisible: !next } : p)));
      Alert.alert(t('common.error'), err?.userMessage || t('store.LOAD_FAILED'));
    } finally {
      setToggling((current) => {
        const copy = new Set(current);
        copy.delete(product.id);
        return copy;
      });
    }
  };

  const muted = { color: theme.colors.textMuted };
  const text = { color: theme.colors.text };
  const filtered = !!search.trim() || categoryId !== null || visibility !== 'all';

  const categoryOptions = [
    { value: 'all', label: t('store.PRODUCTS.ALL_CATEGORIES') },
    ...categories.map((category) => ({ value: String(category.id), label: category.name })),
  ];
  const visibilityOptions: { value: VisibilityFilter; label: string }[] = [
    { value: 'all', label: t('store.PRODUCTS.ALL_STATES') },
    { value: 'active', label: t('store.PRODUCTS.SHOWN') },
    { value: 'hidden', label: t('store.PRODUCTS.HIDDEN') },
  ];

  const header = (
    <View style={styles.headerBlock}>
      <StoreManageTabs current="products" onNavigate={(screen) => navigation.navigate(screen)} />
      {canCreate ? <Button title={t('store.PRODUCTS.ADD')} onPress={() => navigation.navigate('StoreProductForm', {})} fullWidth /> : null}
      <SearchBar value={search} onChangeText={setSearch} placeholder={t('store.PRODUCTS.SEARCH')} />
      <View style={styles.filters}>
        <View style={styles.flex}>
          <SelectField
            placeholder={t('store.PRODUCTS.ALL_CATEGORIES')}
            value={categoryId === null ? 'all' : String(categoryId)}
            options={categoryOptions}
            onChange={(value) => setCategoryId(value === 'all' ? null : Number(value))}
          />
        </View>
        <View style={styles.flex}>
          <SelectField placeholder={t('store.PRODUCTS.ALL_STATES')} value={visibility} options={visibilityOptions} onChange={setVisibility} />
        </View>
      </View>
      {filtered ? (
        <TouchableOpacity
          onPress={() => {
            setSearch('');
            setCategoryId(null);
            setVisibility('all');
          }}
          accessibilityRole="button"
        >
          <Text style={[styles.clear, { color: theme.colors.primary }]}>{t('store.PRODUCTS.CLEAR_FILTERS')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const renderProduct = ({ item }: { item: StoreProductCard }) => {
    const price = storeEffectivePrice(item);
    const percent = storeDiscountPercent(item);
    return (
      <TouchableOpacity
        style={[styles.row, { backgroundColor: theme.colors.card }]}
        onPress={() => navigation.navigate('StoreProductForm', { productId: item.id })}
        accessibilityRole="button"
        accessibilityLabel={item.name}
      >
        <View style={[styles.thumb, { backgroundColor: theme.colors.background }]}>
          {item.imageUrl ? (
            <Image source={{ uri: getFullImageUrl(item.imageUrl) }} style={styles.thumbImage} resizeMode="contain" />
          ) : (
            <Ionicons name="cube-outline" size={24} color={theme.colors.textMuted} />
          )}
        </View>
        <View style={styles.flex}>
          <Text style={[styles.name, text]} numberOfLines={2}>{item.name}</Text>
          <View style={styles.priceRow}>
            <Text style={[styles.price, text]}>{money(price, currency)}</Text>
            {percent ? <Text style={[styles.oldPrice, muted]}>{money(item.price, currency)}</Text> : null}
          </View>
          <Text style={[styles.meta, muted]} numberOfLines={1}>
            {item.categoryName || t('store.PRODUCTS.NO_CATEGORY')}
            {'  ·  '}
            {item.stock === null ? t('store.PRODUCTS.UNLIMITED') : t('store.PRODUCTS.LEFT', { count: isolate(String(item.stock)) })}
          </Text>
          <View style={styles.badges}>
            {item.stock === 0 ? <Badge text={t('store.OUT_OF_STOCK')} variant="danger" /> : null}
            {item.isFeatured ? <Badge text={t('store.PRODUCTS.FEATURED_BADGE')} variant="primary" /> : null}
          </View>
        </View>
        <View style={styles.toggle}>
          <Switch
            value={item.isVisible}
            onValueChange={(next) => toggleVisibility(item, next)}
            disabled={!canEdit || toggling.has(item.id)}
            trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
            accessibilityLabel={t('store.PRODUCTS.VISIBLE')}
          />
          <Text style={[styles.toggleLabel, muted]}>{t(item.isVisible ? 'store.PRODUCTS.SHOWN' : 'store.PRODUCTS.HIDDEN')}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const empty = () => {
    if (loading) return <Spinner />;
    if (error) return <ErrorRetry message={error} onRetry={() => { setLoading(true); load(); }} retryLabel={t('store.TRY_AGAIN')} />;
    if (filtered) return <Text style={[styles.empty, muted]}>{t('store.PRODUCTS.NO_RESULTS')}</Text>;
    return (
      <EmptyState
        icon={<Ionicons name="storefront-outline" size={48} color={theme.colors.textMuted} />}
        title={t('store.PRODUCTS.EMPTY_TITLE')}
        description={t('store.PRODUCTS.EMPTY_HINT')}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]} edges={['bottom', 'left', 'right']}>
      <ScreenHeader title={t('store.PAGES.PRODUCTS_TITLE')} onBack={() => navigation.goBack()} />
      <FlatList
        data={error ? [] : products}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderProduct}
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
              loadMeta();
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
  filters: { flexDirection: 'row', gap: spacing.sm },
  clear: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: borderRadius.xl, padding: spacing.md },
  thumb: { width: 64, height: 64, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
  name: { fontSize: fontSize.base, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  price: { fontSize: 14, fontFamily: 'Cairo_700Bold', textAlign: 'left' },
  oldPrice: { fontSize: 14, fontFamily: 'Cairo_400Regular', textDecorationLine: 'line-through' },
  meta: { fontSize: 14, fontFamily: 'Cairo_400Regular', textAlign: 'left' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 2 },
  toggle: { alignItems: 'center', gap: 2 },
  toggleLabel: { fontSize: 14, fontFamily: 'Cairo_500Medium' },
  empty: { fontSize: 14, fontFamily: 'Cairo_400Regular', textAlign: 'center', paddingVertical: spacing['2xl'] },
});

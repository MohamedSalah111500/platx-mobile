import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../types/navigation.types';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useTabBarSpace } from '../../navigation/tabBar';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { Spinner } from '../../components/ui/Spinner';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { formatPrice } from '../../utils/price';
import { getFullImageUrl } from '../../utils/imageUrl';
import {
  storeApi,
  storeDiscountPercent,
  storeEffectivePrice,
  type StoreProductDetails,
  type StoreStatus,
} from '../../services/api/store.api';
import { cartLimitOf, useCartStore } from '../../store/cart.store';
import { CartHeaderButton, cartResultMessage } from './StoreShopScreen';

const LOW_STOCK = 5;

type Props = NativeStackScreenProps<ProfileStackParamList, 'StoreProduct'>;

export default function StoreProductScreen({ navigation, route }: Props) {
  const { productId } = route.params;
  const { theme } = useTheme();
  const { t, locale } = useRTL();
  const tabBarSpace = useTabBarSpace();
  const { width } = useWindowDimensions();
  const add = useCartStore((s) => s.add);
  const { isStudent } = useAuth();
  const inCart = useCartStore((s) => s.lines.find((line) => line.productId === productId)?.quantity ?? 0);

  const [product, setProduct] = useState<StoreProductDetails | null>(null);
  const [status, setStatus] = useState<StoreStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [details, nextStatus] = await Promise.all([storeApi.publicProduct(productId), storeApi.publicStatus()]);
      setProduct(details);
      setStatus(nextStatus);
      setFailed(false);
      setNotFound(false);
    } catch (err: any) {
      const code = err?.status ?? err?.response?.status;
      if (code === 404) setNotFound(true);
      else setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const room = product ? Math.max(0, cartLimitOf(product.stock) - inCart) : 0;

  useEffect(() => {
    if (quantity > Math.max(1, room)) setQuantity(Math.max(1, room));
  }, [room, quantity]);

  const addToCart = (goToCart: boolean) => {
    if (!product) return;
    const result = room > 0 ? add(product, product.images[0]?.url ?? null, quantity) : 'limit';
    setQuantity(1);
    if (goToCart && result !== 'full') {
      navigation.navigate('StoreCart');
      return;
    }
    Alert.alert(t('store.CART'), cartResultMessage(result, t), [
      { text: t('store.CONTINUE_SHOPPING'), style: 'cancel' },
      { text: t('store.VIEW_CART'), onPress: () => navigation.navigate('StoreCart') },
    ]);
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    if (index !== imageIndex) setImageIndex(index);
  };

  const renderBody = () => {
    if (loading) return <Spinner />;
    if (notFound) {
      return (
        <ErrorRetry message={t('store.PRODUCT_NOT_FOUND')} retryLabel={t('store.BACK_TO_STORE')} onRetry={() => navigation.goBack()} />
      );
    }
    if (failed || !product) return <ErrorRetry message={t('store.LOAD_FAILED')} retryLabel={t('store.TRY_AGAIN')} onRetry={load} />;

    const currency = status?.currencyCode;
    const price = storeEffectivePrice(product);
    const percent = storeDiscountPercent(product);
    const soldOut = product.stock === 0;
    const closed = !status?.available;
    const images = product.images.length ? product.images : [{ id: 0, url: '' }];
    const stockText = soldOut
      ? t('store.OUT_OF_STOCK')
      : product.stock !== null && product.stock <= LOW_STOCK
        ? t('store.ONLY_LEFT', { count: product.stock })
        : product.stock === null
          ? t('store.SF.IN_STOCK')
          : t('store.SF.STOCK_LEFT', { count: product.stock });
    const stockColor = soldOut ? theme.colors.danger : product.stock !== null && product.stock <= LOW_STOCK ? theme.colors.warning : theme.colors.success;

    return (
      <>
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
          <View style={[styles.gallery, { backgroundColor: theme.dark ? theme.colors.surface : '#F4F4F6' }]}>
            <FlatList
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              onMomentumScrollEnd={onScroll}
              renderItem={({ item, index }) => {
                const uri = getFullImageUrl(item.url);
                return (
                  <View style={[styles.slide, { width }]} accessibilityLabel={t('store.IMAGE_N', { n: index + 1 })}>
                    {uri ? (
                      <Image source={{ uri }} style={styles.slideImage} resizeMode="contain" />
                    ) : (
                      <Ionicons name="cube-outline" size={64} color={theme.colors.textMuted} />
                    )}
                  </View>
                );
              }}
            />
            {images.length > 1 && (
              <View style={styles.dots}>
                {images.map((item, index) => (
                  <View
                    key={`${item.id}-${index}`}
                    style={[styles.dot, { backgroundColor: index === imageIndex ? theme.colors.primary : theme.colors.border }]}
                  />
                ))}
              </View>
            )}
          </View>

          <View style={styles.content}>
            {product.categoryName ? (
              <Text style={[styles.category, { color: theme.colors.primary }]}>{product.categoryName}</Text>
            ) : null}
            <Text style={[styles.title, { color: theme.colors.text }]}>{product.name}</Text>

            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: theme.colors.text }]}>{formatPrice(price, currency, locale)}</Text>
              {percent ? (
                <>
                  <Text style={[styles.listPrice, { color: theme.colors.textMuted }]}>{formatPrice(product.price, currency, locale)}</Text>
                  <View style={[styles.saveBadge, { backgroundColor: theme.colors.danger }]}>
                    <Text style={styles.saveText}>{t('store.SF.SAVE', { percent })}</Text>
                  </View>
                </>
              ) : null}
            </View>

            <View style={styles.stockRow}>
              <Ionicons name={soldOut ? 'close-circle' : 'checkmark-circle'} size={18} color={stockColor} />
              <Text style={[styles.stockText, { color: stockColor }]}>{stockText}</Text>
            </View>

            {inCart > 0 && (
              <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>{t('store.IN_CART', { count: inCart })}</Text>
            )}

            {product.description ? (
              <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{product.description}</Text>
            ) : null}

            <View style={[styles.infoCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Ionicons name="bicycle-outline" size={20} color={theme.colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoTitle, { color: theme.colors.text }]}>{t('store.SF.DELIVERY_TITLE')}</Text>
                <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>{t('store.SF.DELIVERY_TEXT')}</Text>
              </View>
            </View>

            {closed && (
              <Text style={[styles.meta, { color: theme.colors.danger }]}>{t('store.CLOSED_FOR_STUDENTS')}</Text>
            )}
          </View>
        </ScrollView>

        {isStudent && !closed && !soldOut && (
          <View style={[styles.footer, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border, paddingBottom: tabBarSpace + spacing.sm }]}>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={[styles.stepButton, { backgroundColor: theme.colors.background }, quantity <= 1 && styles.disabled]}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                accessibilityRole="button"
                accessibilityLabel={t('store.DECREASE')}
              >
                <Ionicons name="remove" size={20} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={[styles.quantity, { color: theme.colors.text }]} accessibilityLabel={t('store.QUANTITY')}>
                {quantity}
              </Text>
              <TouchableOpacity
                style={[styles.stepButton, { backgroundColor: theme.colors.background }, quantity >= room && styles.disabled]}
                onPress={() => setQuantity(Math.min(room, quantity + 1))}
                disabled={quantity >= room}
                accessibilityRole="button"
                accessibilityLabel={t('store.INCREASE')}
              >
                <Ionicons name="add" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.actions}>
              <Button title={t('store.ADD_TO_CART')} variant="secondary" onPress={() => addToCart(false)} style={styles.actionButton} />
              <Button title={t('store.BUY_NOW')} onPress={() => addToCart(true)} style={styles.actionButton} />
            </View>
          </View>
        )}
      </>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader
        title={product?.name ?? t('store.TITLE')}
        onBack={() => navigation.goBack()}
        rightElement={isStudent ? <CartHeaderButton onPress={() => navigation.navigate('StoreCart')} /> : undefined}
      />
      {renderBody()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gallery: { paddingBottom: spacing.md },
  slide: { height: 300, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  slideImage: { width: '100%', height: '100%' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  content: { padding: spacing.xl, gap: spacing.md },
  category: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },
  title: { fontSize: fontSize.xl, fontFamily: 'Cairo_700Bold', textAlign: 'left' },
  priceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  price: { fontSize: fontSize['2xl'], fontFamily: 'Cairo_700Bold' },
  listPrice: { fontSize: fontSize.base, fontFamily: 'Cairo_400Regular', textDecorationLine: 'line-through' },
  saveBadge: { borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  saveText: { color: '#FFFFFF', fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold' },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stockText: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },
  meta: { fontSize: fontSize.sm, fontFamily: 'Cairo_400Regular', textAlign: 'left' },
  description: { fontSize: fontSize.base, fontFamily: 'Cairo_400Regular', lineHeight: 26, textAlign: 'left' },
  infoCard: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderRadius: borderRadius.lg, borderWidth: 1 },
  infoTitle: { fontSize: fontSize.base, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },
  footer: { borderTopWidth: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  stepButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
  quantity: { fontSize: fontSize.lg, fontFamily: 'Cairo_700Bold', minWidth: 32, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.md },
  actionButton: { flex: 1 },
});

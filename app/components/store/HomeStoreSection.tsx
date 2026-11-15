import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { SectionHeader } from '../ui/SectionHeader';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { formatPrice } from '../../utils/price';
import { getFullImageUrl } from '../../utils/imageUrl';
import {
  storeApi,
  storeDiscountPercent,
  storeEffectivePrice,
  type StoreProductCard,
} from '../../services/api/store.api';

const PRODUCT_COUNT = 10;
const TILE_WIDTH = 150;

interface HomeStoreSectionProps {
  refreshKey: number;
  onOpenProduct: (productId: number) => void;
  onSeeAll: () => void;
}

export function HomeStoreSection({ refreshKey, onOpenProduct, onSeeAll }: HomeStoreSectionProps) {
  const { theme } = useTheme();
  const { t, locale } = useRTL();
  const [products, setProducts] = useState<StoreProductCard[]>([]);
  const [currency, setCurrency] = useState<string | undefined>();

  const load = useCallback(async () => {
    try {
      const status = await storeApi.publicStatus();
      if (!status.available) {
        setProducts([]);
        return;
      }
      setCurrency(status.currencyCode);
      const featured = await storeApi.publicProducts({ featured: true, inStock: true, page: 1, size: PRODUCT_COUNT });
      const items = featured.items.length
        ? featured.items
        : (await storeApi.publicProducts({ inStock: true, sort: 'newest', page: 1, size: PRODUCT_COUNT })).items;
      setProducts(items);
    } catch {
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (products.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title={t('store.TITLE')} onSeeAll={onSeeAll} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {products.map((product) => {
          const image = getFullImageUrl(product.imageUrl);
          const percent = storeDiscountPercent(product);
          return (
            <TouchableOpacity
              key={product.id}
              style={[styles.tile, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              activeOpacity={0.85}
              onPress={() => onOpenProduct(product.id)}
              accessibilityRole="button"
              accessibilityLabel={product.name}
            >
              <View style={[styles.imageBox, { backgroundColor: theme.dark ? theme.colors.surface : '#F4F4F6' }]}>
                {image ? (
                  <Image source={{ uri: image }} style={styles.image} resizeMode="contain" />
                ) : (
                  <Ionicons name="cube-outline" size={32} color={theme.colors.textMuted} />
                )}
                {percent ? (
                  <View style={[styles.saleBadge, { backgroundColor: theme.colors.danger }]}>
                    <Text style={styles.saleText}>{`‎-${percent}%`}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.body}>
                <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={2}>
                  {product.name}
                </Text>
                <Text style={[styles.price, { color: theme.colors.text }]}>
                  {formatPrice(storeEffectivePrice(product), currency, locale)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing['2xl'] },
  row: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  tile: { width: TILE_WIDTH, borderRadius: borderRadius.lg, borderWidth: 1, overflow: 'hidden' },
  imageBox: { aspectRatio: 1.25, alignItems: 'center', justifyContent: 'center', padding: spacing.sm },
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
  body: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 2 },
  name: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold', textAlign: 'left', minHeight: 36 },
  price: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', textAlign: 'left' },
});

export default HomeStoreSection;

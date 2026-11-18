import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../../theme/ThemeProvider';
import { useRTL } from '../../../i18n/RTLProvider';
import { useAuth } from '../../../hooks/useAuth';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Spinner } from '../../../components/ui/Spinner';
import { ErrorRetry } from '../../../components/ui/ErrorRetry';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { SelectField } from '../../../components/ui/SelectField';
import { SwitchField } from '../../../components/ui/SwitchField';
import { spacing, borderRadius } from '../../../theme/spacing';
import { fontSize } from '../../../theme/typography';
import { getFullImageUrl } from '../../../utils/imageUrl';
import { useTabBarSpace } from '../../../navigation/tabBar';
import {
  storeApi,
  type SaveStoreProduct,
  type StoreCategory,
  type StoreProductDetails,
  type StoreProductImage,
  type UploadFile,
} from '../../../services/api/store.api';
import type { ProfileStackParamList } from '../../../types/navigation.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'StoreProductForm'>;

interface FormValues {
  name: string;
  description: string;
  price: string;
  compareAtPrice: string;
  limitedStock: boolean;
  stock: string;
  categoryId: number | null;
  isVisible: boolean;
  isFeatured: boolean;
}

const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MONEY = /^\d+(\.\d{1,2})?$/;
const WHOLE = /^\d+$/;
const NO_CATEGORY = 'none';

const normalizeNumber = (value: string) => value.trim().replace(',', '.').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

function valuesOf(product: StoreProductDetails | null): FormValues {
  const discounted = !!product?.discountPrice && product.discountPrice < product.price;
  return {
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product ? String(discounted ? product.discountPrice : product.price) : '',
    compareAtPrice: discounted && product ? String(product.price) : '',
    limitedStock: product ? product.stock !== null : false,
    stock: product?.stock !== null && product?.stock !== undefined ? String(product.stock) : '',
    categoryId: product?.categoryId ?? null,
    isVisible: product?.isVisible ?? true,
    isFeatured: product?.isFeatured ?? false,
  };
}

export default function StoreProductFormScreen({ navigation, route }: Props) {
  const productId = route.params?.productId ?? null;
  const isNew = productId === null;
  const { theme } = useTheme();
  const { t } = useRTL();
  const { canModule } = useAuth();
  const tabBarSpace = useTabBarSpace();
  const canSave = isNew ? canModule('Store', 'create') : canModule('Store', 'edit');
  const canDelete = !isNew && canModule('Store', 'delete');
  const canEditImages = isNew ? canSave : canModule('Store', 'edit');

  const [product, setProduct] = useState<StoreProductDetails | null>(null);
  const [initial, setInitial] = useState<FormValues>(valuesOf(null));
  const [values, setValues] = useState<FormValues>(valuesOf(null));
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [queued, setQueued] = useState<UploadFile[]>([]);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const leaving = useRef(false);

  const reset = useCallback((next: StoreProductDetails | null) => {
    setProduct(next);
    const formValues = valuesOf(next);
    setInitial(formValues);
    setValues(formValues);
    setSubmitted(false);
    setQueued([]);
  }, []);

  const load = useCallback(async () => {
    if (productId === null) return;
    setLoading(true);
    setLoadError(null);
    try {
      reset(await storeApi.product(productId));
    } catch (err: any) {
      setLoadError(err?.userMessage || t('store.LOAD_FAILED'));
    } finally {
      setLoading(false);
    }
  }, [productId, reset, t]);

  useEffect(() => {
    load();
    storeApi.categories().then(setCategories).catch(() => undefined);
  }, [load]);

  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(initial) || queued.length > 0, [values, initial, queued]);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (leaving.current || !dirty) return;
        event.preventDefault();
        Alert.alert(t('store.SETTINGS.UNSAVED'), t('store.PRODUCTS.LEAVE_CONFIRM'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('store.SETTINGS.DISCARD'), style: 'destructive', onPress: () => navigation.dispatch(event.data.action) },
        ]);
      }),
    [navigation, dirty, t],
  );

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => setValues((current) => ({ ...current, [key]: value }));

  const price = normalizeNumber(values.price);
  const compareAt = normalizeNumber(values.compareAtPrice);
  const stock = normalizeNumber(values.stock);
  const priceNumber = Number(price);
  const compareNumber = Number(compareAt);

  const errors = {
    name: !values.name.trim() || values.name.trim().length > 150 ? t('store.PRODUCTS.NAME_REQUIRED') : undefined,
    description: values.description.trim().length > 2000 ? t('store.PRODUCTS.FIX_ERRORS') : undefined,
    price: !MONEY.test(price) || priceNumber < 0.01 || priceNumber > 1000000 ? t('store.PRODUCTS.PRICE_INVALID') : undefined,
    compareAt: compareAt
      ? !MONEY.test(compareAt) || compareNumber < 0.01 || compareNumber > 1000000
        ? t('store.PRODUCTS.PRICE_INVALID')
        : MONEY.test(price) && compareNumber <= priceNumber
          ? t('store.PRODUCTS.COMPARE_AT_INVALID')
          : undefined
      : undefined,
    stock: values.limitedStock && (!WHOLE.test(stock) || Number(stock) > 100000) ? t('store.PRODUCTS.STOCK_INVALID') : undefined,
  };
  const invalid = Object.values(errors).some(Boolean);
  const discount = !errors.price && !errors.compareAt && compareAt ? Math.round((1 - priceNumber / compareNumber) * 100) : null;

  const payload = (): SaveStoreProduct => {
    const stockTouched = values.limitedStock !== initial.limitedStock || values.stock !== initial.stock;
    const compare = compareAt ? compareNumber : null;
    return {
      name: values.name.trim(),
      description: values.description.trim() || null,
      price: compare ?? priceNumber,
      discountPrice: compare ? priceNumber : null,
      stock: values.limitedStock ? Number(stock) : null,
      categoryId: values.categoryId,
      isVisible: values.isVisible,
      isFeatured: values.isFeatured,
      keepStock: !!product && !stockTouched,
      originalStock: product && stockTouched ? product.stock : null,
    };
  };

  const save = async () => {
    setSubmitted(true);
    if (invalid || saving || !canSave) {
      Alert.alert(t('common.validation'), t('store.PRODUCTS.FIX_ERRORS'));
      return;
    }
    setSaving(true);
    try {
      const saved = product ? await storeApi.updateProduct(product.id, payload()) : await storeApi.createProduct(payload());
      let imagesFailed = false;
      if (!product && queued.length) {
        try {
          await storeApi.addImages(saved.id, queued);
        } catch {
          imagesFailed = true;
        }
      }
      leaving.current = true;
      setQueued([]);
      if (imagesFailed) {
        Alert.alert(t('common.error'), t('store.PRODUCTS.IMAGES_FAILED'));
        navigation.replace('StoreProductForm', { productId: saved.id });
        return;
      }
      Alert.alert(t('common.success'), t(product ? 'store.PRODUCTS.UPDATED' : 'store.PRODUCTS.CREATED'));
      navigation.goBack();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('store.LOAD_FAILED'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!product) return;
    Alert.alert(t('store.PRODUCTS.DELETE_PRODUCT'), t('store.PRODUCTS.DELETE_CONFIRM', { name: product.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('store.DELETE'),
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await storeApi.deleteProduct(product.id);
            leaving.current = true;
            Alert.alert(t('common.success'), t('store.PRODUCTS.DELETED'));
            navigation.goBack();
          } catch (err: any) {
            Alert.alert(t('common.error'), err?.userMessage || t('store.LOAD_FAILED'));
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const imageCount = (product?.images.length ?? 0) + queued.length;

  const pickImages = async () => {
    if (imageBusy || !canEditImages) return;
    const room = MAX_IMAGES - imageCount;
    if (room <= 0) {
      Alert.alert(t('common.info'), t('store.PRODUCTS.TOO_MANY_IMAGES', { max: MAX_IMAGES }));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: room, quality: 0.85 });
    if (result.canceled || !result.assets?.length) return;
    if (result.assets.length > room) {
      Alert.alert(t('common.info'), t('store.PRODUCTS.TOO_MANY_IMAGES', { max: MAX_IMAGES }));
      return;
    }
    const files: UploadFile[] = result.assets.map((asset, index) => ({
      uri: asset.uri,
      name: asset.fileName || `product-${Date.now()}-${index}.jpg`,
      type: asset.mimeType || 'image/jpeg',
    }));
    const tooBig = result.assets.some((asset) => (asset.fileSize ?? 0) > MAX_IMAGE_BYTES);
    if (tooBig || files.some((file) => !IMAGE_TYPES.includes(file.type))) {
      Alert.alert(t('common.info'), t('store.PRODUCTS.IMAGE_RULES'));
      return;
    }
    if (!product) {
      setQueued((current) => [...current, ...files]);
      return;
    }
    setImageBusy(true);
    try {
      const updated = await storeApi.addImages(product.id, files);
      setProduct((current) => (current ? { ...current, images: updated.images } : current));
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('store.PRODUCTS.IMAGE_RULES'));
    } finally {
      setImageBusy(false);
    }
  };

  const imageAction = async (request: () => Promise<StoreProductDetails>) => {
    if (imageBusy) return;
    setImageBusy(true);
    try {
      const updated = await request();
      setProduct((current) => (current ? { ...current, images: updated.images } : current));
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('store.LOAD_FAILED'));
    } finally {
      setImageBusy(false);
    }
  };

  const createCategory = async () => {
    const name = newCategory.trim();
    if (!name || creatingCategory) return;
    setCreatingCategory(true);
    try {
      const category = await storeApi.createCategory(name);
      setCategories((current) => [...current.filter((c) => c.id !== category.id), category]);
      set('categoryId', category.id);
      setAddingCategory(false);
      setNewCategory('');
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('store.LOAD_FAILED'));
    } finally {
      setCreatingCategory(false);
    }
  };

  const muted = { color: theme.colors.textMuted };
  const text = { color: theme.colors.text };
  const card = [styles.card, { backgroundColor: theme.colors.card }];
  const show = (error?: string) => (submitted ? error : undefined);

  const categoryOptions = [
    { value: NO_CATEGORY, label: t('store.PRODUCTS.NO_CATEGORY') },
    ...categories.map((category) => ({ value: String(category.id), label: category.name })),
  ];

  const imageTile = (key: string, uri: string | undefined, cover: boolean, onRemove: () => void, onCover: () => void, index: number) => (
    <View key={key} style={[styles.tile, { backgroundColor: theme.colors.background, borderColor: cover ? theme.colors.primary : theme.colors.border }]}>
      {uri ? <Image source={{ uri }} style={styles.tileImage} resizeMode="contain" /> : null}
      {cover ? (
        <View style={[styles.coverTag, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.coverText}>{t('store.PRODUCTS.COVER')}</Text>
        </View>
      ) : null}
      {canEditImages ? (
        <View style={styles.tileActions}>
          {!cover ? (
            <TouchableOpacity style={styles.tileButton} onPress={onCover} disabled={imageBusy} accessibilityRole="button" accessibilityLabel={t('store.PRODUCTS.MAKE_COVER')}>
              <Ionicons name="star-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.tileButton}
            onPress={onRemove}
            disabled={imageBusy}
            accessibilityRole="button"
            accessibilityLabel={t('store.PRODUCTS.REMOVE_IMAGE', { n: index + 1 })}
          >
            <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );

  const renderBody = () => {
    if (loading) return <Spinner />;
    if (loadError) return <ErrorRetry message={loadError} onRetry={load} retryLabel={t('store.TRY_AGAIN')} />;

    return (
      <>
        <View style={card}>
          <Text style={[styles.section, text]}>{t('store.PRODUCTS.SECTION_BASIC')}</Text>
          <Input
            label={t('store.PRODUCTS.NAME')}
            placeholder={t('store.PRODUCTS.NAME_PLACEHOLDER')}
            value={values.name}
            onChangeText={(value) => set('name', value)}
            maxLength={150}
            editable={canSave}
            error={show(errors.name)}
          />
          <Input
            label={t('store.PRODUCTS.DESCRIPTION_OPTIONAL')}
            placeholder={t('store.PRODUCTS.DESCRIPTION_PLACEHOLDER')}
            value={values.description}
            onChangeText={(value) => set('description', value)}
            maxLength={2000}
            multiline
            numberOfLines={4}
            style={styles.multiline}
            textAlignVertical="top"
            editable={canSave}
            error={show(errors.description)}
          />
          <SelectField
            label={t('store.PRODUCTS.CATEGORY')}
            placeholder={t('store.PRODUCTS.NO_CATEGORY')}
            value={values.categoryId === null ? NO_CATEGORY : String(values.categoryId)}
            options={categoryOptions}
            onChange={(value) => canSave && set('categoryId', value === NO_CATEGORY ? null : Number(value))}
          />
          {canSave ? (
            addingCategory ? (
              <View style={styles.inlineRow}>
                <TextInput
                  style={[styles.inlineInput, { borderColor: theme.colors.inputBorder, backgroundColor: theme.colors.inputBackground, color: theme.colors.inputText }]}
                  value={newCategory}
                  onChangeText={setNewCategory}
                  placeholder={t('store.PRODUCTS.NEW_CATEGORY')}
                  placeholderTextColor={theme.colors.inputPlaceholder}
                  maxLength={60}
                  autoFocus
                  onSubmitEditing={createCategory}
                  accessibilityLabel={t('store.PRODUCTS.NEW_CATEGORY')}
                />
                <Button title={t('store.CATEGORIES.ADD')} size="small" onPress={createCategory} loading={creatingCategory} disabled={!newCategory.trim()} />
                <TouchableOpacity onPress={() => setAddingCategory(false)} accessibilityRole="button" accessibilityLabel={t('common.cancel')}>
                  <Ionicons name="close" size={22} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.linkRow} onPress={() => setAddingCategory(true)} accessibilityRole="button">
                <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
                <Text style={[styles.link, { color: theme.colors.primary }]}>{t('store.PRODUCTS.NEW_CATEGORY')}</Text>
              </TouchableOpacity>
            )
          ) : null}
        </View>

        <View style={card}>
          <Text style={[styles.section, text]}>{t('store.PRODUCTS.IMAGES')}</Text>
          <Text style={[styles.meta, muted]}>{t('store.PRODUCTS.IMAGES_HINT', { max: MAX_IMAGES })}</Text>
          {product ? <Text style={[styles.meta, muted]}>{t('store.PRODUCTS.IMAGES_SAVED_NOW')}</Text> : null}
          <View style={styles.tiles}>
            {product
              ? product.images.map((image: StoreProductImage, index) =>
                  imageTile(
                    `img-${image.id}`,
                    getFullImageUrl(image.url),
                    index === 0,
                    () => imageAction(() => storeApi.removeImage(product.id, image.id)),
                    () => imageAction(() => storeApi.setCover(product.id, image.id)),
                    index,
                  ),
                )
              : queued.map((file, index) =>
                  imageTile(
                    `queued-${file.uri}`,
                    file.uri,
                    index === 0,
                    () => setQueued((current) => current.filter((_, i) => i !== index)),
                    () => setQueued((current) => [current[index], ...current.filter((_, i) => i !== index)]),
                    index,
                  ),
                )}
            {canEditImages && imageCount < MAX_IMAGES ? (
              <TouchableOpacity
                style={[styles.tile, styles.addTile, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                onPress={pickImages}
                disabled={imageBusy}
                accessibilityRole="button"
                accessibilityLabel={t('store.PRODUCTS.ADD_IMAGES')}
              >
                {imageBusy ? <ActivityIndicator color={theme.colors.primary} /> : <Ionicons name="images-outline" size={26} color={theme.colors.primary} />}
                <Text style={[styles.addText, { color: theme.colors.primary }]}>{t('store.PRODUCTS.ADD_IMAGES')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {!isNew && !canEditImages ? <Text style={[styles.meta, muted]}>{t('store.PRODUCTS.IMAGES_NEED_EDIT')}</Text> : null}
        </View>

        <View style={card}>
          <Text style={[styles.section, text]}>{t('store.PRODUCTS.SECTION_PRICING')}</Text>
          <Input
            label={t('store.PRODUCTS.SELLING_PRICE')}
            value={values.price}
            onChangeText={(value) => set('price', value)}
            keyboardType="decimal-pad"
            editable={canSave}
            error={show(errors.price)}
          />
          <Input
            label={`${t('store.PRODUCTS.COMPARE_AT')} (${t('store.PRODUCTS.OPTIONAL')})`}
            value={values.compareAtPrice}
            onChangeText={(value) => set('compareAtPrice', value)}
            keyboardType="decimal-pad"
            editable={canSave}
            hint={discount && discount > 0 ? `${t('store.PRODUCTS.DISCOUNT_HINT', { percent: discount })} · ${t('store.PRODUCTS.DISCOUNT_SHOWN')}` : t('store.PRODUCTS.COMPARE_AT_HINT')}
            error={errors.compareAt && (submitted || compareAt) ? errors.compareAt : undefined}
          />
        </View>

        <View style={card}>
          <Text style={[styles.section, text]}>{t('store.PRODUCTS.SECTION_INVENTORY')}</Text>
          <SwitchField
            label={t('store.PRODUCTS.LIMITED_STOCK')}
            hint={values.limitedStock ? t('store.PRODUCTS.LIMITED_STOCK_HINT') : t('store.PRODUCTS.UNLIMITED_HINT')}
            value={values.limitedStock}
            onChange={(value) => set('limitedStock', value)}
            disabled={!canSave}
          />
          {values.limitedStock ? (
            <Input
              label={t('store.PRODUCTS.STOCK_AVAILABLE')}
              value={values.stock}
              onChangeText={(value) => set('stock', value)}
              keyboardType="number-pad"
              editable={canSave}
              error={show(errors.stock)}
            />
          ) : null}
        </View>

        <View style={card}>
          <Text style={[styles.section, text]}>{t('store.PRODUCTS.SECTION_PROMOTION')}</Text>
          <SwitchField
            label={t('store.PRODUCTS.VISIBLE')}
            hint={values.isVisible ? t('store.PRODUCTS.SHOWN_HINT') : t('store.PRODUCTS.VISIBLE_HINT')}
            value={values.isVisible}
            onChange={(value) => set('isVisible', value)}
            disabled={!canSave}
          />
          <SwitchField
            label={t('store.PRODUCTS.FEATURED')}
            hint={t('store.PRODUCTS.FEATURED_HINT')}
            value={values.isFeatured}
            onChange={(value) => set('isFeatured', value)}
            disabled={!canSave}
          />
        </View>

        {canSave ? <Button title={t('store.PRODUCTS.SAVE_PRODUCT')} onPress={save} loading={saving} disabled={deleting} fullWidth /> : null}
        {canDelete ? <Button title={t('store.PRODUCTS.DELETE_PRODUCT')} variant="secondary" onPress={confirmDelete} loading={deleting} disabled={saving} fullWidth /> : null}
      </>
    );
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]} edges={['bottom', 'left', 'right']}>
      <ScreenHeader title={t(isNew ? 'store.PRODUCTS.ADD' : 'store.PRODUCTS.EDIT')} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarSpace + spacing.lg }]} keyboardShouldPersistTaps="handled">
          {renderBody()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  card: { borderRadius: borderRadius.xl, padding: spacing.lg, gap: spacing.sm },
  section: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', textAlign: 'left' },
  meta: { fontSize: 14, fontFamily: 'Cairo_400Regular', textAlign: 'left' },
  multiline: { minHeight: 96 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  inlineInput: { flex: 1, borderWidth: 1, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSize.base, fontFamily: 'Cairo_400Regular' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start' },
  link: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', lineHeight: 20, includeFontPadding: false, textAlignVertical: 'center' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { width: 96, height: 96, borderRadius: borderRadius.md, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  tileImage: { width: '100%', height: '100%' },
  addTile: { borderStyle: 'dashed', gap: 2, padding: spacing.xs },
  addText: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', textAlign: 'center', lineHeight: 20, includeFontPadding: false, textAlignVertical: 'center' },
  coverTag: { position: 'absolute', top: 4, left: 4, borderRadius: borderRadius.sm, paddingHorizontal: 6 },
  coverText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Cairo_600SemiBold' },
  tileActions: { position: 'absolute', bottom: 4, right: 4, flexDirection: 'row', gap: 4 },
  tileButton: { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: borderRadius.sm, padding: 4 },
});

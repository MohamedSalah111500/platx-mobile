import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import type { CountryCode } from 'libphonenumber-js/mobile';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../types/navigation.types';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useTabBarSpace } from '../../navigation/tabBar';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { formatAmount, formatPrice } from '../../utils/price';
import { getFullImageUrl } from '../../utils/imageUrl';
import { splitPhone, toE164Phone } from '../../utils/phoneNumber';
import { REQUEST_ONLY } from '../../config/storePolicy';
import { usePlatformAccess } from '../../store/platformAccess.store';
import {
  PAYMENT_METHOD_BANK,
  PAYMENT_METHOD_INSTAPAY,
  PAYMENT_METHOD_VODAFONE,
  DEFAULT_WALLET_PROVIDER,
} from '../../types/reservation.types';
import {
  StoreDeliveryMethod,
  StorePaymentMethod,
  newRequestId,
  storeApi,
  storeDiscountPercent,
  type PlaceStoreOrder,
  type StoreMe,
  type StoreStatus,
  type StoreTransferAccount,
  type UploadFile,
} from '../../services/api/store.api';
import { cartLimitOf, cartTotal, useCartStore, type CartLine } from '../../store/cart.store';

const CHANNELS = [PAYMENT_METHOD_VODAFONE, PAYMENT_METHOD_INSTAPAY, PAYMENT_METHOD_BANK];
const CHANNEL_KEY: Record<number, string> = {
  [PAYMENT_METHOD_VODAFONE]: 'store.TRANSFER.CHANNEL.Wallet',
  [PAYMENT_METHOD_INSTAPAY]: 'store.TRANSFER.CHANNEL.Instapay',
  [PAYMENT_METHOD_BANK]: 'store.TRANSFER.CHANNEL.Bank',
};
const RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

type Props = NativeStackScreenProps<ProfileStackParamList, 'StoreCart'>;

const errorMessage = (err: any, fallback: string) => err?.response?.data?.message || err?.userMessage || fallback;

export default function StoreCartScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t, locale } = useRTL();
  const tabBarSpace = useTabBarSpace();
  const isOn = usePlatformAccess();
  const lines = useCartStore((s) => s.lines);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeLine = useCartStore((s) => s.remove);
  const syncCart = useCartStore((s) => s.sync);
  const clearCart = useCartStore((s) => s.clear);

  const [status, setStatus] = useState<StoreStatus | null>(null);
  const [me, setMe] = useState<StoreMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [deliveryMethod, setDeliveryMethod] = useState<StoreDeliveryMethod>(StoreDeliveryMethod.Pickup);
  const [paymentMethod, setPaymentMethod] = useState<StorePaymentMethod | null>(null);
  const [channel, setChannel] = useState<number | null>(null);
  const [phone, setPhone] = useState('');
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>(splitPhone(null).country);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState<UploadFile | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [placing, setPlacing] = useState(false);
  const placingRef = useRef(false);
  const requestIdRef = useRef(newRequestId());
  const phoneFilled = useRef(false);

  const total = cartTotal(lines);
  const currency = status?.currencyCode;
  const cartSignature = useMemo(() => JSON.stringify(lines.map((line) => [line.productId, line.quantity, line.unitPrice])), [lines]);

  useEffect(() => {
    requestIdRef.current = newRequestId();
  }, [cartSignature]);

  const channels = useMemo(
    () => (status?.acceptTransfer ? CHANNELS.filter((value) => me?.transferAccounts?.some((account) => account.method === value)) : []),
    [status?.acceptTransfer, me?.transferAccounts]
  );
  const pointsShort = (me?.pointsBalance ?? 0) < total;

  const methods = useMemo(() => {
    const list: StorePaymentMethod[] = [];
    if (status?.acceptPoints) list.push(StorePaymentMethod.Points);
    if (status?.acceptCashOnDelivery) list.push(StorePaymentMethod.CashOnDelivery);
    if (channels.length) list.push(StorePaymentMethod.Transfer);
    return list;
  }, [status?.acceptPoints, status?.acceptCashOnDelivery, channels.length]);

  useEffect(() => {
    if (!channel || !channels.includes(channel)) setChannel(channels[0] ?? null);
  }, [channels, channel]);

  useEffect(() => {
    const usable = methods.filter((method) => method !== StorePaymentMethod.Points || !pointsShort);
    if (paymentMethod === null || !usable.includes(paymentMethod)) setPaymentMethod(usable[0] ?? null);
  }, [methods, pointsShort, paymentMethod]);

  const reload = useCallback(async () => {
    try {
      const [nextStatus, nextMe] = await Promise.all([storeApi.publicStatus(), storeApi.me()]);
      setStatus(nextStatus);
      setMe(nextMe);
      if (!phoneFilled.current && nextMe.phone) {
        phoneFilled.current = true;
        const split = splitPhone(nextMe.phone);
        setPhone(split.national);
        setPhoneCountry(split.country);
      }
      const ids = useCartStore.getState().lines.map((line) => line.productId);
      if (nextStatus.available && ids.length) {
        const fresh = await storeApi.lookupProducts(ids);
        if (syncCart(fresh)) Alert.alert(t('store.CART'), t('store.CART_UPDATED'));
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [syncCart, t]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const remove = (line: CartLine) => {
    Alert.alert(t('store.REMOVE'), line.name, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('store.REMOVE'), style: 'destructive', onPress: () => removeLine(line.productId) },
    ]);
  };

  const pickReceipt = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const type = asset.mimeType || 'image/jpeg';
    if (!RECEIPT_TYPES.includes(type) || (asset.fileSize ?? 0) > MAX_RECEIPT_BYTES) {
      Alert.alert(t('store.TRANSFER.RECEIPT'), t('store.TRANSFER.RECEIPT_RULES'));
      return;
    }
    const extension = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
    setReceipt({ uri: asset.uri, name: asset.fileName || `receipt-${Date.now()}.${extension}`, type });
  };

  const phoneE164 = toE164Phone(phone, phoneCountry);
  const needsAddress = deliveryMethod === StoreDeliveryMethod.Delivery;
  const addressMissing = needsAddress && !address.trim();
  const canSubmit =
    paymentMethod !== null &&
    !placing &&
    (paymentMethod !== StorePaymentMethod.Points || !pointsShort) &&
    (paymentMethod !== StorePaymentMethod.Transfer || (!!channel && !!receipt));

  const place = async () => {
    setSubmitted(true);
    if (placingRef.current || !lines.length) return;
    if (!phoneE164 || addressMissing || !canSubmit) {
      if (paymentMethod === StorePaymentMethod.Transfer && !receipt) Alert.alert(t('store.TRANSFER.RECEIPT'), t('store.TRANSFER.RECEIPT_REQUIRED'));
      return;
    }
    const order: PlaceStoreOrder = {
      items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
      paymentMethod: paymentMethod!,
      deliveryMethod,
      phone: phoneE164,
      address: needsAddress ? address.trim().slice(0, 300) : null,
      notes: notes.trim().slice(0, 500) || null,
      expectedTotal: total,
      clientRequestId: requestIdRef.current,
    };
    placingRef.current = true;
    setPlacing(true);
    try {
      const placed =
        paymentMethod === StorePaymentMethod.Transfer
          ? await storeApi.placeTransferOrder(order, channel!, receipt!)
          : await storeApi.placeOrder(order);
      requestIdRef.current = newRequestId();
      clearCart();
      setReceipt(null);
      setSubmitted(false);
      Alert.alert(t('store.ORDER_PLACED'), t('store.PLACED_BANNER', { id: placed.id }));
      navigation.replace('StoreOrderDetail', { orderId: placed.id, mine: true });
    } catch (err: any) {
      Alert.alert(t('common.error'), errorMessage(err, t('store.LOAD_FAILED')));
      const code = err?.status ?? err?.response?.status;
      if (code && code !== 429 && code < 500) reload();
    } finally {
      placingRef.current = false;
      setPlacing(false);
    }
  };

  const renderLine = (line: CartLine) => {
    const image = getFullImageUrl(line.imageUrl);
    const limit = cartLimitOf(line.stock);
    const percent = line.listPrice ? storeDiscountPercent({ price: line.listPrice, discountPrice: line.unitPrice }) : null;
    return (
      <View key={line.productId} style={[styles.line, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.lineImage, { backgroundColor: theme.dark ? theme.colors.surface : '#F4F4F6' }]}
          onPress={() => navigation.navigate('StoreProduct', { productId: line.productId })}
          accessibilityRole="button"
          accessibilityLabel={line.name}
        >
          {image ? <Image source={{ uri: image }} style={styles.fill} resizeMode="contain" /> : <Ionicons name="cube-outline" size={28} color={theme.colors.textMuted} />}
        </TouchableOpacity>
        <View style={styles.lineBody}>
          <View style={styles.lineTop}>
            <Text style={[styles.lineName, { color: theme.colors.text }]} numberOfLines={2}>
              {line.name}
            </Text>
            <TouchableOpacity onPress={() => remove(line)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('store.REMOVE')}>
              <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
            </TouchableOpacity>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.linePrice, { color: theme.colors.text }]}>{formatPrice(line.unitPrice, currency, locale)}</Text>
            {percent && line.listPrice ? (
              <Text style={[styles.listPrice, { color: theme.colors.textMuted }]}>{formatPrice(line.listPrice, currency, locale)}</Text>
            ) : null}
          </View>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={[styles.stepButton, { backgroundColor: theme.colors.background }, line.quantity <= 1 && styles.disabled]}
              onPress={() => setQuantity(line.productId, line.quantity - 1)}
              disabled={line.quantity <= 1}
              accessibilityRole="button"
              accessibilityLabel={t('store.DECREASE')}
            >
              <Ionicons name="remove" size={18} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.quantity, { color: theme.colors.text }]}>{line.quantity}</Text>
            <TouchableOpacity
              style={[styles.stepButton, { backgroundColor: theme.colors.background }, line.quantity >= limit && styles.disabled]}
              onPress={() => setQuantity(line.productId, line.quantity + 1)}
              disabled={line.quantity >= limit}
              accessibilityRole="button"
              accessibilityLabel={t('store.INCREASE')}
            >
              <Ionicons name="add" size={18} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const option = (key: string, selected: boolean, label: string, onPress: () => void, disabled = false, hint?: string) => (
    <TouchableOpacity
      key={key}
      style={[
        styles.option,
        { backgroundColor: theme.colors.card, borderColor: selected ? theme.colors.primary : theme.colors.border },
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
    >
      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? theme.colors.primary : theme.colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.optionText, { color: theme.colors.text }]}>{label}</Text>
        {hint ? <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>{hint}</Text> : null}
      </View>
    </TouchableOpacity>
  );

  const field = (key: string, label: string, value?: string | null) =>
    value ? (
      <View key={key} style={styles.payField}>
        <Text style={[styles.hint, { color: theme.colors.textMuted }]}>{label}</Text>
        <Text selectable style={[styles.payValue, { color: theme.colors.text }]}>
          {value}
        </Text>
      </View>
    ) : null;

  const renderAccount = (account: StoreTransferAccount) => {
    if (account.method === PAYMENT_METHOD_VODAFONE) return field(`${account.id}`, account.bankName || DEFAULT_WALLET_PROVIDER, account.phoneNumber);
    if (account.method === PAYMENT_METHOD_INSTAPAY) return field(`${account.id}`, 'InstaPay', account.accountNumber || account.phoneNumber);
    return (
      <View key={account.id} style={[styles.bankBlock, { borderColor: theme.colors.border }]}>
        {field('bank', account.bankName ?? '', account.accountHolderName)}
        {field('account', t('store.TRANSFER.CHANNEL.Bank'), account.accountNumber)}
      </View>
    );
  };

  const paymentLabel = (method: StorePaymentMethod) => t(`store.PAYMENT.${StorePaymentMethod[method]}`);

  const renderCheckout = () => {
    if (!status) {
      return (
        <View style={styles.section}>
          <Text style={[styles.notice, { color: theme.colors.danger }]}>{t('store.LOAD_FAILED')}</Text>
          <Button title={t('store.TRY_AGAIN')} variant="secondary" size="small" onPress={reload} />
        </View>
      );
    }
    if (!status.available) {
      return <Text style={[styles.notice, { color: theme.colors.danger }]}>{t('store.CLOSED_CART')}</Text>;
    }
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('store.DELIVERY')}</Text>
        {option('pickup', deliveryMethod === StoreDeliveryMethod.Pickup, t('store.PICKUP'), () => setDeliveryMethod(StoreDeliveryMethod.Pickup))}
        {option('delivery', deliveryMethod === StoreDeliveryMethod.Delivery, t('store.DELIVERY_TO_ADDRESS'), () => setDeliveryMethod(StoreDeliveryMethod.Delivery))}

        <View style={styles.formBlock}>
          <PhoneInput
            label={t('store.PHONE')}
            value={phone}
            country={phoneCountry}
            onChangeText={setPhone}
            onChangeCountry={setPhoneCountry}
            error={submitted && !phoneE164 ? t('store.PHONE_REQUIRED') : undefined}
          />
          {needsAddress && (
            <Input
              label={t('store.ADDRESS')}
              value={address}
              onChangeText={setAddress}
              maxLength={300}
              multiline
              error={submitted && addressMissing ? t('store.ADDRESS_REQUIRED') : undefined}
            />
          )}
          <Input label={t('store.NOTES_OPTIONAL')} value={notes} onChangeText={setNotes} maxLength={500} multiline />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('store.PAYMENT_METHOD')}</Text>
        {!methods.length ? (
          <Text style={[styles.notice, { color: theme.colors.textSecondary }]}>{t('store.NO_PAYMENT_METHOD')}</Text>
        ) : (
          methods.map((method) => {
            if (method === StorePaymentMethod.Points) {
              const balance = `${t('store.POINTS_BALANCE')} ${formatAmount(me?.pointsBalance ?? 0)}`;
              return option(
                'points',
                paymentMethod === method,
                paymentLabel(method),
                () => setPaymentMethod(method),
                pointsShort,
                pointsShort ? `${balance} · ${t('store.POINTS_SHORT')}` : `${balance} · ${t('store.POINTS_DEDUCT', { amount: formatAmount(total) })}`
              );
            }
            if (method === StorePaymentMethod.CashOnDelivery) {
              return option('cash', paymentMethod === method, paymentLabel(method), () => setPaymentMethod(method), false, t('store.CASH_HINT'));
            }
            return option('transfer', paymentMethod === method, paymentLabel(method), () => setPaymentMethod(method), false, t('store.TRANSFER.HINT'));
          })
        )}

        {pointsShort && status.acceptPoints && !REQUEST_ONLY && isOn('Wallet') && (
          <Button title={t('store.ADD_POINTS')} variant="secondary" size="small" onPress={() => navigation.navigate('Wallet')} />
        )}

        {paymentMethod === StorePaymentMethod.Transfer && (
          <View style={[styles.transferCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.optionText, { color: theme.colors.text }]}>{t('store.TRANSFER.CHOOSE_CHANNEL')}</Text>
            <View style={styles.channels}>
              {channels.map((value) => {
                const selected = channel === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[styles.channel, { backgroundColor: selected ? theme.colors.text : theme.colors.background }]}
                    onPress={() => setChannel(value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.channelText, { color: selected ? theme.colors.background : theme.colors.text }]} numberOfLines={1}>
                      {t(CHANNEL_KEY[value])}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {(me?.transferAccounts ?? []).filter((account) => account.method === channel).map(renderAccount)}
            <View style={styles.payField}>
              <Text style={[styles.hint, { color: theme.colors.textMuted }]}>{t('store.TRANSFER.AMOUNT')}</Text>
              <Text selectable style={[styles.payValue, { color: theme.colors.text }]}>
                {formatPrice(total, currency, locale)}
              </Text>
            </View>
            <Text style={[styles.optionText, { color: theme.colors.text }]}>{t('store.TRANSFER.RECEIPT')}</Text>
            <TouchableOpacity
              style={[styles.receiptBox, { borderColor: submitted && !receipt ? theme.colors.danger : theme.colors.inputBorder, backgroundColor: theme.colors.background }]}
              onPress={pickReceipt}
              accessibilityRole="button"
              accessibilityLabel={receipt ? t('store.TRANSFER.REPLACE') : t('store.TRANSFER.UPLOAD')}
            >
              {receipt ? (
                <Image source={{ uri: receipt.uri }} style={styles.fill} resizeMode="contain" />
              ) : (
                <View style={styles.receiptEmpty}>
                  <Ionicons name="cloud-upload-outline" size={28} color={theme.colors.primary} />
                  <Text style={[styles.optionText, { color: theme.colors.text }]}>{t('store.TRANSFER.UPLOAD')}</Text>
                </View>
              )}
            </TouchableOpacity>
            {receipt ? (
              <Button title={t('store.TRANSFER.REPLACE')} variant="secondary" size="small" onPress={pickReceipt} />
            ) : null}
            <Text style={[styles.hint, { color: theme.colors.textMuted }]}>{t('store.TRANSFER.RECEIPT_RULES')}</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading && !status) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScreenHeader title={t('store.CART')} onBack={() => navigation.goBack()} />
        <Spinner />
      </View>
    );
  }

  if (!lines.length) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScreenHeader title={t('store.CART')} onBack={() => navigation.goBack()} />
        <EmptyState
          icon={<Ionicons name="cart-outline" size={48} color={theme.colors.textMuted} />}
          title={t('store.CART_EMPTY')}
          actionLabel={status?.available ? t('store.BROWSE') : undefined}
          onAction={status?.available ? () => navigation.navigate('StoreShop') : undefined}
        />
      </View>
    );
  }

  const submitTitle = paymentMethod === StorePaymentMethod.Transfer ? t('store.TRANSFER.SUBMIT') : t('store.PLACE_ORDER');

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title={t('store.CART')} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior="padding" style={styles.container}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {lines.map(renderLine)}
          {renderCheckout()}
        </ScrollView>
        <View style={[styles.footer, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border, paddingBottom: tabBarSpace + spacing.sm }]}>
          <View style={styles.totalRow}>
            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>{t('store.TOTAL')}</Text>
            <Text style={[styles.total, { color: theme.colors.text }]}>{formatPrice(total, currency, locale)}</Text>
          </View>
          {status?.available && (
            <Button title={submitTitle} onPress={place} loading={placing} disabled={!canSubmit} fullWidth />
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fill: { width: '100%', height: '100%' },
  line: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1 },
  lineImage: { width: 84, height: 84, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 4 },
  lineBody: { flex: 1, gap: spacing.xs },
  lineTop: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  lineName: { flex: 1, fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  linePrice: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold' },
  listPrice: { fontSize: fontSize.sm, fontFamily: 'Cairo_400Regular', textDecorationLine: 'line-through' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  quantity: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', minWidth: 24, textAlign: 'center', lineHeight: 24, includeFontPadding: false, textAlignVertical: 'center' },
  disabled: { opacity: 0.45 },
  section: { gap: spacing.md, marginTop: spacing.md },
  sectionTitle: { fontSize: fontSize.lg, fontFamily: 'Cairo_700Bold', textAlign: 'left' },
  formBlock: { marginTop: spacing.sm },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1.5 },
  optionText: { fontSize: fontSize.base, fontFamily: 'Cairo_600SemiBold', textAlign: 'left', lineHeight: 24, includeFontPadding: false, textAlignVertical: 'center' },
  hint: { fontSize: fontSize.sm, fontFamily: 'Cairo_400Regular', textAlign: 'left' },
  notice: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold', textAlign: 'left', marginTop: spacing.md },
  transferCard: { gap: spacing.md, padding: spacing.lg, borderRadius: borderRadius.lg, borderWidth: 1 },
  channels: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  channel: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  channelText: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold' },
  payField: { gap: 2 },
  payValue: { fontSize: fontSize.lg, fontFamily: 'Cairo_700Bold', textAlign: 'left' },
  bankBlock: { gap: spacing.sm, borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md },
  receiptBox: { height: 180, borderRadius: borderRadius.lg, borderWidth: 1.5, borderStyle: 'dashed', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  receiptEmpty: { alignItems: 'center', gap: spacing.sm },
  footer: { borderTopWidth: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  total: { fontSize: fontSize.xl, fontFamily: 'Cairo_700Bold' },
});

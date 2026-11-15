import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useAuth } from '../../hooks/useAuth';
import { useDisplayFormat, isolate } from '../../hooks/useDisplayFormat';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Spinner } from '../../components/ui/Spinner';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize, typography } from '../../theme/typography';
import { formatAmount, getCurrencySymbol } from '../../utils/price';
import { parseServerDate } from '../../utils/dateLocale';
import { getFullImageUrl } from '../../utils/imageUrl';
import { sheetFrame } from '../../utils/responsive';
import { useTabBarSpace } from '../../navigation/tabBar';
import {
  storeApi,
  StoreDeliveryMethod,
  StoreOrderActor,
  StoreOrderStatus,
  StorePaymentMethod,
  type StoreOrder,
} from '../../services/api/store.api';
import type { ProfileStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'StoreOrderDetail'>;
type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info';
type ReasonAction = 'cancel' | 'reject';

const REASON_MAX = 300;
const TRANSFER_WALLET = 1;
const TRANSFER_INSTAPAY = 2;
const TRANSFER_BANK = 3;

export function orderStatusKey(order: Pick<StoreOrder, 'status' | 'awaitingReview'>): string {
  return order.awaitingReview ? 'store.STATUS.AwaitingReview' : `store.STATUS.${StoreOrderStatus[order.status]}`;
}

export function orderStatusVariant(order: Pick<StoreOrder, 'status' | 'awaitingReview'>): BadgeVariant {
  if (order.awaitingReview) return 'info';
  switch (order.status) {
    case StoreOrderStatus.Pending:
      return 'warning';
    case StoreOrderStatus.Confirmed:
      return 'info';
    case StoreOrderStatus.Delivered:
      return 'success';
    default:
      return 'danger';
  }
}

export function paymentKey(method: StorePaymentMethod): string {
  return `store.PAYMENT.${StorePaymentMethod[method]}`;
}

export function useStoreMoney() {
  const { locale } = useRTL();
  const lang = locale.startsWith('ar') ? 'ar' : 'en';
  return useCallback(
    (amount: number, currency: string | null | undefined) => `${isolate(formatAmount(amount))} ${getCurrencySymbol(currency, lang)}`,
    [lang],
  );
}

export function useStoreDate() {
  const { date } = useDisplayFormat();
  return useCallback(
    (value: string) => date(parseServerDate(value), { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
    [date],
  );
}

function transferChannelKey(channel: number | null): string {
  switch (channel) {
    case TRANSFER_WALLET:
      return 'store.TRANSFER.CHANNEL.Wallet';
    case TRANSFER_INSTAPAY:
      return 'store.TRANSFER.CHANNEL.Instapay';
    case TRANSFER_BANK:
      return 'store.TRANSFER.CHANNEL.Bank';
    default:
      return 'store.PAYMENT.Transfer';
  }
}

function studentHintKey(order: StoreOrder): string {
  if (order.awaitingReview) return 'store.HINT.AwaitingReview';
  if (order.status === StoreOrderStatus.Cancelled) {
    if (order.paymentMethod === StorePaymentMethod.Transfer && order.cancelledBy === StoreOrderActor.Staff && order.cancelReason && !order.confirmedAt) {
      return 'store.HINT.TransferRejected';
    }
    if (order.cancelledBy === StoreOrderActor.System) return 'store.HINT.Expired';
    return order.paymentMethod === StorePaymentMethod.Points ? 'store.HINT.CancelledRefunded' : 'store.HINT.Cancelled';
  }
  if (order.status === StoreOrderStatus.Delivered) return 'store.HINT.Delivered';
  if (order.paymentMethod === StorePaymentMethod.CashOnDelivery) {
    return order.status === StoreOrderStatus.Confirmed ? 'store.HINT.ConfirmedCash' : 'store.HINT.PendingCash';
  }
  return order.status === StoreOrderStatus.Confirmed ? 'store.HINT.ConfirmedPaid' : 'store.HINT.PendingPaid';
}

function canMoveTo(order: StoreOrder, status: StoreOrderStatus): boolean {
  if (order.awaitingReview) return false;
  if (status === StoreOrderStatus.Confirmed) return order.status === StoreOrderStatus.Pending;
  return order.status === StoreOrderStatus.Pending || order.status === StoreOrderStatus.Confirmed;
}

export default function StoreOrderDetailScreen({ navigation, route }: Props) {
  const { orderId, mine } = route.params;
  const { theme } = useTheme();
  const { t, locale } = useRTL();
  const { canModule } = useAuth();
  const money = useStoreMoney();
  const formatDate = useStoreDate();
  const tabBarSpace = useTabBarSpace();
  const canEdit = !mine && canModule('Store', 'edit');

  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [reasonAction, setReasonAction] = useState<ReasonAction | null>(null);
  const [reason, setReason] = useState('');
  const [reasonTouched, setReasonTouched] = useState(false);

  const load = useCallback(async () => {
    try {
      const fresh = mine ? await storeApi.myOrder(orderId) : await storeApi.order(orderId);
      setOrder(fresh);
      setError(null);
    } catch (err: any) {
      setError(err?.userMessage || t('store.LOAD_FAILED'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mine, orderId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (request: () => Promise<StoreOrder>, message: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await request();
      setOrder(updated);
      setReasonAction(null);
      Alert.alert(t('common.success'), t(message));
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('store.LOAD_FAILED'));
      load();
    } finally {
      setBusy(false);
    }
  };

  const confirmStudentCancel = () => {
    if (!order) return;
    Alert.alert(t('store.ORDERS.CANCEL'), t('store.ORDERS.MY_CANCEL_CONFIRM'), [
      { text: t('store.ORDERS.KEEP'), style: 'cancel' },
      { text: t('store.ORDERS.CANCEL_YES'), style: 'destructive', onPress: () => run(() => storeApi.cancelMyOrder(order.id), 'store.ORDERS.CANCELLED') },
    ]);
  };

  const openReason = (action: ReasonAction) => {
    setReason('');
    setReasonTouched(false);
    setReasonAction(action);
  };

  const trimmedReason = reason.trim();
  const reasonInvalid = trimmedReason.length > REASON_MAX || (reasonAction === 'reject' && !trimmedReason);

  const submitReason = () => {
    if (!order || !reasonAction) return;
    setReasonTouched(true);
    if (reasonInvalid) return;
    if (reasonAction === 'reject') {
      run(() => storeApi.rejectPayment(order.id, trimmedReason), 'store.ORDERS.PAYMENT_REJECTED');
    } else {
      run(() => storeApi.changeStatus(order.id, StoreOrderStatus.Cancelled, trimmedReason || null), 'store.ORDERS.STATUS_CHANGED');
    }
  };

  const viewReceipt = async () => {
    if (!order) return;
    if (receiptUrl) {
      setReceiptOpen(true);
      return;
    }
    setReceiptLoading(true);
    try {
      const { url } = mine ? await storeApi.myReceipt(order.id) : await storeApi.receipt(order.id);
      setReceiptUrl(url);
      setReceiptOpen(true);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('store.LOAD_FAILED'));
    } finally {
      setReceiptLoading(false);
    }
  };

  const phoneDigits = order ? order.phone.replace(/[^\d]/g, '') : '';
  const international = !!order && order.phone.trim().startsWith('+');
  const call = () => Linking.openURL(international ? `tel:+${phoneDigits}` : `tel:${phoneDigits}`).catch(() => undefined);
  const whatsapp = () => Linking.openURL(`https://wa.me/${phoneDigits}`).catch(() => undefined);

  const card = [styles.card, { backgroundColor: theme.colors.card }];
  const muted = { color: theme.colors.textMuted };
  const text = { color: theme.colors.text };

  const field = (label: string, value: React.ReactNode, extra?: React.ReactNode) => (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, muted]}>{label}</Text>
      {typeof value === 'string' ? <Text style={[styles.fieldValue, text]}>{value}</Text> : value}
      {extra}
    </View>
  );

  const renderActions = (current: StoreOrder) => {
    if (mine) {
      if (current.status !== StoreOrderStatus.Pending) return null;
      return <Button title={t('store.ORDERS.CANCEL')} variant="secondary" onPress={confirmStudentCancel} loading={busy} fullWidth />;
    }
    if (!canEdit || !(current.awaitingReview || canMoveTo(current, StoreOrderStatus.Delivered))) return null;
    if (current.awaitingReview) {
      return (
        <View style={styles.actions}>
          <Button title={t('store.ORDERS.APPROVE_PAYMENT')} onPress={() => run(() => storeApi.approvePayment(current.id), 'store.ORDERS.PAYMENT_APPROVED')} loading={busy} fullWidth />
          <Button title={t('store.ORDERS.REJECT_PAYMENT')} variant="secondary" onPress={() => openReason('reject')} disabled={busy} fullWidth />
        </View>
      );
    }
    return (
      <View style={styles.actions}>
        <Button title={t('store.ORDERS.DELIVER')} onPress={() => run(() => storeApi.changeStatus(current.id, StoreOrderStatus.Delivered), 'store.ORDERS.STATUS_CHANGED')} loading={busy} fullWidth />
        {canMoveTo(current, StoreOrderStatus.Confirmed) ? (
          <Button title={t('store.ORDERS.CONFIRM')} variant="secondary" onPress={() => run(() => storeApi.changeStatus(current.id, StoreOrderStatus.Confirmed), 'store.ORDERS.STATUS_CHANGED')} disabled={busy} fullWidth />
        ) : null}
        <Button title={t('store.ORDERS.CANCEL')} variant="secondary" onPress={() => openReason('cancel')} disabled={busy} fullWidth />
      </View>
    );
  };

  const renderBody = () => {
    if (loading && !order) return <Spinner />;
    if (error && !order) return <ErrorRetry message={error} onRetry={() => { setLoading(true); load(); }} retryLabel={t('store.TRY_AGAIN')} />;
    if (!order) return null;

    const refunded = order.status === StoreOrderStatus.Cancelled && order.paymentMethod === StorePaymentMethod.Points;
    const timeline = [
      { key: 'store.TIMELINE.Placed', at: order.createdAt, actor: null as string | null },
      ...(order.confirmedAt
        ? [{ key: order.paymentMethod === StorePaymentMethod.Transfer ? 'store.TIMELINE.PaymentApproved' : 'store.TIMELINE.Confirmed', at: order.confirmedAt, actor: null }]
        : []),
      ...(order.deliveredAt ? [{ key: 'store.TIMELINE.Delivered', at: order.deliveredAt, actor: null }] : []),
      ...(order.cancelledAt
        ? [{ key: 'store.TIMELINE.Cancelled', at: order.cancelledAt, actor: order.cancelledBy ? `store.ACTOR.${StoreOrderActor[order.cancelledBy]}` : null }]
        : []),
    ];

    return (
      <>
        <View style={card}>
          <View style={styles.headRow}>
            <View style={styles.flex}>
              <Text style={[styles.title, text]}>{t('store.ORDER_NUMBER', { id: order.id })}</Text>
              <Text style={[styles.meta, muted]}>{formatDate(order.createdAt)}</Text>
            </View>
            <Badge text={t(orderStatusKey(order))} variant={orderStatusVariant(order)} />
          </View>
          {mine ? (
            <View style={[styles.hint, { backgroundColor: theme.colors.background }]}>
              <Text style={[styles.meta, text]}>
                {t(studentHintKey(order), { total: isolate(formatAmount(order.total)), currency: getCurrencySymbol(order.currencyCode, locale.startsWith('ar') ? 'ar' : 'en') })}
              </Text>
            </View>
          ) : null}
          {order.status === StoreOrderStatus.Cancelled && order.cancelReason ? (
            <View style={[styles.hint, { backgroundColor: theme.colors.background }]}>
              <Text style={[styles.fieldLabel, muted]}>{t('store.CANCEL_REASON')}</Text>
              <Text style={[styles.meta, text]}>{order.cancelReason}</Text>
            </View>
          ) : null}
        </View>

        <View style={card}>
          {order.items.map((item, index) => (
            <View key={`${item.productId ?? 'x'}-${index}`} style={[styles.item, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.divider }]}>
              <View style={[styles.thumb, { backgroundColor: theme.colors.background }]}>
                {item.imageUrl ? (
                  <Image source={{ uri: getFullImageUrl(item.imageUrl) }} style={styles.thumbImage} resizeMode="contain" />
                ) : (
                  <Ionicons name="cube-outline" size={22} color={theme.colors.textMuted} />
                )}
              </View>
              <View style={styles.flex}>
                <Text style={[styles.itemName, text]}>{item.productName}</Text>
                <Text style={[styles.meta, muted]}>{isolate(`${item.quantity} × ${formatAmount(item.unitPrice)}`)}</Text>
              </View>
              <Text style={[styles.itemTotal, text]}>{money(item.quantity * item.unitPrice, order.currencyCode)}</Text>
            </View>
          ))}
          <View style={[styles.totalRow, { borderTopColor: theme.colors.divider }]}>
            <Text style={[styles.totalLabel, text]}>{t('store.TOTAL')}</Text>
            <Text style={[styles.totalLabel, text]}>{money(order.total, order.currencyCode)}</Text>
          </View>
        </View>

        <View style={card}>
          {!mine
            ? field(
                t('store.STUDENT'),
                order.studentName,
                order.studentCode ? <Text style={[styles.meta, muted]}>{isolate(order.studentCode)}</Text> : null,
              )
            : null}
          {field(
            t('store.PHONE'),
            isolate(order.phone),
            !mine ? (
              <View style={styles.contactRow}>
                <TouchableOpacity style={[styles.contact, { backgroundColor: theme.colors.background }]} onPress={call} accessibilityRole="button">
                  <Ionicons name="call-outline" size={18} color={theme.colors.primary} />
                  <Text style={[styles.contactText, text]}>{t('store.CALL')}</Text>
                </TouchableOpacity>
                {international ? (
                  <TouchableOpacity style={[styles.contact, { backgroundColor: theme.colors.background }]} onPress={whatsapp} accessibilityRole="button">
                    <Ionicons name="logo-whatsapp" size={18} color={theme.colors.success} />
                    <Text style={[styles.contactText, text]}>{t('store.WHATSAPP')}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null,
          )}
          {field(
            t('store.PAYMENT_METHOD'),
            order.paymentMethod === StorePaymentMethod.Transfer && order.transferChannel
              ? `${t(paymentKey(order.paymentMethod))} (${t(transferChannelKey(order.transferChannel))})`
              : t(paymentKey(order.paymentMethod)),
            <View style={styles.badgeRow}>
              {refunded ? (
                <Badge text={t('store.REFUNDED')} variant="info" />
              ) : (
                <Badge text={t(order.isPaid ? 'store.PAID' : 'store.NOT_PAID')} variant={order.isPaid ? 'success' : 'warning'} />
              )}
            </View>,
          )}
          {field(
            t('store.DELIVERY'),
            t(order.deliveryMethod === StoreDeliveryMethod.Pickup ? 'store.PICKUP' : 'store.DELIVERY_TO_ADDRESS'),
            order.address ? <Text style={[styles.meta, text]}>{order.address}</Text> : null,
          )}
          {order.notes ? field(t('store.NOTES'), order.notes) : null}
          {order.paymentMethod === StorePaymentMethod.Transfer
            ? field(
                t('store.TRANSFER.RECEIPT'),
                order.hasReceipt ? (
                  <TouchableOpacity
                    style={[styles.contact, styles.receiptButton, { backgroundColor: theme.colors.background }]}
                    onPress={viewReceipt}
                    disabled={receiptLoading}
                    accessibilityRole="button"
                  >
                    {receiptLoading ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Ionicons name="receipt-outline" size={18} color={theme.colors.primary} />}
                    <Text style={[styles.contactText, text]}>{t('store.TRANSFER.VIEW_RECEIPT')}</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.meta, muted]}>{t('store.TRANSFER.RECEIPT_GONE')}</Text>
                ),
              )
            : null}
        </View>

        <View style={card}>
          <Text style={[styles.cardTitle, text]}>{t('store.TIMELINE.TITLE')}</Text>
          {timeline.map((step) => (
            <View key={step.key} style={styles.step}>
              <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.textMuted} />
              <Text style={[styles.stepLabel, text]}>
                {t(step.key)}
                {step.actor ? <Text style={muted}>{` · ${t(step.actor)}`}</Text> : null}
              </Text>
              <Text style={[styles.meta, muted]}>{formatDate(step.at)}</Text>
            </View>
          ))}
        </View>

        {renderActions(order)}
      </>
    );
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]} edges={['bottom', 'left', 'right']}>
      <ScreenHeader title={t('store.ORDERS.DETAILS')} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarSpace + spacing.lg }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.primary} />}
      >
        {renderBody()}
      </ScrollView>

      <Modal visible={receiptOpen} transparent animationType="fade" onRequestClose={() => setReceiptOpen(false)}>
        <View style={styles.viewer}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setReceiptOpen(false)} accessibilityRole="button" accessibilityLabel={t('common.close')}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {receiptUrl ? <Image source={{ uri: getFullImageUrl(receiptUrl) }} style={styles.viewerImage} resizeMode="contain" accessibilityLabel={t('store.TRANSFER.RECEIPT')} /> : null}
          {receiptUrl ? (
            <TouchableOpacity onPress={() => Linking.openURL(getFullImageUrl(receiptUrl) ?? receiptUrl).catch(() => undefined)} accessibilityRole="link">
              <Text style={styles.viewerLink}>{t('store.TRANSFER.OPEN_RECEIPT')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </Modal>

      <Modal visible={reasonAction !== null} transparent animationType="slide" onRequestClose={() => !busy && setReasonAction(null)}>
        <KeyboardAvoidingView behavior="padding" style={styles.flex}>
          <Pressable style={styles.backdrop} onPress={() => !busy && setReasonAction(null)}>
            <Pressable style={[styles.sheet, { backgroundColor: theme.colors.card }]} onPress={() => undefined}>
              <Text style={[styles.sheetTitle, text]}>
                {t(reasonAction === 'reject' ? 'store.ORDERS.REJECT_REASON' : 'store.ORDERS.CANCEL_REASON_OPTIONAL')}
              </Text>
              <TextInput
                style={[
                  styles.reasonInput,
                  {
                    borderColor: reasonTouched && reasonInvalid ? theme.colors.danger : theme.colors.inputBorder,
                    backgroundColor: theme.colors.inputBackground,
                    color: theme.colors.inputText,
                  },
                ]}
                value={reason}
                onChangeText={setReason}
                onBlur={() => setReasonTouched(true)}
                multiline
                maxLength={REASON_MAX}
                textAlignVertical="top"
                accessibilityLabel={t(reasonAction === 'reject' ? 'store.ORDERS.REJECT_REASON' : 'store.ORDERS.CANCEL_REASON_OPTIONAL')}
              />
              {reasonTouched && reasonInvalid ? <Text style={[styles.meta, { color: theme.colors.danger }]}>{t('store.ORDERS.REASON_REQUIRED')}</Text> : null}
              <Text style={[styles.meta, muted]}>{t('store.ORDERS.REASON_VISIBLE')}</Text>
              <View style={styles.actions}>
                <Button
                  title={t(reasonAction === 'reject' ? 'store.ORDERS.REJECT_YES' : 'store.ORDERS.CANCEL_YES')}
                  variant="danger"
                  onPress={submitReason}
                  loading={busy}
                  fullWidth
                />
                <Button title={t('store.ORDERS.KEEP')} variant="secondary" onPress={() => setReasonAction(null)} disabled={busy} fullWidth />
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  card: { borderRadius: borderRadius.xl, padding: spacing.lg, gap: spacing.sm },
  cardTitle: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', textAlign: 'left' },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  title: { fontSize: fontSize.lg, fontFamily: 'Cairo_700Bold', textAlign: 'left' },
  meta: { fontSize: 14, fontFamily: 'Cairo_400Regular', textAlign: 'left' },
  hint: { borderRadius: borderRadius.lg, padding: spacing.md, gap: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  thumb: { width: 52, height: 52, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
  itemName: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },
  itemTotal: { fontSize: 14, fontFamily: 'Cairo_700Bold' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  totalLabel: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold' },
  field: { gap: 2, paddingVertical: spacing.xs },
  fieldLabel: { fontSize: 14, fontFamily: 'Cairo_500Medium', textAlign: 'left' },
  fieldValue: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },
  badgeRow: { flexDirection: 'row', marginTop: spacing.xs },
  contactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  contact: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.lg },
  receiptButton: { alignSelf: 'flex-start', marginTop: spacing.xs },
  contactText: { fontSize: 14, fontFamily: 'Cairo_600SemiBold' },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepLabel: { flex: 1, fontSize: 14, fontFamily: 'Cairo_500Medium', textAlign: 'left' },
  actions: { gap: spacing.sm },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  viewerClose: { position: 'absolute', top: spacing['3xl'], right: spacing.lg, padding: spacing.sm, zIndex: 1 },
  viewerImage: { width: '100%', height: '75%' },
  viewerLink: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Cairo_600SemiBold', textDecorationLine: 'underline' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { ...sheetFrame, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, gap: spacing.sm },
  sheetTitle: { ...typography.h3, textAlign: 'center' },
  reasonInput: { minHeight: 96, borderWidth: 1, borderRadius: borderRadius.lg, padding: spacing.md, fontSize: fontSize.base, fontFamily: 'Cairo_400Regular' },
});

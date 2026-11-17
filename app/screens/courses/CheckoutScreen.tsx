import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { useRTL } from '../../i18n/RTLProvider';
import { useSound } from '../../hooks/useSound';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize, typography } from '../../theme/typography';
import { reservationsApi } from '../../services/api/reservations.api';
import { getFullImageUrl } from '../../utils/imageUrl';
import { CoursePrice } from '../../components/course/CoursePrice';
import { WalletPayCard } from '../../components/wallet/WalletPayCard';
import { REQUEST_ONLY } from '../../config/storePolicy';
import type { CheckoutParams } from '../../types/navigation.types';
import {
  PAYMENT_METHOD_VODAFONE,
  PAYMENT_METHOD_INSTAPAY,
  PAYMENT_METHOD_BANK,
  DEFAULT_WALLET_PROVIDER,
  type PaymentMethod,
  type ReservationProofImage,
} from '../../types/reservation.types';

const METHOD_ORDER = [PAYMENT_METHOD_VODAFONE, PAYMENT_METHOD_INSTAPAY, PAYMENT_METHOD_BANK];
const METHOD_LABEL: Record<number, string> = {
  [PAYMENT_METHOD_VODAFONE]: 'checkout.vodafoneCash',
  [PAYMENT_METHOD_INSTAPAY]: 'checkout.instapay',
  [PAYMENT_METHOD_BANK]: 'checkout.bankTransfer',
};

import { BackButton } from '../../components/ui/BackButton';
type Props = {
  navigation: NativeStackScreenProps<any, any>['navigation'];
  route: { params: CheckoutParams };
};

export default function CheckoutScreen({ navigation, route }: Props) {
  const { courseId, title, price, discountPrice, currencyCode, image, upgrade } = route.params;
  const { theme } = useTheme();
  const { user } = useAuth();
  const { t, isRTL } = useRTL();
  const { play } = useSound();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [proof, setProof] = useState<ReservationProofImage | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const active = methods.filter((m) => m.isActive !== false);
  const availableMethods = METHOD_ORDER.filter((value) => active.some((m) => m.method === value));
  const hasMethods = availableMethods.length > 0;
  const joinRequestOnly = REQUEST_ONLY || !hasMethods;

  useEffect(() => { loadMethods(); }, []);

  const loadMethods = async () => {
    // iOS: enrollment is arranged by the academy outside the app (App Store
    // rules do not allow collecting external payments for in-app content), so
    // the screen is a plain "request to join" form with no payment details.
    if (REQUEST_ONLY) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setLoading(true);
      const data = await reservationsApi.getPaymentMethods();
      setMethods(data);
      setSelectedMethod(METHOD_ORDER.find((value) => data.some((m) => m.method === value && m.isActive !== false)) ?? null);
    } catch (err: any) {
      setError(err?.userMessage || t('checkout.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const pickProof = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const name = asset.fileName || `reservation-${Date.now()}.jpg`;
    const type = asset.mimeType || 'image/jpeg';
    setProof({ uri: asset.uri, name, type });
  };

  const handleSubmit = async () => {
    if (!user?.studentId) {
      Alert.alert(t('common.error'), t('courses.missingStudentId'));
      return;
    }
    if (!joinRequestOnly && !selectedMethod) {
      Alert.alert(t('common.error'), t('checkout.selectMethodFirst'));
      return;
    }
    if (!joinRequestOnly && !proof) {
      Alert.alert(t('common.error'), t('checkout.proofRequired'));
      return;
    }
    setSubmitting(true);
    try {
      await reservationsApi.create({
        studentId: user.studentId,
        courseId,
        studentMessage: message.trim(),
        paymentMethod: joinRequestOnly ? undefined : selectedMethod ?? undefined,
        proofImage: joinRequestOnly ? undefined : proof ?? undefined,
      });
      play('success');
      Alert.alert(t('common.success'), t(joinRequestOnly ? 'checkout.requestSubmitted' : 'checkout.submitted'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('checkout.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const coverUrl = getFullImageUrl(image);

  const renderMethodTab = (methodValue: number) => {
    const selected = selectedMethod === methodValue;
    return (
      <TouchableOpacity
        key={methodValue}
        style={[
          styles.methodTab,
          { backgroundColor: selected ? theme.colors.text : theme.colors.card },
        ]}
        onPress={() => { setSelectedMethod(methodValue); }}
        activeOpacity={0.75}
      >
        <Text style={[styles.methodTabText, { color: selected ? theme.colors.background : theme.colors.text }]} numberOfLines={1}>
          {t(METHOD_LABEL[methodValue])}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderField = (key: string, label: string, value?: string | null, large = false) =>
    value ? (
      <View key={key} style={styles.payToRow}>
        <Text style={[styles.payToLabel, { color: theme.colors.textMuted }]}>{label}</Text>
        <Text selectable style={[large ? styles.payToValue : styles.payToDetail, { color: theme.colors.text }]}>{value}</Text>
      </View>
    ) : null;

  const renderPayTo = () =>
    active
      .filter((m) => m.method === selectedMethod)
      .map((m) => {
        if (m.method === PAYMENT_METHOD_VODAFONE) return renderField(`${m.id}`, m.bankName || DEFAULT_WALLET_PROVIDER, m.phoneNumber, true);
        if (m.method === PAYMENT_METHOD_INSTAPAY) return renderField(`${m.id}`, t('checkout.instapayAddress'), m.accountNumber, true);
        return (
          <View key={m.id} style={[styles.bankBlock, { borderColor: theme.colors.border }]}>
            {renderField('bank', t('checkout.bankName'), m.bankName)}
            {renderField('holder', t('checkout.accountHolder'), m.accountHolderName)}
            {renderField('account', t('checkout.accountNumber'), m.accountNumber, true)}
            {renderField('swift', t('checkout.swiftCode'), m.swiftCode)}
          </View>
        );
      });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: theme.colors.divider }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {t(joinRequestOnly ? 'checkout.requestTitle' : 'checkout.title')}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <Spinner />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + 120 }}>
          {error && <ErrorBanner message={error} />}

          <View style={[styles.summaryCard, { backgroundColor: theme.colors.card }]}>
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={styles.summaryCover} resizeMode="cover" />
            ) : (
              <View style={[styles.summaryCover, { backgroundColor: theme.colors.primary + '22', justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="book" size={28} color={theme.colors.primary} />
              </View>
            )}
            <View style={styles.summaryInfo}>
              <Text style={[styles.summaryTitle, { color: theme.colors.text }]} numberOfLines={2}>
                {title || t('courses.untitled')}
              </Text>
              <CoursePrice
                price={price}
                discountPrice={discountPrice}
                currencyCode={currencyCode}
                size="sm"
                style={styles.priceRow}
              />
            </View>
          </View>

          {REQUEST_ONLY ? (
            <View style={[styles.noticeCard, { backgroundColor: theme.colors.card }]}>
              <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.noticeText, { color: theme.colors.textSecondary }]}>{t('checkout.requestNotice')}</Text>
            </View>
          ) : (
          <>
          {upgrade && (
            <View style={[styles.noticeCard, { backgroundColor: theme.colors.card }]}>
              <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.noticeText, { color: theme.colors.textSecondary }]}>{t('courses.parts.upgradeNote')}</Text>
            </View>
          )}
          <WalletPayCard
            kind="course"
            targetId={courseId}
            price={Number(discountPrice && discountPrice > 0 ? discountPrice : price ?? 0)}
            currencyCode={currencyCode}
            onPaid={() =>
              Alert.alert(t('common.success'), t('wallet.coursePaid'), [
                { text: t('common.ok'), onPress: () => navigation.goBack() },
              ])
            }
            onError={(message) => Alert.alert(t('common.error'), message)}
          />
          {hasMethods && (
            <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>{t('checkout.paymentMethod')}</Text>
          )}

          {!hasMethods ? (
            <View style={[styles.noticeCard, { backgroundColor: theme.colors.card }]}>
              <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.noticeText, { color: theme.colors.textSecondary }]}>{t('checkout.requestNotice')}</Text>
            </View>
          ) : (
            <>
              <View style={styles.methodTabs}>
                {availableMethods.map(renderMethodTab)}
              </View>

              <View style={[styles.payToCard, { backgroundColor: theme.colors.card }]}>
                {renderPayTo()}
                <Text style={[styles.payHint, { color: theme.colors.textMuted }]}>{t('checkout.payHint')}</Text>
              </View>
            </>
          )}

          {hasMethods && (
          <>
          <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>{t('checkout.proofOfPayment')}</Text>
          <TouchableOpacity
            style={[styles.proofPicker, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
            onPress={pickProof}
            activeOpacity={0.8}
          >
            {proof ? (
              <Image source={{ uri: proof.uri }} style={styles.proofPreview} resizeMode="cover" />
            ) : (
              <View style={styles.proofEmpty}>
                <Ionicons name="cloud-upload-outline" size={28} color={theme.colors.primary} />
                <Text style={[styles.proofEmptyText, { color: theme.colors.textSecondary }]}>{t('checkout.uploadProof')}</Text>
              </View>
            )}
          </TouchableOpacity>
          {proof && (
            <TouchableOpacity onPress={pickProof} style={styles.changeProof}>
              <Text style={[styles.changeProofText, { color: theme.colors.primary }]}>{t('checkout.changeImage')}</Text>
            </TouchableOpacity>
          )}
          </>
          )}
          </>
          )}

          <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
            {t('checkout.message')} <Text style={{ color: theme.colors.textMuted }}>({t('checkout.optional')})</Text>
          </Text>
          <TextInput
            style={[styles.messageInput, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border, textAlign: isRTL ? 'right' : 'left' }]}
            placeholder={t('checkout.messagePlaceholder')}
            placeholderTextColor={theme.colors.inputPlaceholder}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={3}
          />
        </ScrollView>
      )}

      {!loading && (
        <View style={[styles.stickyBar, { backgroundColor: theme.colors.card, paddingBottom: insets.bottom + spacing.md, borderTopColor: theme.dark ? theme.colors.border : theme.colors.divider }]}>
          <Button
            title={t(joinRequestOnly ? 'checkout.sendRequest' : 'checkout.submitRequest')}
            onPress={handleSubmit}
            loading={submitting}
            fullWidth
            size="large"
            icon={<Ionicons name="checkmark-circle" size={20} color={theme.colors.onPrimary} />}
            style={{ borderRadius: 16 }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { width: 22, height: 32, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { ...typography.screenTitle, flex: 1, marginHorizontal: spacing.md },

  summaryCard: {
    flexDirection: 'row',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  summaryCover: { width: 84, height: 84, borderRadius: borderRadius.lg },
  summaryInfo: { flex: 1, justifyContent: 'center' },
  summaryTitle: { fontSize: fontSize.base, fontFamily: 'Cairo_600SemiBold', lineHeight: 23, textAlign: 'left' },
  priceRow: { marginTop: spacing.xs },

  sectionLabel: { ...typography.sectionTitle, marginBottom: spacing.md, marginTop: spacing.sm },

  methodTabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  methodTab: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodTabText: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },

  payToCard: { borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  payToRow: { marginBottom: spacing.sm },
  payToLabel: { fontSize: 14, fontFamily: 'Cairo_500Medium', marginBottom: 2, textAlign: 'left' },
  payToValue: { fontSize: fontSize.xl, fontFamily: 'Cairo_700Bold', letterSpacing: 1, textAlign: 'left' },
  payToDetail: { fontSize: fontSize.base, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },
  bankBlock: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: spacing.sm, marginBottom: spacing.sm },
  payHint: { fontSize: 14, fontFamily: 'Cairo_400Regular', marginTop: spacing.xs, textAlign: 'left' },

  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  noticeText: { flex: 1, fontSize: fontSize.sm, fontFamily: 'Cairo_400Regular', textAlign: 'left' },

  proofPicker: {
    height: 180,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  proofPreview: { width: '100%', height: '100%' },
  proofEmpty: { alignItems: 'center', gap: spacing.sm },
  proofEmptyText: { fontSize: fontSize.sm, fontFamily: 'Cairo_500Medium', textAlign: 'left' },
  changeProof: { alignSelf: 'center', paddingVertical: spacing.sm, marginBottom: spacing.sm },
  changeProofText: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },

  messageInput: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    minHeight: 90,
    textAlignVertical: 'top',
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_400Regular',
  },

  stickyBar: {
    position: 'absolute',
    bottom: 0,
    start: 0,
    end: 0,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    borderTopWidth: 1,
  },
});
